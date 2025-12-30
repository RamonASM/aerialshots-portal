-- ============================================
-- Consolidated Feature Migrations
-- Date: 2024-12-30
-- Combines: Open Houses, Loyalty, Reviews, Drip, Integrations, Seller Portal
-- ============================================

-- ============================================
-- 1. OPEN HOUSES & RSVP SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS open_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  title TEXT,
  description TEXT,
  max_attendees INTEGER,
  is_private BOOLEAN DEFAULT false,
  require_registration BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS open_house_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_id UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'cancelled', 'no_show')),
  notes TEXT,
  source TEXT DEFAULT 'website',
  lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_open_houses_listing ON open_houses(listing_id);
CREATE INDEX IF NOT EXISTS idx_open_houses_agent ON open_houses(agent_id);
CREATE INDEX IF NOT EXISTS idx_open_houses_date ON open_houses(event_date);
CREATE INDEX IF NOT EXISTS idx_open_house_rsvps_open_house ON open_house_rsvps(open_house_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_house_rsvps_unique ON open_house_rsvps(open_house_id, email);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE open_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_house_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open houses are readable by anyone" ON open_houses;
CREATE POLICY "Open houses are readable by anyone" ON open_houses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents can manage their open houses" ON open_houses;
CREATE POLICY "Agents can manage their open houses" ON open_houses FOR ALL
  USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage all open houses" ON open_houses;
CREATE POLICY "Staff can manage all open houses" ON open_houses FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Anyone can create RSVPs" ON open_house_rsvps;
CREATE POLICY "Anyone can create RSVPs" ON open_house_rsvps FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can read all RSVPs" ON open_house_rsvps;
CREATE POLICY "Staff can read all RSVPs" ON open_house_rsvps FOR SELECT
  USING (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 2. LOYALTY PROGRAM
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  perks JSONB DEFAULT '[]',
  badge_color TEXT DEFAULT '#0077ff',
  badge_icon TEXT DEFAULT 'star',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO loyalty_tiers (name, slug, min_points, discount_percent, perks, badge_color, display_order) VALUES
  ('Bronze', 'bronze', 0, 0, '["Priority support"]', '#cd7f32', 1),
  ('Silver', 'silver', 1000, 5, '["Priority support", "Early access to new features"]', '#c0c0c0', 2),
  ('Gold', 'gold', 5000, 10, '["Priority support", "Early access", "Free rush delivery"]', '#ffd700', 3),
  ('Platinum', 'platinum', 15000, 15, '["Priority support", "Early access", "Free rush delivery", "Dedicated account manager"]', '#e5e4e2', 4),
  ('Diamond', 'diamond', 50000, 20, '["All perks", "Custom pricing", "White glove service"]', '#b9f2ff', 5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS punch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL DEFAULT 'shoots',
  punches_required INTEGER NOT NULL DEFAULT 10,
  punches_earned INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'free_service',
  reward_value TEXT,
  reward_used BOOLEAN DEFAULT false,
  reward_used_at TIMESTAMPTZ,
  reward_order_id UUID,
  is_complete BOOLEAN GENERATED ALWAYS AS (punches_earned >= punches_required) STORED,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS punch_card_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_card_id UUID NOT NULL REFERENCES punch_cards(id) ON DELETE CASCADE,
  order_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_agent ON loyalty_points(agent_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(type);
CREATE INDEX IF NOT EXISTS idx_punch_cards_agent ON punch_cards(agent_id);

-- RLS
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Loyalty tiers are public" ON loyalty_tiers;
CREATE POLICY "Loyalty tiers are public" ON loyalty_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Agents can view their loyalty points" ON loyalty_points;
CREATE POLICY "Agents can view their loyalty points" ON loyalty_points FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage loyalty points" ON loyalty_points;
CREATE POLICY "Staff can manage loyalty points" ON loyalty_points FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Agents can view their punch cards" ON punch_cards;
CREATE POLICY "Agents can view their punch cards" ON punch_cards FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage punch cards" ON punch_cards;
CREATE POLICY "Staff can manage punch cards" ON punch_cards FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Function to award points
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_agent_id UUID,
  p_order_id UUID,
  p_order_total DECIMAL,
  p_points_per_dollar DECIMAL DEFAULT 1.0
)
RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  v_points := FLOOR(p_order_total * p_points_per_dollar);
  IF v_points > 0 THEN
    INSERT INTO loyalty_points (agent_id, points, type, source, source_id, description, expires_at)
    VALUES (p_agent_id, v_points, 'earned', 'order', p_order_id, 'Points earned from order', NOW() + INTERVAL '1 year');
  END IF;
  RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. REVIEW REQUESTS
-- ============================================

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID,
  order_id UUID,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp', 'trustpilot')),
  review_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'completed', 'cancelled', 'bounced')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  email_id TEXT,
  tracking_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_request_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delay_after_delivery_ms INTEGER DEFAULT 7200000,
  send_time_start TIME DEFAULT '09:00:00',
  send_time_end TIME DEFAULT '20:00:00',
  max_requests_per_agent_per_month INTEGER DEFAULT 2,
  min_days_between_requests INTEGER DEFAULT 14,
  default_channel TEXT DEFAULT 'email',
  primary_platform TEXT DEFAULT 'google',
  google_review_url TEXT,
  facebook_review_url TEXT,
  yelp_review_url TEXT,
  trustpilot_review_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO review_request_settings (google_review_url) VALUES
('https://g.page/r/YOUR_REVIEW_LINK/review')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_review_requests_agent ON review_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_tracking ON review_requests(tracking_token);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage review requests" ON review_requests;
CREATE POLICY "Staff can manage review requests" ON review_requests FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Agents can view their review requests" ON review_requests;
CREATE POLICY "Agents can view their review requests" ON review_requests FOR SELECT USING (agent_id = auth.uid());

DROP POLICY IF EXISTS "Staff can manage review settings" ON review_request_settings;
CREATE POLICY "Staff can manage review settings" ON review_request_settings FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 4. DRIP CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- 'signup', 'first_order', 'inactive_30d', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'unsubscribed')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  next_step_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_campaign ON drip_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_agent ON drip_enrollments(agent_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_next ON drip_enrollments(next_step_at) WHERE status = 'active';

ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage drip campaigns" ON drip_campaigns;
CREATE POLICY "Staff can manage drip campaigns" ON drip_campaigns FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can manage drip steps" ON drip_campaign_steps;
CREATE POLICY "Staff can manage drip steps" ON drip_campaign_steps FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can manage enrollments" ON drip_enrollments;
CREATE POLICY "Staff can manage enrollments" ON drip_enrollments FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 5. COUPONS
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  first_order_only BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  order_id UUID,
  discount_applied DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON coupon_uses(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_agent ON coupon_uses(agent_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coupons are readable" ON coupons;
CREATE POLICY "Coupons are readable" ON coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage coupons" ON coupons;
CREATE POLICY "Staff can manage coupons" ON coupons FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can view coupon uses" ON coupon_uses;
CREATE POLICY "Staff can view coupon uses" ON coupon_uses FOR SELECT
  USING (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 6. SELLER PORTAL
-- ============================================

CREATE TABLE IF NOT EXISTS seller_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  permissions JSONB DEFAULT '{"view_photos": true, "approve_photos": true, "view_details": true}',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_tokens_token ON seller_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_seller_tokens_listing ON seller_portal_tokens(listing_id);

ALTER TABLE seller_portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage seller tokens" ON seller_portal_tokens;
CREATE POLICY "Staff can manage seller tokens" ON seller_portal_tokens FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 7. SKILL EXECUTIONS (AI)
-- ============================================

CREATE TABLE IF NOT EXISTS skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL,
  listing_id UUID,
  input JSONB NOT NULL,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_listing ON skill_executions(listing_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_status ON skill_executions(status);

ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage skill executions" ON skill_executions;
CREATE POLICY "Staff can manage skill executions" ON skill_executions FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- 8. INTEGRATIONS (API TOKENS)
-- ============================================

CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'canva', 'quickbooks', 'mls', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_tokens_provider ON integration_tokens(provider) WHERE is_active = true;

ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage integration tokens" ON integration_tokens;
CREATE POLICY "Staff can manage integration tokens" ON integration_tokens FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media') WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'open_houses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE open_houses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'open_house_rsvps') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE open_house_rsvps;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'loyalty_points') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_points;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'punch_cards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE punch_cards;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'review_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE review_requests;
  END IF;
END $$;

-- Done!
