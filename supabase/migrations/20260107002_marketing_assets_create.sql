-- Made idempotent: 2026-01-07
-- Marketing Assets Table Creation
-- Version: 2.0.0
-- Date: 2026-01-07
-- Purpose: Create marketing_assets table with both V1 (Bannerbear) and V2 (Asset library) columns

-- =====================================================
-- 1. CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core references
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  campaign_id UUID,

  -- V1: Bannerbear rendering columns
  type TEXT,                           -- just_listed, just_sold, open_house, etc.
  format TEXT,                         -- instagram_post, instagram_story, facebook, etc.
  status TEXT DEFAULT 'pending',       -- pending, rendering, completed, failed
  bannerbear_uid TEXT,                 -- Bannerbear job ID
  image_url TEXT,                      -- Generic image URL
  image_url_png TEXT,                  -- PNG version
  image_url_jpg TEXT,                  -- JPG version
  completed_at TIMESTAMPTZ,            -- When Bannerbear completed

  -- V2: Asset library columns
  name TEXT,                           -- Display name
  description TEXT,                    -- Description
  asset_type TEXT,                     -- flyer, brochure, social_graphic, etc.
  file_url TEXT,                       -- Primary file URL
  file_type TEXT,                      -- MIME type
  file_size INTEGER,                   -- File size in bytes
  width INTEGER,                       -- Image width
  height INTEGER,                      -- Image height
  template_id UUID,                    -- Reference to template
  tags TEXT[] DEFAULT '{}',            -- Searchable tags
  metadata JSONB DEFAULT '{}',         -- Additional metadata
  is_favorite BOOLEAN DEFAULT false,   -- Favorite flag
  download_count INTEGER DEFAULT 0,    -- Download counter

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_marketing_assets_listing ON marketing_assets(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_agent ON marketing_assets(agent_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_campaign ON marketing_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_type ON marketing_assets(type);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_status ON marketing_assets(status);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_asset_type ON marketing_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_tags ON marketing_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_template ON marketing_assets(template_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_favorite ON marketing_assets(is_favorite) WHERE is_favorite = true;

-- =====================================================
-- 3. CHECK CONSTRAINTS
-- =====================================================

DO $$
BEGIN
  -- V1 type constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketing_assets_type_check'
  ) THEN
    ALTER TABLE marketing_assets ADD CONSTRAINT marketing_assets_type_check
      CHECK (type IS NULL OR type IN (
        'just_listed', 'just_sold', 'open_house', 'price_change',
        'coming_soon', 'under_contract', 'new_construction', 'featured'
      ));
  END IF;

  -- V2 asset_type constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketing_assets_asset_type_check'
  ) THEN
    ALTER TABLE marketing_assets ADD CONSTRAINT marketing_assets_asset_type_check
      CHECK (asset_type IS NULL OR asset_type IN (
        'flyer', 'brochure', 'postcard', 'door_hanger', 'yard_sign',
        'social_graphic', 'email_header', 'business_card', 'presentation',
        'video_thumbnail', 'other'
      ));
  END IF;
END $$;

-- =====================================================
-- 4. TRIGGER FOR updated_at
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_marketing_assets_updated ON marketing_assets;
CREATE TRIGGER trigger_marketing_assets_updated
  BEFORE UPDATE ON marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

-- Staff can do everything
CREATE POLICY marketing_assets_staff_all ON marketing_assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE marketing_assets IS 'Marketing assets including Bannerbear renders and uploaded files';
COMMENT ON COLUMN marketing_assets.type IS 'V1: Bannerbear asset type (just_listed, just_sold, etc.)';
COMMENT ON COLUMN marketing_assets.asset_type IS 'V2: Marketing asset category (flyer, brochure, social_graphic, etc.)';
COMMENT ON COLUMN marketing_assets.file_url IS 'V2: Primary file URL';
COMMENT ON COLUMN marketing_assets.tags IS 'V2: Searchable tags array';
COMMENT ON COLUMN marketing_assets.metadata IS 'V2: Additional metadata JSON';
