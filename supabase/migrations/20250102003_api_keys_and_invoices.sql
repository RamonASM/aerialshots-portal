-- Made idempotent: 2026-01-07
-- API Keys and Invoices Schema Gaps
-- Migration: 20250102_003_api_keys_and_invoices.sql
--
-- This migration:
-- 1. Adds missing columns to api_keys table (key_prefix, requests_this_month)
-- 2. Creates the invoices table for direct agent billing (separate from generated_invoices)

-- =====================================================
-- 1. Add missing columns to api_keys table
-- =====================================================

-- Add key_prefix column for displaying first 12 chars of the API key
-- Example: "lh_live_abcd" helps users identify their keys without revealing the full key
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix TEXT;

-- Add requests_this_month for tracking current month's usage
-- This is updated by the API middleware and reset monthly by cron
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS requests_this_month INTEGER DEFAULT 0;

-- Add index for efficient lookups by prefix (for admin views)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- Comment on new columns
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the API key for display purposes';
COMMENT ON COLUMN api_keys.requests_this_month IS 'Number of API requests this calendar month';

-- =====================================================
-- 2. Create invoices table
-- =====================================================

-- The invoices table stores direct agent billing records.
-- This is separate from generated_invoices which is tied to orders.
-- Use cases:
-- - Manual invoices created by staff
-- - Bulk billing for multiple services
-- - Custom line items not tied to specific orders

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice identification
  invoice_number TEXT NOT NULL UNIQUE,

  -- Agent relationship (the billable party)
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,

  -- Optional listing association (for service invoices)
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  listing_address TEXT, -- Denormalized for display/PDF generation

  -- Financial details (amounts in cents for precision)
  amount INTEGER NOT NULL CHECK (amount >= 0),

  -- Invoice status workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')
  ),

  -- Line items (flexible structure for various service combinations)
  line_items JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"description": "HDR Photography", "quantity": 1, "unit_price": 25000, "amount": 25000}]

  -- Payment terms
  due_date DATE NOT NULL,
  days_overdue INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN status = 'overdue' THEN GREATEST(0, CURRENT_DATE - due_date)
      WHEN status IN ('pending') AND CURRENT_DATE > due_date THEN CURRENT_DATE - due_date
      ELSE 0
    END
  ) STORED,

  -- Payment details
  paid_at TIMESTAMPTZ,
  payment_intent_id TEXT, -- Stripe payment intent ID
  payment_method TEXT,    -- card, bank_transfer, check, etc.

  -- Customization
  custom_notes TEXT,       -- Notes to appear on invoice
  brokerage_info JSONB,    -- Brokerage billing info for split invoicing
  -- Example: {"name": "ABC Realty", "address": "123 Main St", "license": "BK123456"}

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_agent_id ON invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_listing_id ON invoices(listing_id);

-- Compound index for common dashboard query (unpaid for agent)
CREATE INDEX IF NOT EXISTS idx_invoices_agent_unpaid
  ON invoices(agent_id, status)
  WHERE status IN ('pending', 'overdue');

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Staff can view all invoices
DROP POLICY IF EXISTS "Staff can view all invoices" ON invoices;
CREATE POLICY "Staff can view all invoices" ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
      AND staff.is_active = true
    )
  );

-- Staff can create invoices
DROP POLICY IF EXISTS "Staff can create invoices" ON invoices;
CREATE POLICY "Staff can create invoices" ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
      AND staff.is_active = true
    )
  );

-- Staff can update invoices
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
CREATE POLICY "Staff can update invoices" ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
      AND staff.is_active = true
    )
  );

-- Agents can view their own invoices
DROP POLICY IF EXISTS "Agents can view own invoices" ON invoices;
CREATE POLICY "Agents can view own invoices" ON invoices FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. Invoice number sequence
-- =====================================================

-- Create sequence for invoice numbers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public'
    AND sequencename = 'invoice_number_seq'
  ) THEN
    CREATE SEQUENCE invoice_number_seq START WITH 1001;
  END IF;
END $$;

-- Function to generate invoice numbers (ASM-YYYY-NNNN format)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ASM-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
         LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. Auto-update trigger for updated_at
-- =====================================================

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- =====================================================
-- 5. Auto-update status to overdue trigger
-- =====================================================

-- Function to update invoice status to overdue
CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
  -- If pending and past due date, mark as overdue
  IF NEW.status = 'pending' AND NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS invoices_check_overdue ON invoices;
CREATE TRIGGER invoices_check_overdue
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_invoice_overdue();

-- =====================================================
-- 6. Monthly reset function for API key usage
-- =====================================================

-- Function to reset monthly API usage counts (call from cron)
CREATE OR REPLACE FUNCTION reset_api_key_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE api_keys
  SET requests_this_month = 0
  WHERE requests_this_month > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on function
COMMENT ON FUNCTION reset_api_key_monthly_usage() IS
  'Resets all API key monthly request counts to 0. Call on 1st of each month.';

-- =====================================================
-- 7. Add comments
-- =====================================================

COMMENT ON TABLE invoices IS
  'Direct agent billing invoices. Separate from generated_invoices which is order-based.';

COMMENT ON COLUMN invoices.line_items IS
  'JSONB array of line items: [{description, quantity?, unit_price?, amount}]';

COMMENT ON COLUMN invoices.brokerage_info IS
  'JSONB with brokerage details for split billing: {name, address?, license?}';

COMMENT ON COLUMN invoices.days_overdue IS
  'Computed column: days past due_date when status is pending/overdue';
