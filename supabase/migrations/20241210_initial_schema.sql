-- ASM Portal Initial Schema
-- Version: 1.0.0
-- Date: 2024-12-10

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TEMPLATES (lifestyle page designs)
-- =====================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  preview_url TEXT,
  config_json JSONB DEFAULT '{}'
);

-- Create unique constraint if it doesn't exist (for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'templates_name_key'
  ) THEN
    ALTER TABLE templates ADD CONSTRAINT templates_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Insert default templates
INSERT INTO templates (name, preview_url, config_json) VALUES
  ('Minimal Clean', NULL, '{"style": "minimal", "fontFamily": "Inter", "heroHeight": "70vh"}'),
  ('Bold Luxury', NULL, '{"style": "luxury", "fontFamily": "Playfair Display", "heroHeight": "100vh", "darkMode": true}'),
  ('Warm Lifestyle', NULL, '{"style": "lifestyle", "fontFamily": "Lora", "heroHeight": "80vh", "rounded": true}')
ON CONFLICT (name) DO NOTHING;

-- =====================
-- STAFF (internal team)
-- =====================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'photographer', 'qc', 'va')),
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AGENTS (replaces clients for portal context)
-- =====================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  bio TEXT,
  headshot_url TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#262626',
  instagram_url TEXT,
  aryeo_customer_id TEXT UNIQUE,
  -- Referral program fields
  referral_code TEXT UNIQUE,
  credit_balance INTEGER DEFAULT 0,
  lifetime_credits INTEGER DEFAULT 0,
  referral_tier TEXT DEFAULT 'bronze' CHECK (referral_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  referred_by_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate referral code on insert
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agents_generate_referral_code ON agents;
CREATE TRIGGER agents_generate_referral_code
  BEFORE INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agents_updated_at ON agents;
CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- LISTINGS (from Aryeo + enriched)
-- =====================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  aryeo_listing_id TEXT UNIQUE,
  aryeo_order_id TEXT,

  -- Property details
  address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'FL',
  zip TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  beds INTEGER,
  baths DECIMAL(3,1),
  sqft INTEGER,
  price DECIMAL(12,2),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'expired', 'withdrawn')),
  sold_price DECIMAL(12,2),
  sold_date DATE,
  dom INTEGER, -- days on market

  -- Template
  template_id UUID REFERENCES templates(id),

  -- Operations tracking (for ops dashboard)
  ops_status TEXT DEFAULT 'pending' CHECK (ops_status IN (
    'pending', 'scheduled', 'in_progress', 'staged',
    'processing', 'ready_for_qc', 'in_qc', 'delivered'
  )),
  photographer_id UUID REFERENCES staff(id),
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  is_rush BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS listings_updated_at ON listings;
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_agent_id ON listings(agent_id);
CREATE INDEX IF NOT EXISTS idx_listings_aryeo_listing_id ON listings(aryeo_listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_ops_status ON listings(ops_status);

-- =====================
-- MEDIA_ASSETS (from Aryeo)
-- =====================
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  aryeo_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'floorplan', 'matterport', 'document')),
  category TEXT CHECK (category IN ('mls', 'social_feed', 'social_stories', 'print', 'video', 'interactive')),
  sort_order INTEGER,
  tip_text TEXT,

  -- For ops: staged photos before delivery
  storage_path TEXT, -- Supabase storage for staged uploads
  qc_status TEXT DEFAULT 'pending' CHECK (qc_status IN ('pending', 'approved', 'rejected')),
  qc_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_listing_id ON media_assets(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);

-- =====================
-- CURATED_ITEMS (neighborhood developments)
-- =====================
CREATE TABLE IF NOT EXISTS curated_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  category TEXT CHECK (category IN ('development', 'infrastructure', 'business', 'event', 'amenity')),
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  radius_miles DECIMAL(4,2) DEFAULT 5.0,
  expires_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_items_location ON curated_items(lat, lng);
CREATE INDEX IF NOT EXISTS idx_curated_items_category ON curated_items(category);

-- =====================
-- AGENT_TIPS
-- =====================
CREATE TABLE IF NOT EXISTS agent_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE, -- null = applies to all
  tip_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tips_agent_id ON agent_tips(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tips_listing_id ON agent_tips(listing_id);

-- =====================
-- LEADS (from lifestyle pages)
-- =====================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  agent_id UUID REFERENCES agents(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  source TEXT DEFAULT 'lifestyle_page',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- =====================
-- REFERRALS
-- =====================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES agents(id),
  referred_email TEXT NOT NULL,
  referred_agent_id UUID REFERENCES agents(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed', 'credited', 'expired')),
  order_type TEXT CHECK (order_type IN ('photo', 'video', 'premium')),
  aryeo_order_id TEXT,
  credits_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- =====================
-- CREDIT_TRANSACTIONS (ledger)
-- =====================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  type TEXT NOT NULL CHECK (type IN (
    'referral', 'bonus', 'redemption', 'expiry', 'adjustment',
    'ai_tool', 'storywork_basic', 'storywork_voice', 'storywork_carousel'
  )),
  description TEXT,
  referral_id UUID REFERENCES referrals(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_id ON credit_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- =====================
-- REDEMPTIONS (rewards claimed)
-- =====================
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('ai_tool', 'discount', 'free_service', 'storywork')),
  reward_id TEXT NOT NULL,
  credits_cost INTEGER NOT NULL,
  aryeo_coupon_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_agent_id ON redemptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);

-- =====================
-- AI_TOOL_USAGE
-- =====================
CREATE TABLE IF NOT EXISTS ai_tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  listing_id UUID REFERENCES listings(id),
  tool_type TEXT NOT NULL CHECK (tool_type IN (
    'listing_description', 'social_captions', 'neighborhood_guide',
    'buyer_personas', 'video_script', 'property_highlights',
    'open_house_email', 'announcement'
  )),
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_agent_id ON ai_tool_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_tool_type ON ai_tool_usage(tool_type);

-- =====================
-- CARE_TASKS (customer success)
-- =====================
CREATE TABLE IF NOT EXISTS care_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  listing_id UUID REFERENCES listings(id),
  assigned_to UUID REFERENCES staff(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('care_call', 'review_request', 'follow_up', 'onboarding')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  priority INTEGER DEFAULT 0,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_tasks_assigned_to ON care_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_care_tasks_status ON care_tasks(status);
CREATE INDEX IF NOT EXISTS idx_care_tasks_due_at ON care_tasks(due_at);

-- =====================
-- COMMUNICATIONS (SMS/email log)
-- =====================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  listing_id UUID REFERENCES listings(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'phone')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  to_address TEXT,
  body TEXT,
  template_key TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  external_id TEXT, -- Twilio SID or email ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communications_agent_id ON communications(agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);

-- =====================
-- WEBHOOK_EVENTS (idempotency)
-- =====================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aryeo_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'dead_letter')),
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_aryeo_event_id ON webhook_events(aryeo_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);

-- =====================
-- JOB_EVENTS (audit trail)
-- =====================
CREATE TABLE IF NOT EXISTS job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('staff', 'agent', 'system', 'webhook')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_listing_id ON job_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON job_events(created_at);

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to update agent credit balance
CREATE OR REPLACE FUNCTION update_agent_credits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agents
  SET
    credit_balance = credit_balance + NEW.amount,
    lifetime_credits = CASE
      WHEN NEW.amount > 0 THEN lifetime_credits + NEW.amount
      ELSE lifetime_credits
    END
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_transactions_update_balance ON credit_transactions;
CREATE TRIGGER credit_transactions_update_balance
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_credits();

-- Function to find curated items near a location
CREATE OR REPLACE FUNCTION get_nearby_curated_items(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_miles DECIMAL DEFAULT 5.0
)
RETURNS SETOF curated_items AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM curated_items
  WHERE is_active = TRUE
    AND (expires_at IS NULL OR expires_at > CURRENT_DATE)
    AND (
      -- Haversine formula approximation
      3959 * acos(
        cos(radians(p_lat)) * cos(radians(lat)) *
        cos(radians(lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(lat))
      ) <= LEAST(p_radius_miles, radius_miles)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tips ENABLE ROW LEVEL SECURITY;

-- Agents can read/update their own data
DROP POLICY IF EXISTS "Agents can view own profile" ON agents;
DROP POLICY IF EXISTS "Agents can view own profile" ON agents;
CREATE POLICY "Agents can view own profile" ON agents
  FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Agents can update own profile" ON agents;
DROP POLICY IF EXISTS "Agents can update own profile" ON agents;
CREATE POLICY "Agents can update own profile" ON agents
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Public can view agent portfolios (for /agents/[slug] pages)
DROP POLICY IF EXISTS "Public can view agent profiles" ON agents;
DROP POLICY IF EXISTS "Public can view agent profiles" ON agents;
CREATE POLICY "Public can view agent profiles" ON agents
  FOR SELECT USING (true);

-- Agents can view their own listings
DROP POLICY IF EXISTS "Agents can view own listings" ON listings;
DROP POLICY IF EXISTS "Agents can view own listings" ON listings;
CREATE POLICY "Agents can view own listings" ON listings
  FOR SELECT USING (agent_id::text = auth.uid()::text);

-- Public can view listings (for lifestyle pages)
DROP POLICY IF EXISTS "Public can view listings" ON listings;
DROP POLICY IF EXISTS "Public can view listings" ON listings;
CREATE POLICY "Public can view listings" ON listings
  FOR SELECT USING (true);

-- Media assets follow listing visibility
DROP POLICY IF EXISTS "Public can view media assets" ON media_assets;
DROP POLICY IF EXISTS "Public can view media assets" ON media_assets;
CREATE POLICY "Public can view media assets" ON media_assets
  FOR SELECT USING (true);

-- Leads: agents see their own, public can insert
DROP POLICY IF EXISTS "Agents can view own leads" ON leads;
DROP POLICY IF EXISTS "Agents can view own leads" ON leads;
CREATE POLICY "Agents can view own leads" ON leads
  FOR SELECT USING (agent_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Public can submit leads" ON leads;
DROP POLICY IF EXISTS "Public can submit leads" ON leads;
CREATE POLICY "Public can submit leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Referrals: agents see own referrals
DROP POLICY IF EXISTS "Agents can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Agents can view own referrals" ON referrals;
CREATE POLICY "Agents can view own referrals" ON referrals
  FOR SELECT USING (referrer_id::text = auth.uid()::text);

-- Credit transactions: agents see own
DROP POLICY IF EXISTS "Agents can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Agents can view own transactions" ON credit_transactions;
CREATE POLICY "Agents can view own transactions" ON credit_transactions
  FOR SELECT USING (agent_id::text = auth.uid()::text);

-- Redemptions: agents see own
DROP POLICY IF EXISTS "Agents can view own redemptions" ON redemptions;
DROP POLICY IF EXISTS "Agents can view own redemptions" ON redemptions;
CREATE POLICY "Agents can view own redemptions" ON redemptions
  FOR SELECT USING (agent_id::text = auth.uid()::text);

-- AI tool usage: agents see own
DROP POLICY IF EXISTS "Agents can view own AI usage" ON ai_tool_usage;
DROP POLICY IF EXISTS "Agents can view own AI usage" ON ai_tool_usage;
CREATE POLICY "Agents can view own AI usage" ON ai_tool_usage
  FOR SELECT USING (agent_id::text = auth.uid()::text);

-- Tips: agents manage own tips
DROP POLICY IF EXISTS "Agents can manage own tips" ON agent_tips;
DROP POLICY IF EXISTS "Agents can manage own tips" ON agent_tips;
CREATE POLICY "Agents can manage own tips" ON agent_tips
  FOR ALL USING (agent_id::text = auth.uid()::text);

-- Service role bypasses RLS for admin operations
-- (handled by using service role key in admin client)
