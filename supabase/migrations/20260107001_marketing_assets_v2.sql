-- Made idempotent: 2026-01-07
-- Marketing Assets Schema Reconciliation
-- Version: 2.0.0
-- Date: 2026-01-07
-- Purpose: Add V2 columns to existing V1 marketing_assets table
--
-- Background:
--   V1 (20241224_012) created table with Bannerbear columns: type, format, status, bannerbear_uid
--   V2 (20241228_007) used IF NOT EXISTS so columns never got added: name, asset_type, file_url, tags, etc.
--   This migration reconciles both schemas for backwards compatibility.

-- =====================================================
-- 1. ADD V2 COLUMNS TO EXISTING TABLE
-- =====================================================

-- Asset details (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS asset_type TEXT;

-- File info (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS height INTEGER;

-- Template reference (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES social_templates(id) ON DELETE SET NULL;

-- Metadata (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Status (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Timestamps (V2)
ALTER TABLE marketing_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. ADD CHECK CONSTRAINT FOR asset_type
-- =====================================================
-- Only add if not exists (V1 has a different constraint on 'type')

DO $$
BEGIN
  -- Add asset_type constraint if column exists and no constraint yet
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketing_assets' AND column_name = 'asset_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'marketing_assets' AND column_name = 'asset_type'
  ) THEN
    BEGIN
      ALTER TABLE marketing_assets ADD CONSTRAINT marketing_assets_asset_type_check
        CHECK (asset_type IS NULL OR asset_type IN (
          'flyer', 'brochure', 'postcard', 'door_hanger', 'yard_sign',
          'social_graphic', 'email_header', 'business_card', 'presentation',
          'video_thumbnail', 'other'
        ));
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists, ignore
      NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- 3. MIGRATE EXISTING V1 DATA TO V2 COLUMNS
-- =====================================================

-- Populate V2 columns from V1 data where possible
UPDATE marketing_assets SET
  -- Generate name from type + format if not set
  name = COALESCE(name, CONCAT(REPLACE(type, '_', ' '), ' - ', REPLACE(format, '_', ' '))),
  -- Map V1 type to V2 asset_type (social_graphic covers most V1 types)
  asset_type = COALESCE(asset_type, 'social_graphic'),
  -- Use first available image URL
  file_url = COALESCE(file_url, image_url, image_url_png, image_url_jpg),
  -- Set file_type based on which URL was used
  file_type = COALESCE(file_type,
    CASE
      WHEN image_url_png IS NOT NULL THEN 'image/png'
      WHEN image_url_jpg IS NOT NULL THEN 'image/jpeg'
      WHEN image_url IS NOT NULL THEN 'image/png'
      ELSE NULL
    END
  ),
  -- Timestamps
  updated_at = COALESCE(updated_at, completed_at, created_at)
WHERE name IS NULL OR asset_type IS NULL OR file_url IS NULL;

-- =====================================================
-- 4. ADD MISSING INDEXES FOR V2 COLUMNS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_marketing_assets_asset_type_v2 ON marketing_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_tags ON marketing_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_template ON marketing_assets(template_id);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_favorite ON marketing_assets(is_favorite) WHERE is_favorite = true;

-- =====================================================
-- 5. UPDATE TRIGGER FOR updated_at
-- =====================================================

-- Ensure update trigger exists
DROP TRIGGER IF EXISTS trigger_marketing_assets_updated_v2 ON marketing_assets;
CREATE TRIGGER trigger_marketing_assets_updated_v2
  BEFORE UPDATE ON marketing_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON COLUMN marketing_assets.type IS 'V1: Bannerbear asset type (just_listed, just_sold, etc.)';
COMMENT ON COLUMN marketing_assets.asset_type IS 'V2: Marketing asset category (flyer, brochure, social_graphic, etc.)';
COMMENT ON COLUMN marketing_assets.file_url IS 'V2: Primary file URL (auto-populated from V1 image_url columns)';
COMMENT ON COLUMN marketing_assets.tags IS 'V2: Searchable tags array';
COMMENT ON COLUMN marketing_assets.metadata IS 'V2: Additional metadata JSON';
