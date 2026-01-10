-- =====================================================
-- Credits System Migration
-- Tier 4: Financial Enhancements
-- =====================================================

-- Add credit_balance column to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS credit_low_balance_threshold DECIMAL(10, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS low_balance_notification_sent_at TIMESTAMPTZ;

-- Create credit_packages table for predefined purchase options
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credit_amount DECIMAL(10, 2) NOT NULL,
  price_cents INTEGER NOT NULL, -- Store in cents for Stripe
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_transactions table for tracking all credit activity
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'adjustment', 'bonus', 'expiry')),
  amount DECIMAL(10, 2) NOT NULL, -- Positive for additions, negative for deductions
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT,

  -- Purchase-specific fields
  package_id UUID REFERENCES credit_packages(id),
  stripe_payment_intent_id TEXT,
  stripe_payment_method TEXT,

  -- Usage-specific fields
  order_id UUID,
  service_type TEXT,

  -- Staff adjustment fields
  adjusted_by UUID REFERENCES staff(id),
  adjustment_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_usage_rates table for service-to-credit mapping
CREATE TABLE IF NOT EXISTS credit_usage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  credits_required DECIMAL(10, 2) NOT NULL,
  category TEXT, -- e.g., 'photography', 'video', 'drone', 'staging'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create low_balance_notifications table
CREATE TABLE IF NOT EXISTS low_balance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  balance_at_notification DECIMAL(10, 2) NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'low_balance',
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_id ON credit_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_low_balance_notifications_agent_id ON low_balance_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_credit_balance ON agents(credit_balance);

-- Seed default credit packages
INSERT INTO credit_packages (name, description, credit_amount, price_cents, discount_percent, is_popular, sort_order)
VALUES
  ('Starter', 'Perfect for occasional orders', 100.00, 10000, 0, false, 1),
  ('Standard', 'Most popular for regular agents', 250.00, 22500, 10, true, 2),
  ('Pro', 'For high-volume professionals', 500.00, 42500, 15, false, 3),
  ('Enterprise', 'Best value for teams', 1000.00, 80000, 20, false, 4)
ON CONFLICT DO NOTHING;

-- Seed default credit usage rates based on typical real estate photography services
INSERT INTO credit_usage_rates (service_key, service_name, credits_required, category)
VALUES
  ('photos_25', 'Standard Photos (Up to 25)', 50.00, 'photography'),
  ('photos_50', 'Extended Photos (Up to 50)', 75.00, 'photography'),
  ('photos_unlimited', 'Unlimited Photos', 100.00, 'photography'),
  ('drone_photos', 'Aerial/Drone Photos', 35.00, 'drone'),
  ('drone_video', 'Aerial/Drone Video', 50.00, 'drone'),
  ('zillow_3d', 'Zillow 3D Home Tour', 45.00, 'virtual'),
  ('matterport', 'Matterport 3D Tour', 150.00, 'virtual'),
  ('floor_plan_2d', '2D Floor Plan', 35.00, 'floorplan'),
  ('floor_plan_3d', '3D Floor Plan', 50.00, 'floorplan'),
  ('listing_video', 'Listing Video (1-2 min)', 150.00, 'video'),
  ('signature_video', 'Signature Video (2-4 min)', 250.00, 'video'),
  ('virtual_staging_per_room', 'Virtual Staging (per room)', 25.00, 'staging'),
  ('virtual_twilight', 'Virtual Twilight Conversion', 20.00, 'enhancement'),
  ('hdr_enhancement', 'HDR Enhancement', 15.00, 'enhancement'),
  ('item_removal', 'Item Removal (per item)', 10.00, 'enhancement')
ON CONFLICT (service_key) DO NOTHING;

-- RLS Policies
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE low_balance_notifications ENABLE ROW LEVEL SECURITY;

-- Credit packages - public read for purchasing
DROP POLICY IF EXISTS "Anyone can view active credit packages" ON credit_packages;
DROP POLICY IF EXISTS "Anyone can view active credit packages" ON credit_packages;
CREATE POLICY "Anyone can view active credit packages" ON credit_packages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage credit packages" ON credit_packages;
DROP POLICY IF EXISTS "Staff can manage credit packages" ON credit_packages;
CREATE POLICY "Staff can manage credit packages" ON credit_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

-- Credit transactions - agents can view their own, staff can view all
DROP POLICY IF EXISTS "Agents can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Agents can view own credit transactions" ON credit_transactions;
CREATE POLICY "Agents can view own credit transactions" ON credit_transactions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Staff can manage credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Staff can manage credit transactions" ON credit_transactions;
CREATE POLICY "Staff can manage credit transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

-- Credit usage rates - public read
DROP POLICY IF EXISTS "Anyone can view credit usage rates" ON credit_usage_rates;
DROP POLICY IF EXISTS "Anyone can view credit usage rates" ON credit_usage_rates;
CREATE POLICY "Anyone can view credit usage rates" ON credit_usage_rates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage credit usage rates" ON credit_usage_rates;
DROP POLICY IF EXISTS "Staff can manage credit usage rates" ON credit_usage_rates;
CREATE POLICY "Staff can manage credit usage rates" ON credit_usage_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

-- Low balance notifications - agents can view their own
DROP POLICY IF EXISTS "Agents can view own notifications" ON low_balance_notifications;
DROP POLICY IF EXISTS "Agents can view own notifications" ON low_balance_notifications;
CREATE POLICY "Agents can view own notifications" ON low_balance_notifications
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE email = auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Staff can manage notifications" ON low_balance_notifications;
DROP POLICY IF EXISTS "Staff can manage notifications" ON low_balance_notifications;
CREATE POLICY "Staff can manage notifications" ON low_balance_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

-- Function to record credit transaction and update balance
CREATE OR REPLACE FUNCTION record_credit_transaction(
  p_agent_id UUID,
  p_type TEXT,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL,
  p_package_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_payment_method TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_service_type TEXT DEFAULT NULL,
  p_adjusted_by UUID DEFAULT NULL,
  p_adjustment_reason TEXT DEFAULT NULL
) RETURNS credit_transactions AS $$
DECLARE
  v_new_balance DECIMAL;
  v_transaction credit_transactions;
BEGIN
  -- Update agent balance
  UPDATE agents
  SET credit_balance = credit_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_agent_id
  RETURNING credit_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;

  -- Insert transaction record
  INSERT INTO credit_transactions (
    agent_id, type, amount, balance_after, description,
    package_id, stripe_payment_intent_id, stripe_payment_method,
    order_id, service_type, adjusted_by, adjustment_reason
  ) VALUES (
    p_agent_id, p_type, p_amount, v_new_balance, p_description,
    p_package_id, p_stripe_payment_intent_id, p_stripe_payment_method,
    p_order_id, p_service_type, p_adjusted_by, p_adjustment_reason
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if agent has sufficient credits
CREATE OR REPLACE FUNCTION check_sufficient_credits(
  p_agent_id UUID,
  p_required_credits DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT credit_balance INTO v_balance
  FROM agents
  WHERE id = p_agent_id;

  RETURN COALESCE(v_balance, 0) >= p_required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits for an order
CREATE OR REPLACE FUNCTION deduct_credits_for_order(
  p_agent_id UUID,
  p_order_id UUID,
  p_credits_amount DECIMAL,
  p_service_type TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_credits BOOLEAN;
BEGIN
  -- Check if agent has sufficient credits
  v_has_credits := check_sufficient_credits(p_agent_id, p_credits_amount);

  IF NOT v_has_credits THEN
    RETURN FALSE;
  END IF;

  -- Record the transaction (negative amount for deduction)
  PERFORM record_credit_transaction(
    p_agent_id,
    'usage',
    -p_credits_amount,
    COALESCE(p_description, 'Order ' || p_order_id::TEXT),
    NULL, NULL, NULL,
    p_order_id,
    p_service_type,
    NULL, NULL
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for low balance after transactions
CREATE OR REPLACE FUNCTION check_low_balance_trigger() RETURNS TRIGGER AS $$
DECLARE
  v_agent agents;
  v_threshold DECIMAL;
  v_hours_since_last INTEGER;
BEGIN
  -- Only check for usage transactions (balance decreasing)
  IF NEW.type = 'usage' THEN
    SELECT * INTO v_agent
    FROM agents
    WHERE id = NEW.agent_id;

    v_threshold := COALESCE(v_agent.credit_low_balance_threshold, 50.00);

    -- If balance is below threshold
    IF NEW.balance_after <= v_threshold THEN
      -- Check if we already sent a notification in the last 24 hours
      IF v_agent.low_balance_notification_sent_at IS NULL OR
         v_agent.low_balance_notification_sent_at < NOW() - INTERVAL '24 hours' THEN

        -- Record notification
        INSERT INTO low_balance_notifications (
          agent_id, balance_at_notification, notification_type
        ) VALUES (
          NEW.agent_id, NEW.balance_after, 'low_balance'
        );

        -- Update last notification time
        UPDATE agents
        SET low_balance_notification_sent_at = NOW()
        WHERE id = NEW.agent_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_low_balance ON credit_transactions;
CREATE TRIGGER trigger_check_low_balance
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION check_low_balance_trigger();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON credit_packages TO authenticated;
GRANT SELECT ON credit_usage_rates TO authenticated;
GRANT SELECT, INSERT ON credit_transactions TO authenticated;
GRANT SELECT ON low_balance_notifications TO authenticated;
