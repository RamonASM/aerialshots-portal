-- Native Media Storage Migration
-- Replaces Aryeo CDN with Supabase Storage
-- Part of the ASM Delivery Platform migration

-- ============================================================================
-- 1. Add media_url column to media_assets table
-- ============================================================================

-- Add media_url column (native storage URL)
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add storage_bucket column to track which bucket the file is in
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

-- Add migration_status to track Aryeo->native migration
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS migration_status TEXT DEFAULT 'pending'
CHECK (migration_status IN ('pending', 'migrating', 'completed', 'failed'));

-- Add migrated_at timestamp
ALTER TABLE media_assets
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- Make aryeo_url nullable for the transition period
-- (Will be dropped after all media is migrated)
ALTER TABLE media_assets
ALTER COLUMN aryeo_url DROP NOT NULL;

-- Add comment explaining the transition
COMMENT ON COLUMN media_assets.aryeo_url IS 'DEPRECATED: Legacy Aryeo CDN URL. Being replaced by media_url.';
COMMENT ON COLUMN media_assets.media_url IS 'Native ASM storage URL (Supabase Storage)';
COMMENT ON COLUMN media_assets.migration_status IS 'Status of migration from Aryeo to native storage';

-- ============================================================================
-- 2. Create indexes for efficient querying
-- ============================================================================

-- Index on migration status for batch migration jobs
CREATE INDEX IF NOT EXISTS idx_media_assets_migration_status
ON media_assets(migration_status)
WHERE migration_status != 'completed';

-- Index on listing_id + type for delivery page queries
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_type
ON media_assets(listing_id, type);

-- ============================================================================
-- 3. Create media_uploads table for tracking uploads
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,

  -- Storage info
  bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,

  -- Media classification
  media_type TEXT NOT NULL CHECK (media_type IN (
    'photo', 'video', 'floor_plan', 'document',
    'virtual_staging', 'drone', 'twilight', '3d_tour', 'matterport'
  )),
  category TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Image dimensions (for photos)
  width INTEGER,
  height INTEGER,

  -- Audit
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on storage path
  CONSTRAINT unique_storage_path UNIQUE (bucket, storage_path)
);

-- RLS policies for media_uploads
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Staff can manage all uploads
CREATE POLICY "Staff can manage all uploads"
ON media_uploads
FOR ALL
USING (
  auth.jwt() ->> 'email' LIKE '%@aerialshots.media'
);

-- Agents can view their own listing uploads
CREATE POLICY "Agents can view own listing uploads"
ON media_uploads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = media_uploads.listing_id
    AND listings.agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  )
);

-- Index for fast listing lookups
CREATE INDEX IF NOT EXISTS idx_media_uploads_listing_id
ON media_uploads(listing_id);

-- Index for type-based queries
CREATE INDEX IF NOT EXISTS idx_media_uploads_media_type
ON media_uploads(media_type);

-- ============================================================================
-- 4. Create storage_buckets_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_buckets_config (
  bucket_name TEXT PRIMARY KEY,
  media_type TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  max_file_size_bytes BIGINT NOT NULL,
  allowed_mime_types TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert bucket configurations
INSERT INTO storage_buckets_config (bucket_name, media_type, is_public, max_file_size_bytes, allowed_mime_types)
VALUES
  ('listing-photos', 'photo', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff']),
  ('listing-videos', 'video', true, 2147483648, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('floor-plans', 'floor_plan', true, 104857600, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml']),
  ('listing-documents', 'document', false, 52428800, ARRAY['application/pdf', 'text/plain', 'application/msword']),
  ('virtual-staging', 'virtual_staging', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('drone-media', 'drone', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff']),
  ('twilight-photos', 'twilight', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('3d-tours', '3d_tour', true, 524288000, ARRAY['application/octet-stream', 'model/gltf-binary', 'model/gltf+json']),
  ('matterport-tours', 'matterport', true, 524288000, ARRAY['application/json', 'text/html']),
  ('listing-media', 'other', true, 52428800, ARRAY['image/jpeg', 'image/png', 'video/mp4']),
  ('edited-photos', 'photo', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('booking-attachments', 'document', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'text/plain'])
ON CONFLICT (bucket_name) DO NOTHING;

-- ============================================================================
-- 5. Create media_migration_jobs table for batch migration tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job info
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- Scope
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  media_type TEXT,

  -- Progress
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Error tracking
  error_log JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Who triggered the job
  triggered_by UUID REFERENCES auth.users(id)
);

-- RLS policies
ALTER TABLE media_migration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage migration jobs"
ON media_migration_jobs
FOR ALL
USING (
  auth.jwt() ->> 'email' LIKE '%@aerialshots.media'
);

-- ============================================================================
-- 6. Helper function to get media URL (prefers native, falls back to Aryeo)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_media_url(asset media_assets)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Prefer native storage URL if available
  IF asset.media_url IS NOT NULL AND asset.media_url != '' THEN
    RETURN asset.media_url;
  END IF;

  -- Fall back to processed storage path
  IF asset.approved_storage_path IS NOT NULL THEN
    RETURN asset.approved_storage_path;
  END IF;

  IF asset.processed_storage_path IS NOT NULL THEN
    RETURN asset.processed_storage_path;
  END IF;

  -- Fall back to legacy Aryeo URL
  RETURN asset.aryeo_url;
END;
$$;

-- ============================================================================
-- 7. View for media with resolved URLs
-- ============================================================================

CREATE OR REPLACE VIEW media_assets_resolved AS
SELECT
  ma.*,
  get_media_url(ma) AS resolved_url,
  CASE
    WHEN ma.media_url IS NOT NULL THEN 'native'
    WHEN ma.approved_storage_path IS NOT NULL THEN 'processed'
    WHEN ma.aryeo_url IS NOT NULL THEN 'aryeo'
    ELSE 'missing'
  END AS url_source
FROM media_assets ma;

-- ============================================================================
-- 8. Function to migrate a single media asset from Aryeo
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_media_migrated(
  p_media_id UUID,
  p_new_url TEXT,
  p_bucket TEXT,
  p_storage_path TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE media_assets
  SET
    media_url = p_new_url,
    storage_bucket = p_bucket,
    storage_path = p_storage_path,
    migration_status = 'completed',
    migrated_at = NOW()
  WHERE id = p_media_id;
END;
$$;

-- ============================================================================
-- 9. Stats function for migration progress
-- ============================================================================

CREATE OR REPLACE FUNCTION get_migration_stats()
RETURNS TABLE (
  total_assets BIGINT,
  migrated BIGINT,
  pending BIGINT,
  failed BIGINT,
  migration_percent NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) AS total_assets,
    COUNT(*) FILTER (WHERE migration_status = 'completed') AS migrated,
    COUNT(*) FILTER (WHERE migration_status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE migration_status = 'failed') AS failed,
    ROUND(
      (COUNT(*) FILTER (WHERE migration_status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS migration_percent
  FROM media_assets;
$$;

-- ============================================================================
-- Done
-- ============================================================================

COMMENT ON TABLE media_uploads IS 'Tracks all media uploads to native ASM storage (Supabase Storage)';
COMMENT ON TABLE storage_buckets_config IS 'Configuration for storage buckets including size limits and allowed MIME types';
COMMENT ON TABLE media_migration_jobs IS 'Tracks batch migration jobs from Aryeo to native storage';
