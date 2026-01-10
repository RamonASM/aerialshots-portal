-- ListingLaunch Schema
-- Version: 1.0.0
-- Date: 2024-12-11
-- Description: Tables for ListingLaunch marketing campaign feature

-- =====================
-- LISTING CAMPAIGNS
-- Main campaign record linking listing to generated content
-- =====================
CREATE TABLE IF NOT EXISTS listing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) NOT NULL,

  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'researching', 'questions', 'generating', 'completed', 'published'
  )),

  neighborhood_data JSONB,
  generated_questions JSONB,
  agent_answers JSONB,
  carousel_types TEXT[],
  blog_post_content JSONB,

  credits_used INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_campaigns_listing ON listing_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_campaigns_agent ON listing_campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_listing_campaigns_status ON listing_campaigns(status);

DROP TRIGGER IF EXISTS listing_campaigns_updated_at ON listing_campaigns;
CREATE TRIGGER listing_campaigns_updated_at
  BEFORE UPDATE ON listing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- LISTING CAROUSELS
-- Individual carousels within a campaign
-- =====================
CREATE TABLE IF NOT EXISTS listing_carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES listing_campaigns(id) ON DELETE CASCADE NOT NULL,

  carousel_type VARCHAR(50) NOT NULL CHECK (carousel_type IN (
    'property_highlights', 'neighborhood_guide', 'local_favorites',
    'schools_families', 'lifestyle', 'market_update', 'open_house'
  )),
  title VARCHAR(255),

  slides JSONB NOT NULL DEFAULT '[]',
  caption TEXT,
  hashtags TEXT[],

  bannerbear_collection_uid VARCHAR(100),
  rendered_image_urls TEXT[],
  render_status VARCHAR(50) DEFAULT 'pending' CHECK (render_status IN (
    'pending', 'rendering', 'completed', 'failed'
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  rendered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_carousels_campaign ON listing_carousels(campaign_id);
CREATE INDEX IF NOT EXISTS idx_listing_carousels_type ON listing_carousels(carousel_type);

-- =====================
-- LISTING BLOG POSTS
-- SEO blog posts generated from campaigns
-- =====================
CREATE TABLE IF NOT EXISTS listing_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES listing_campaigns(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id),

  title VARCHAR(500),
  slug VARCHAR(255),
  meta_description VARCHAR(300),
  content TEXT,

  focus_keyword VARCHAR(100),
  secondary_keywords TEXT[],

  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_blog_posts_campaign ON listing_blog_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_listing_blog_posts_slug ON listing_blog_posts(slug);

-- =====================
-- INSTAGRAM CONNECTIONS
-- OAuth tokens for direct posting
-- =====================
CREATE TABLE IF NOT EXISTS instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,

  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('personal', 'business', 'creator')),

  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  facebook_page_id TEXT,
  facebook_page_name TEXT,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  permissions_granted TEXT[],

  profile_picture_url TEXT,
  followers_count INTEGER,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_connections_agent ON instagram_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_instagram_connections_ig_user ON instagram_connections(instagram_user_id);

DROP TRIGGER IF EXISTS instagram_connections_updated_at ON instagram_connections;
CREATE TRIGGER instagram_connections_updated_at
  BEFORE UPDATE ON instagram_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- INSTAGRAM SCHEDULED POSTS
-- Scheduled and published posts
-- =====================
CREATE TABLE IF NOT EXISTS instagram_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  connection_id UUID REFERENCES instagram_connections(id) ON DELETE CASCADE,
  carousel_id UUID REFERENCES listing_carousels(id) ON DELETE SET NULL,

  media_urls TEXT[] NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT[],

  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',

  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
  )),

  instagram_media_id TEXT,
  instagram_permalink TEXT,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_scheduled_agent ON instagram_scheduled_posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_ig_scheduled_status ON instagram_scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_ig_scheduled_for ON instagram_scheduled_posts(scheduled_for);

DROP TRIGGER IF EXISTS instagram_scheduled_posts_updated_at ON instagram_scheduled_posts;
CREATE TRIGGER instagram_scheduled_posts_updated_at
  BEFORE UPDATE ON instagram_scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- INSTAGRAM EMBED CACHE
-- Cached oEmbed data for portfolio pages
-- =====================
CREATE TABLE IF NOT EXISTS instagram_embed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,

  instagram_url TEXT NOT NULL,
  instagram_post_id TEXT,

  embed_html TEXT NOT NULL,
  thumbnail_url TEXT,
  author_name TEXT,

  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_embed_agent ON instagram_embed_cache(agent_id);
CREATE INDEX IF NOT EXISTS idx_ig_embed_url ON instagram_embed_cache(instagram_url);
CREATE INDEX IF NOT EXISTS idx_ig_embed_expires ON instagram_embed_cache(expires_at);

-- =====================
-- CAROUSEL TYPES REFERENCE
-- Predefined carousel types and their prompts
-- =====================
CREATE TABLE IF NOT EXISTS carousel_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slide_count INTEGER DEFAULT 7,
  prompt_template TEXT,
  bannerbear_template_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO carousel_types (id, name, description, slide_count, sort_order) VALUES
  ('property_highlights', 'Property Highlights', 'Showcase the best features of the listing', 7, 1),
  ('neighborhood_guide', 'Neighborhood Guide', 'Local area highlights and lifestyle', 7, 2),
  ('local_favorites', 'Local Favorites', 'Best restaurants, cafes, and shops nearby', 7, 3),
  ('schools_families', 'Schools & Families', 'Education options and family-friendly amenities', 7, 4),
  ('lifestyle', 'Lifestyle', 'What daily life looks like in this home', 7, 5),
  ('market_update', 'Market Update', 'Area market trends and investment potential', 7, 6),
  ('open_house', 'Open House', 'Open house announcement and details', 7, 7);

-- =====================
-- ADD INSTAGRAM BUSINESS FLAG TO AGENTS
-- =====================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS instagram_business_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS instagram_auto_post_carousels BOOLEAN DEFAULT FALSE;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE listing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_embed_cache ENABLE ROW LEVEL SECURITY;

-- Agents can only access their own campaigns
DROP POLICY IF EXISTS "Agents can view own campaigns" ON listing_campaigns;
DROP POLICY IF EXISTS "Agents can view own campaigns" ON listing_campaigns;
CREATE POLICY "Agents can view own campaigns" ON listing_campaigns
  FOR SELECT USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "Agents can insert own campaigns" ON listing_campaigns;
DROP POLICY IF EXISTS "Agents can insert own campaigns" ON listing_campaigns;
CREATE POLICY "Agents can insert own campaigns" ON listing_campaigns
  FOR INSERT WITH CHECK (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "Agents can update own campaigns" ON listing_campaigns;
DROP POLICY IF EXISTS "Agents can update own campaigns" ON listing_campaigns;
CREATE POLICY "Agents can update own campaigns" ON listing_campaigns
  FOR UPDATE USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Carousels inherit from campaigns
DROP POLICY IF EXISTS "Agents can view own carousels" ON listing_carousels;
DROP POLICY IF EXISTS "Agents can view own carousels" ON listing_carousels;
CREATE POLICY "Agents can view own carousels" ON listing_carousels
  FOR SELECT USING (campaign_id IN (
    SELECT id FROM listing_campaigns WHERE agent_id IN (
      SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
    )
  ));

DROP POLICY IF EXISTS "Agents can insert own carousels" ON listing_carousels;
DROP POLICY IF EXISTS "Agents can insert own carousels" ON listing_carousels;
CREATE POLICY "Agents can insert own carousels" ON listing_carousels
  FOR INSERT WITH CHECK (campaign_id IN (
    SELECT id FROM listing_campaigns WHERE agent_id IN (
      SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
    )
  ));

-- Blog posts inherit from campaigns
DROP POLICY IF EXISTS "Agents can view own blog posts" ON listing_blog_posts;
DROP POLICY IF EXISTS "Agents can view own blog posts" ON listing_blog_posts;
CREATE POLICY "Agents can view own blog posts" ON listing_blog_posts
  FOR SELECT USING (campaign_id IN (
    SELECT id FROM listing_campaigns WHERE agent_id IN (
      SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
    )
  ));

-- Instagram connections
DROP POLICY IF EXISTS "Agents can view own instagram connections" ON instagram_connections;
DROP POLICY IF EXISTS "Agents can view own instagram connections" ON instagram_connections;
CREATE POLICY "Agents can view own instagram connections" ON instagram_connections
  FOR SELECT USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "Agents can manage own instagram connections" ON instagram_connections;
DROP POLICY IF EXISTS "Agents can manage own instagram connections" ON instagram_connections;
CREATE POLICY "Agents can manage own instagram connections" ON instagram_connections
  FOR ALL USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Scheduled posts
DROP POLICY IF EXISTS "Agents can view own scheduled posts" ON instagram_scheduled_posts;
DROP POLICY IF EXISTS "Agents can view own scheduled posts" ON instagram_scheduled_posts;
CREATE POLICY "Agents can view own scheduled posts" ON instagram_scheduled_posts
  FOR SELECT USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "Agents can manage own scheduled posts" ON instagram_scheduled_posts;
DROP POLICY IF EXISTS "Agents can manage own scheduled posts" ON instagram_scheduled_posts;
CREATE POLICY "Agents can manage own scheduled posts" ON instagram_scheduled_posts
  FOR ALL USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Embed cache
DROP POLICY IF EXISTS "Agents can view own embed cache" ON instagram_embed_cache;
DROP POLICY IF EXISTS "Agents can view own embed cache" ON instagram_embed_cache;
CREATE POLICY "Agents can view own embed cache" ON instagram_embed_cache
  FOR SELECT USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Service role bypass for all tables (for server-side operations)
DROP POLICY IF EXISTS "Service role full access to campaigns" ON listing_campaigns;
DROP POLICY IF EXISTS "Service role full access to campaigns" ON listing_campaigns;
CREATE POLICY "Service role full access to campaigns" ON listing_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to carousels" ON listing_carousels;
DROP POLICY IF EXISTS "Service role full access to carousels" ON listing_carousels;
CREATE POLICY "Service role full access to carousels" ON listing_carousels
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to blog posts" ON listing_blog_posts;
DROP POLICY IF EXISTS "Service role full access to blog posts" ON listing_blog_posts;
CREATE POLICY "Service role full access to blog posts" ON listing_blog_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to instagram connections" ON instagram_connections;
DROP POLICY IF EXISTS "Service role full access to instagram connections" ON instagram_connections;
CREATE POLICY "Service role full access to instagram connections" ON instagram_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to scheduled posts" ON instagram_scheduled_posts;
DROP POLICY IF EXISTS "Service role full access to scheduled posts" ON instagram_scheduled_posts;
CREATE POLICY "Service role full access to scheduled posts" ON instagram_scheduled_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to embed cache" ON instagram_embed_cache;
DROP POLICY IF EXISTS "Service role full access to embed cache" ON instagram_embed_cache;
CREATE POLICY "Service role full access to embed cache" ON instagram_embed_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read for carousel_types
DROP POLICY IF EXISTS "Public can read carousel types" ON carousel_types;
DROP POLICY IF EXISTS "Public can read carousel types" ON carousel_types;
CREATE POLICY "Public can read carousel types" ON carousel_types
  FOR SELECT TO PUBLIC USING (true);
