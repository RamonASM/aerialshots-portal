-- Tier 3: Portfolio & Marketing
-- QR codes, social media templates, and marketing assets

-- =====================================================
-- QR CODES
-- =====================================================

-- QR code records for tracking and analytics
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- QR Code details
  code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  short_url TEXT,

  -- Customization
  title TEXT,
  description TEXT,
  style JSONB DEFAULT '{}',
  -- style: { foreground: '#000', background: '#fff', logo_url: '', size: 256 }

  -- Type
  qr_type TEXT NOT NULL CHECK (qr_type IN (
    'listing',
    'portfolio',
    'contact',
    'review',
    'social',
    'custom'
  )),

  -- Analytics
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR code scan events for detailed analytics
CREATE TABLE IF NOT EXISTS qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,

  -- Scan details
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,

  -- Location (optional, from IP)
  city TEXT,
  region TEXT,
  country TEXT,

  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_agent ON qr_codes(agent_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_listing ON qr_codes(listing_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr ON qr_code_scans(qr_code_id, scanned_at DESC);

-- =====================================================
-- SOCIAL MEDIA TEMPLATES
-- =====================================================

-- Social media post templates
CREATE TABLE IF NOT EXISTS social_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (null = global template)
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'new_listing',
    'open_house',
    'just_sold',
    'price_drop',
    'coming_soon',
    'market_update',
    'testimonial',
    'holiday',
    'general'
  )),

  -- Platform
  platform TEXT NOT NULL CHECK (platform IN (
    'instagram_post',
    'instagram_story',
    'instagram_reel',
    'facebook_post',
    'facebook_story',
    'tiktok',
    'linkedin',
    'twitter',
    'pinterest'
  )),

  -- Dimensions
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,

  -- Template content
  template_data JSONB NOT NULL DEFAULT '{}',
  -- template_data: { layers: [], background: {}, text_elements: [], image_placeholders: [] }

  -- Preview
  preview_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_social_templates_agent ON social_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_social_templates_category ON social_templates(category, platform);
CREATE INDEX IF NOT EXISTS idx_social_templates_featured ON social_templates(is_featured) WHERE is_featured = true;

-- =====================================================
-- MARKETING ASSETS
-- =====================================================

-- Marketing asset library
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Asset details
  name TEXT NOT NULL,
  description TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'flyer',
    'brochure',
    'postcard',
    'door_hanger',
    'yard_sign',
    'social_graphic',
    'email_header',
    'business_card',
    'presentation',
    'video_thumbnail',
    'other'
  )),

  -- File info
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,

  -- Template reference (if created from template)
  template_id UUID REFERENCES social_templates(id) ON DELETE SET NULL,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Status
  is_favorite BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for asset lookups
CREATE INDEX IF NOT EXISTS idx_marketing_assets_agent ON marketing_assets(agent_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_listing ON marketing_assets(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_type ON marketing_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_tags ON marketing_assets USING GIN(tags);

-- =====================================================
-- AGENT PORTFOLIOS (Enhanced)
-- =====================================================

-- Portfolio items for agent showcase
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Item details
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'listing',
    'sold',
    'testimonial',
    'award',
    'video',
    'photo',
    'article'
  )),

  -- Media
  media_url TEXT,
  thumbnail_url TEXT,

  -- Reference
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Display
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,

  -- Stats
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for portfolio lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_items_agent ON portfolio_items(agent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured ON portfolio_items(agent_id) WHERE is_featured = true;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_qr_codes_updated ON qr_codes;
CREATE TRIGGER trigger_qr_codes_updated
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_social_templates_updated ON social_templates;
CREATE TRIGGER trigger_social_templates_updated
  BEFORE UPDATE ON social_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_marketing_assets_updated ON marketing_assets;
CREATE TRIGGER trigger_marketing_assets_updated
  BEFORE UPDATE ON marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_portfolio_items_updated ON portfolio_items;
CREATE TRIGGER trigger_portfolio_items_updated
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QR CODE SCAN TRACKING
-- =====================================================

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_codes
  SET scan_count = scan_count + 1,
      last_scanned_at = NEW.scanned_at
  WHERE id = NEW.qr_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_scan_count ON qr_code_scans;
CREATE TRIGGER trigger_qr_scan_count
  AFTER INSERT ON qr_code_scans
  FOR EACH ROW
  EXECUTE FUNCTION increment_qr_scan_count();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- QR Codes
CREATE POLICY "Staff can manage all QR codes" ON qr_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

CREATE POLICY "Agents can manage own QR codes" ON qr_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = qr_codes.agent_id AND email = auth.jwt() ->> 'email')
  );

-- QR Code Scans (insert only for tracking, staff can view)
CREATE POLICY "Anyone can record scans" ON qr_code_scans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can view scans" ON qr_code_scans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

CREATE POLICY "Agents can view own QR scans" ON qr_code_scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM qr_codes qr
      JOIN agents a ON qr.agent_id = a.id
      WHERE qr.id = qr_code_scans.qr_code_id AND a.email = auth.jwt() ->> 'email'
    )
  );

-- Social Templates
CREATE POLICY "Anyone can view active templates" ON social_templates
  FOR SELECT USING (is_active = true AND (agent_id IS NULL OR EXISTS (
    SELECT 1 FROM agents WHERE id = social_templates.agent_id AND email = auth.jwt() ->> 'email'
  )));

CREATE POLICY "Staff can manage all templates" ON social_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

CREATE POLICY "Agents can manage own templates" ON social_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = social_templates.agent_id AND email = auth.jwt() ->> 'email')
  );

-- Marketing Assets
CREATE POLICY "Staff can manage all assets" ON marketing_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

CREATE POLICY "Agents can manage own assets" ON marketing_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = marketing_assets.agent_id AND email = auth.jwt() ->> 'email')
  );

-- Portfolio Items
CREATE POLICY "Anyone can view visible portfolio items" ON portfolio_items
  FOR SELECT USING (is_visible = true);

CREATE POLICY "Staff can manage all portfolio items" ON portfolio_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true)
  );

CREATE POLICY "Agents can manage own portfolio" ON portfolio_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = portfolio_items.agent_id AND email = auth.jwt() ->> 'email')
  );

-- =====================================================
-- SEED DEFAULT TEMPLATES
-- =====================================================

INSERT INTO social_templates (name, description, category, platform, width, height, template_data, is_featured) VALUES
(
  'New Listing - Classic',
  'Clean, professional new listing announcement',
  'new_listing',
  'instagram_post',
  1080,
  1080,
  '{"background": {"type": "image_placeholder"}, "text_elements": [{"text": "NEW LISTING", "position": "top", "style": {"fontSize": 48, "fontWeight": "bold"}}, {"text": "{{address}}", "position": "bottom", "style": {"fontSize": 32}}, {"text": "{{price}}", "position": "bottom", "style": {"fontSize": 36, "fontWeight": "bold"}}]}'::jsonb,
  true
),
(
  'Just Sold - Celebration',
  'Celebrate your sale with this eye-catching template',
  'just_sold',
  'instagram_post',
  1080,
  1080,
  '{"background": {"type": "gradient", "colors": ["#1a1a2e", "#16213e"]}, "text_elements": [{"text": "JUST SOLD!", "position": "center", "style": {"fontSize": 64, "fontWeight": "bold", "color": "#ffffff"}}, {"text": "{{address}}", "position": "bottom", "style": {"fontSize": 24, "color": "#ffffff"}}]}'::jsonb,
  true
),
(
  'Open House - Modern',
  'Promote your open house with style',
  'open_house',
  'instagram_story',
  1080,
  1920,
  '{"background": {"type": "image_placeholder"}, "text_elements": [{"text": "OPEN HOUSE", "position": "top", "style": {"fontSize": 56, "fontWeight": "bold"}}, {"text": "{{date}} | {{time}}", "position": "center", "style": {"fontSize": 32}}, {"text": "{{address}}", "position": "bottom", "style": {"fontSize": 28}}]}'::jsonb,
  true
),
(
  'Price Drop Alert',
  'Announce price reductions effectively',
  'price_drop',
  'instagram_post',
  1080,
  1080,
  '{"background": {"type": "solid", "color": "#ef4444"}, "text_elements": [{"text": "PRICE REDUCED!", "position": "top", "style": {"fontSize": 48, "fontWeight": "bold", "color": "#ffffff"}}, {"text": "Now {{price}}", "position": "center", "style": {"fontSize": 40, "color": "#ffffff"}}, {"text": "{{address}}", "position": "bottom", "style": {"fontSize": 24, "color": "#ffffff"}}]}'::jsonb,
  false
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE qr_codes IS 'QR codes for marketing materials with scan tracking';
COMMENT ON TABLE qr_code_scans IS 'Individual QR code scan events for analytics';
COMMENT ON TABLE social_templates IS 'Reusable social media post templates';
COMMENT ON TABLE marketing_assets IS 'Generated marketing materials library';
COMMENT ON TABLE portfolio_items IS 'Agent portfolio showcase items';

COMMENT ON COLUMN qr_codes.style IS 'QR code styling: foreground, background colors, logo, size';
COMMENT ON COLUMN social_templates.template_data IS 'Template structure: layers, background, text elements, placeholders';
