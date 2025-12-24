-- Marketing Assets Table
-- Version: 1.0.0
-- Date: 2024-12-24
-- Phase 3.4: Marketing Automation

-- =====================
-- 1. MARKETING ASSETS TABLE
-- =====================
CREATE TABLE marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Asset info
  type TEXT NOT NULL CHECK (type IN ('just_listed', 'just_sold', 'open_house', 'price_reduction', 'coming_soon', 'under_contract')),
  format TEXT NOT NULL CHECK (format IN ('instagram_square', 'instagram_portrait', 'instagram_story', 'facebook_post')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'failed')),

  -- Bannerbear tracking
  bannerbear_uid TEXT,

  -- Generated assets
  image_url TEXT,
  image_url_png TEXT,
  image_url_jpg TEXT,

  -- Metadata
  render_time_ms INTEGER,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_marketing_assets_listing ON marketing_assets(listing_id);
CREATE INDEX idx_marketing_assets_agent ON marketing_assets(agent_id);
CREATE INDEX idx_marketing_assets_type ON marketing_assets(type);
CREATE INDEX idx_marketing_assets_status ON marketing_assets(status);
CREATE INDEX idx_marketing_assets_bannerbear ON marketing_assets(bannerbear_uid);

-- =====================
-- 2. RLS POLICIES
-- =====================
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

-- Agents can view their own marketing assets
CREATE POLICY "Agents can view own marketing assets"
  ON marketing_assets FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can view all marketing assets
CREATE POLICY "Staff can view all marketing assets"
  ON marketing_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can insert marketing assets
CREATE POLICY "Staff can insert marketing assets"
  ON marketing_assets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Allow service role (webhooks) to update assets
CREATE POLICY "Service role can update marketing assets"
  ON marketing_assets FOR UPDATE
  USING (true);

-- =====================
-- 3. NOTIFICATIONS LOG TABLE
-- =====================
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  success BOOLEAN NOT NULL DEFAULT false,
  response JSONB,
  sent_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_log_type ON notifications_log(notification_type);
CREATE INDEX idx_notifications_log_created ON notifications_log(created_at DESC);

-- =====================
-- 4. ADD MARKETING COLUMNS TO AGENTS
-- =====================
-- These may already exist, so use DO block for safe addition
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'logo_url') THEN
    ALTER TABLE agents ADD COLUMN logo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'brand_color') THEN
    ALTER TABLE agents ADD COLUMN brand_color TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'brokerage_name') THEN
    ALTER TABLE agents ADD COLUMN brokerage_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'brokerage_logo_url') THEN
    ALTER TABLE agents ADD COLUMN brokerage_logo_url TEXT;
  END IF;
END $$;

-- =====================
-- 5. FUNCTION TO AUTO-GENERATE ON DELIVERY
-- =====================
-- This trigger will queue marketing asset generation when a listing is delivered
CREATE OR REPLACE FUNCTION queue_marketing_assets_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'delivered'
  IF NEW.ops_status = 'delivered' AND (OLD.ops_status IS NULL OR OLD.ops_status != 'delivered') THEN
    -- Insert a placeholder record to trigger generation via webhook or cron
    INSERT INTO marketing_assets (listing_id, agent_id, type, format, status)
    VALUES
      (NEW.id, NEW.agent_id, 'just_listed', 'instagram_square', 'pending'),
      (NEW.id, NEW.agent_id, 'just_listed', 'instagram_story', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (optional - can be disabled if manual generation preferred)
-- DROP TRIGGER IF EXISTS trigger_marketing_on_delivery ON listings;
-- CREATE TRIGGER trigger_marketing_on_delivery
--   AFTER UPDATE ON listings
--   FOR EACH ROW
--   EXECUTE FUNCTION queue_marketing_assets_on_delivery();

COMMENT ON TABLE marketing_assets IS 'Stores auto-generated marketing graphics for listings';
COMMENT ON TABLE notifications_log IS 'Audit log for email and SMS notifications sent';
