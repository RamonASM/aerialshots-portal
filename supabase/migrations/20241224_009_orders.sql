-- Orders Schema for Booking Flow
-- Version: 1.0.0
-- Date: 2024-12-24

-- =====================
-- ORDERS (booking/payment tracking)
-- =====================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  listing_id UUID REFERENCES listings(id),

  -- Service details
  service_type TEXT NOT NULL CHECK (service_type IN ('listing', 'retainer')),
  package_key TEXT NOT NULL,
  package_name TEXT NOT NULL,
  sqft_tier TEXT, -- For listing orders: lt2000, 2001_3500, etc.
  services JSONB DEFAULT '[]', -- Array of selected add-on services

  -- Pricing
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Property info (for listing orders, before listing record exists)
  property_address TEXT,
  property_city TEXT,
  property_state TEXT DEFAULT 'FL',
  property_zip TEXT,
  property_sqft INTEGER,
  property_beds INTEGER,
  property_baths DECIMAL(3,1),

  -- Contact info
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Order created, awaiting payment
    'paid',         -- Payment successful
    'confirmed',    -- Booking confirmed by team
    'scheduled',    -- Photographer assigned, time confirmed
    'in_progress',  -- Shoot happening
    'completed',    -- Shoot done, media being processed
    'delivered',    -- All media delivered
    'cancelled',    -- Order cancelled
    'refunded'      -- Payment refunded
  )),

  -- Payment tracking
  payment_intent_id TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'refunded',
    'cancelled'
  )),
  paid_at TIMESTAMPTZ,

  -- Retainer-specific
  retainer_start_date DATE,
  retainer_months INTEGER,

  -- Notes
  special_instructions TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update trigger
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_orders_agent_id ON orders(agent_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_intent_id ON orders(payment_intent_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_scheduled_at ON orders(scheduled_at);

-- =====================
-- ORDER_STATUS_HISTORY (audit trail)
-- =====================
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID, -- staff or agent id
  changed_by_type TEXT CHECK (changed_by_type IN ('staff', 'agent', 'system', 'stripe')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- Function to track status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_track_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_change();

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Agents can view their own orders
CREATE POLICY "Agents can view own orders"
  ON orders FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Agents can create orders
CREATE POLICY "Agents can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Staff can view all orders
CREATE POLICY "Staff can view all orders"
  ON orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can update orders
CREATE POLICY "Staff can update orders"
  ON orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Order status history policies
CREATE POLICY "Users can view order history for their orders"
  ON order_status_history FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE agent_id IN (
      SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
    )
  ));

CREATE POLICY "Staff can view all order history"
  ON order_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));
