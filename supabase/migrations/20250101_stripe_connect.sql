-- Stripe Connect & Team Payout System
-- Migration: 20250101_001_stripe_connect.sql
--
-- This migration adds:
-- 1. Partners table with Stripe Connect fields
-- 2. Staff table extensions for Connect and payouts
-- 3. Staff payouts tracking
-- 4. Partner payouts tracking
-- 5. Company pool allocations
-- 6. QC time tracking
-- 7. Payout settings

-- ============================================================================
-- PARTNERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),

  -- Stripe Connect fields
  stripe_connect_id TEXT UNIQUE,
  stripe_connect_status TEXT DEFAULT 'not_started'
    CHECK (stripe_connect_status IN ('not_started', 'pending', 'active', 'rejected', 'restricted')),
  stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  stripe_onboarding_completed_at TIMESTAMPTZ,

  -- Payout configuration
  default_profit_percent DECIMAL(5, 2) DEFAULT 25.00,
  payout_schedule TEXT DEFAULT 'instant' CHECK (payout_schedule IN ('instant', 'daily', 'weekly')),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Partners can view their own record
DROP POLICY IF EXISTS "Partners can view own record" ON partners;
DROP POLICY IF EXISTS "Partners can view own record" ON partners;
CREATE POLICY "Partners can view own record" ON partners
  FOR SELECT USING (user_id = auth.uid());

-- Staff can view all partners
DROP POLICY IF EXISTS "Staff can view all partners" ON partners;
DROP POLICY IF EXISTS "Staff can view all partners" ON partners;
CREATE POLICY "Staff can view all partners" ON partners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.is_active = TRUE
    )
  );

-- Staff can update partners
DROP POLICY IF EXISTS "Staff can update partners" ON partners;
DROP POLICY IF EXISTS "Staff can update partners" ON partners;
CREATE POLICY "Staff can update partners" ON partners
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- ============================================================================
-- EXTEND STAFF TABLE
-- ============================================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_started';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'w2';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS default_payout_percent DECIMAL(5, 2) DEFAULT 40.00;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8, 2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;

-- Add constraints if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_stripe_connect_status_check'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT staff_stripe_connect_status_check
      CHECK (stripe_connect_status IN ('not_started', 'pending', 'active', 'rejected', 'restricted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_payout_type_check'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT staff_payout_type_check
      CHECK (payout_type IN ('w2', '1099', 'hourly'));
  END IF;
END $$;

-- ============================================================================
-- STAFF PAYOUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Role that earned this payout
  role TEXT NOT NULL CHECK (role IN ('photographer', 'videographer', 'editor', 'drone_operator')),

  -- Amounts
  order_total_cents INTEGER NOT NULL,
  payout_amount_cents INTEGER NOT NULL,
  payout_percent DECIMAL(5, 2) NOT NULL,

  -- Stripe transfer details
  stripe_transfer_id TEXT UNIQUE,
  stripe_destination_account TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  error_message TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE staff_payouts ENABLE ROW LEVEL SECURITY;

-- Staff can view their own payouts
DROP POLICY IF EXISTS "Staff can view own payouts" ON staff_payouts;
DROP POLICY IF EXISTS "Staff can view own payouts" ON staff_payouts;
CREATE POLICY "Staff can view own payouts" ON staff_payouts
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admin can view all payouts
DROP POLICY IF EXISTS "Admin can view all payouts" ON staff_payouts;
DROP POLICY IF EXISTS "Admin can view all payouts" ON staff_payouts;
CREATE POLICY "Admin can view all payouts" ON staff_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_payouts_staff_id ON staff_payouts(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_payouts_order_id ON staff_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_staff_payouts_status ON staff_payouts(status);
CREATE INDEX IF NOT EXISTS idx_staff_payouts_created_at ON staff_payouts(created_at DESC);

-- ============================================================================
-- PARTNER PAYOUTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,  -- The photographer who did the job

  -- Amounts
  order_total_cents INTEGER NOT NULL,
  payout_amount_cents INTEGER NOT NULL,
  payout_percent DECIMAL(5, 2) NOT NULL,

  -- Stripe transfer details
  stripe_transfer_id TEXT UNIQUE,
  stripe_destination_account TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  error_message TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Partners can view their own payouts
DROP POLICY IF EXISTS "Partners can view own payouts" ON partner_payouts;
DROP POLICY IF EXISTS "Partners can view own payouts" ON partner_payouts;
CREATE POLICY "Partners can view own payouts" ON partner_payouts
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners
      WHERE user_id = auth.uid()
    )
  );

-- Admin can view all partner payouts
DROP POLICY IF EXISTS "Admin can view all partner payouts" ON partner_payouts;
DROP POLICY IF EXISTS "Admin can view all partner payouts" ON partner_payouts;
CREATE POLICY "Admin can view all partner payouts" ON partner_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_order_id ON partner_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts(status);

-- ============================================================================
-- COMPANY POOL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Pool type
  pool_type TEXT NOT NULL CHECK (pool_type IN ('video_editor', 'qc_fund', 'operating')),

  -- Amounts
  amount_cents INTEGER NOT NULL,
  percent DECIMAL(5, 2) NOT NULL,

  -- Allocation tracking
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'paid')),
  allocated_to UUID REFERENCES staff(id),
  paid_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE company_pool ENABLE ROW LEVEL SECURITY;

-- Admin can view and manage company pool
DROP POLICY IF EXISTS "Admin can manage company pool" ON company_pool;
DROP POLICY IF EXISTS "Admin can manage company pool" ON company_pool;
CREATE POLICY "Admin can manage company pool" ON company_pool
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_pool_order_id ON company_pool(order_id);
CREATE INDEX IF NOT EXISTS idx_company_pool_type ON company_pool(pool_type);
CREATE INDEX IF NOT EXISTS idx_company_pool_status ON company_pool(status);

-- ============================================================================
-- TIME ENTRIES TABLE (QC Time Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Time tracking
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,  -- Calculated on clock_out
  break_minutes INTEGER DEFAULT 0,

  -- Pay calculation
  hourly_rate DECIMAL(8, 2) NOT NULL,  -- Snapshot of rate at time of entry
  total_pay_cents INTEGER,  -- Calculated: (duration - break) * rate

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'approved', 'paid')),

  -- Pay period association
  pay_period_id UUID,  -- Will reference pay_periods table

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Staff can view their own time entries
DROP POLICY IF EXISTS "Staff can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Staff can view own time entries" ON time_entries;
CREATE POLICY "Staff can view own time entries" ON time_entries
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Staff can create their own time entries
DROP POLICY IF EXISTS "Staff can create own time entries" ON time_entries;
DROP POLICY IF EXISTS "Staff can create own time entries" ON time_entries;
CREATE POLICY "Staff can create own time entries" ON time_entries
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM staff
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Staff can update their active time entries
DROP POLICY IF EXISTS "Staff can update own active time entries" ON time_entries;
DROP POLICY IF EXISTS "Staff can update own active time entries" ON time_entries;
CREATE POLICY "Staff can update own active time entries" ON time_entries
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND status = 'active'
  );

-- Admin can manage all time entries
DROP POLICY IF EXISTS "Admin can manage all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admin can manage all time entries" ON time_entries;
CREATE POLICY "Admin can manage all time entries" ON time_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_id ON time_entries(staff_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in DESC);

-- ============================================================================
-- PAY PERIODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),

  -- Totals (calculated when closed)
  total_hours DECIMAL(8, 2),
  total_pay_cents INTEGER,

  -- Payment tracking
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES staff(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no overlapping periods
  CONSTRAINT pay_periods_no_overlap UNIQUE (start_date, end_date)
);

-- Enable RLS
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

-- Staff can view pay periods
DROP POLICY IF EXISTS "Staff can view pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Staff can view pay periods" ON pay_periods;
CREATE POLICY "Staff can view pay periods" ON pay_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admin can manage pay periods
DROP POLICY IF EXISTS "Admin can manage pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Admin can manage pay periods" ON pay_periods;
CREATE POLICY "Admin can manage pay periods" ON pay_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Add foreign key to time_entries
ALTER TABLE time_entries
  ADD CONSTRAINT fk_time_entries_pay_period
  FOREIGN KEY (pay_period_id) REFERENCES pay_periods(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_pay_periods_status ON pay_periods(status);
CREATE INDEX IF NOT EXISTS idx_pay_periods_dates ON pay_periods(start_date, end_date);

-- ============================================================================
-- PAYOUT SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES staff(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view payout settings
DROP POLICY IF EXISTS "Anyone can view payout settings" ON payout_settings;
DROP POLICY IF EXISTS "Anyone can view payout settings" ON payout_settings;
CREATE POLICY "Anyone can view payout settings" ON payout_settings
  FOR SELECT USING (true);

-- Admin can update payout settings
DROP POLICY IF EXISTS "Admin can update payout settings" ON payout_settings;
DROP POLICY IF EXISTS "Admin can update payout settings" ON payout_settings;
CREATE POLICY "Admin can update payout settings" ON payout_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND staff.role = 'admin'
    )
  );

-- Insert default settings
INSERT INTO payout_settings (key, value, description) VALUES
  ('photographer_default_percent', '"40"', 'Default payout percentage for photographers'),
  ('videographer_default_percent', '"20"', 'Default payout percentage for videographers'),
  ('partner_default_percent', '"25"', 'Default profit percentage for partners'),
  ('video_editor_pool_percent', '"5"', 'Percentage allocated to video editor pool'),
  ('qc_pool_percent', '"5"', 'Percentage allocated to QC pool'),
  ('operating_pool_percent', '"5"', 'Percentage allocated to operating expenses'),
  ('qc_hourly_rate', '"5.50"', 'Hourly rate for QC specialists'),
  ('auto_payout_enabled', '"true"', 'Whether automatic payouts are enabled'),
  ('payout_delay_seconds', '"0"', 'Delay before processing payouts (for manual review)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate time entry pay
CREATE OR REPLACE FUNCTION calculate_time_entry_pay()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    -- Calculate duration in minutes
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;

    -- Calculate total pay in cents: ((duration - breaks) / 60) * hourly_rate * 100
    NEW.total_pay_cents := ROUND(
      ((NEW.duration_minutes - COALESCE(NEW.break_minutes, 0)) / 60.0)
      * NEW.hourly_rate
      * 100
    );

    -- Update status to completed if still active
    IF NEW.status = 'active' THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for time entry pay calculation
DROP TRIGGER IF EXISTS trg_calculate_time_entry_pay ON time_entries;
CREATE TRIGGER trg_calculate_time_entry_pay
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_pay();

-- Function to auto clock-out at midnight
CREATE OR REPLACE FUNCTION auto_clock_out_midnight()
RETURNS void AS $$
BEGIN
  UPDATE time_entries
  SET
    clock_out = DATE_TRUNC('day', clock_in) + INTERVAL '23 hours 59 minutes 59 seconds',
    notes = COALESCE(notes, '') || ' [Auto clock-out at midnight]',
    status = 'completed'
  WHERE
    status = 'active'
    AND clock_in < DATE_TRUNC('day', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Staff earnings summary
CREATE OR REPLACE VIEW staff_earnings_summary AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.role,
  s.payout_type,
  s.default_payout_percent,
  COUNT(sp.id) AS total_payouts,
  SUM(CASE WHEN sp.status = 'completed' THEN sp.payout_amount_cents ELSE 0 END) AS total_earned_cents,
  SUM(CASE WHEN sp.status = 'pending' THEN sp.payout_amount_cents ELSE 0 END) AS pending_cents,
  SUM(CASE
    WHEN sp.status = 'completed'
    AND sp.created_at >= DATE_TRUNC('week', NOW())
    THEN sp.payout_amount_cents ELSE 0 END
  ) AS earned_this_week_cents,
  SUM(CASE
    WHEN sp.status = 'completed'
    AND sp.created_at >= DATE_TRUNC('month', NOW())
    THEN sp.payout_amount_cents ELSE 0 END
  ) AS earned_this_month_cents
FROM staff s
LEFT JOIN staff_payouts sp ON s.id = sp.staff_id
GROUP BY s.id, s.name, s.role, s.payout_type, s.default_payout_percent;

-- Partner earnings summary
CREATE OR REPLACE VIEW partner_earnings_summary AS
SELECT
  p.id AS partner_id,
  p.name AS partner_name,
  p.default_profit_percent,
  p.stripe_connect_status,
  p.stripe_payouts_enabled,
  COUNT(pp.id) AS total_payouts,
  SUM(CASE WHEN pp.status = 'completed' THEN pp.payout_amount_cents ELSE 0 END) AS total_earned_cents,
  SUM(CASE WHEN pp.status = 'pending' THEN pp.payout_amount_cents ELSE 0 END) AS pending_cents,
  SUM(CASE
    WHEN pp.status = 'completed'
    AND pp.created_at >= DATE_TRUNC('month', NOW())
    THEN pp.payout_amount_cents ELSE 0 END
  ) AS earned_this_month_cents
FROM partners p
LEFT JOIN partner_payouts pp ON p.id = pp.partner_id
GROUP BY p.id, p.name, p.default_profit_percent, p.stripe_connect_status, p.stripe_payouts_enabled;

-- Company pool summary
CREATE OR REPLACE VIEW company_pool_summary AS
SELECT
  pool_type,
  SUM(CASE WHEN status = 'available' THEN amount_cents ELSE 0 END) AS available_cents,
  SUM(CASE WHEN status = 'allocated' THEN amount_cents ELSE 0 END) AS allocated_cents,
  SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END) AS paid_cents,
  COUNT(*) AS total_entries
FROM company_pool
GROUP BY pool_type;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON staff_earnings_summary TO authenticated;
GRANT SELECT ON partner_earnings_summary TO authenticated;
GRANT SELECT ON company_pool_summary TO authenticated;
