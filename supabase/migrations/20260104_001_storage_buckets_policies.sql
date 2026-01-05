-- Storage Buckets and Policies for ASM Portal
-- Run with: npx supabase db push

-- =============================================
-- CREATE STORAGE BUCKETS
-- =============================================

-- Virtual Staging bucket (public read for AI-generated staging images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'virtual-staging',
  'virtual-staging',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Media Assets bucket (public read for photos, videos, floor plans)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-assets',
  'media-assets',
  true,
  52428800, -- 50MB (Supabase plan limit)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Render Cache bucket (public read for carousel/template renders, auto-expire)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'render-cache',
  'render-cache',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Reference Files bucket (private, authenticated only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-files',
  'reference-files',
  false,
  52428800, -- 50MB (Supabase plan limit)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- VIRTUAL-STAGING BUCKET POLICIES
-- Public read, authenticated write
-- =============================================

DROP POLICY IF EXISTS "virtual_staging_public_read" ON storage.objects;
CREATE POLICY "virtual_staging_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'virtual-staging');

DROP POLICY IF EXISTS "virtual_staging_auth_insert" ON storage.objects;
CREATE POLICY "virtual_staging_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'virtual-staging');

DROP POLICY IF EXISTS "virtual_staging_auth_update" ON storage.objects;
CREATE POLICY "virtual_staging_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'virtual-staging');

DROP POLICY IF EXISTS "virtual_staging_auth_delete" ON storage.objects;
CREATE POLICY "virtual_staging_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'virtual-staging');

-- =============================================
-- MEDIA-ASSETS BUCKET POLICIES
-- Public read, authenticated write
-- =============================================

DROP POLICY IF EXISTS "media_assets_public_read" ON storage.objects;
CREATE POLICY "media_assets_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media-assets');

DROP POLICY IF EXISTS "media_assets_auth_insert" ON storage.objects;
CREATE POLICY "media_assets_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-assets');

DROP POLICY IF EXISTS "media_assets_auth_update" ON storage.objects;
CREATE POLICY "media_assets_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media-assets');

DROP POLICY IF EXISTS "media_assets_auth_delete" ON storage.objects;
CREATE POLICY "media_assets_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media-assets');

-- =============================================
-- RENDER-CACHE BUCKET POLICIES
-- Public read, authenticated write
-- =============================================

DROP POLICY IF EXISTS "render_cache_public_read" ON storage.objects;
CREATE POLICY "render_cache_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'render-cache');

DROP POLICY IF EXISTS "render_cache_auth_insert" ON storage.objects;
CREATE POLICY "render_cache_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'render-cache');

DROP POLICY IF EXISTS "render_cache_auth_update" ON storage.objects;
CREATE POLICY "render_cache_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'render-cache');

DROP POLICY IF EXISTS "render_cache_auth_delete" ON storage.objects;
CREATE POLICY "render_cache_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'render-cache');

-- =============================================
-- REFERENCE-FILES BUCKET POLICIES
-- Private - authenticated users only
-- =============================================

DROP POLICY IF EXISTS "reference_files_auth_select" ON storage.objects;
CREATE POLICY "reference_files_auth_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'reference-files');

DROP POLICY IF EXISTS "reference_files_auth_insert" ON storage.objects;
CREATE POLICY "reference_files_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reference-files');

DROP POLICY IF EXISTS "reference_files_auth_update" ON storage.objects;
CREATE POLICY "reference_files_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'reference-files');

DROP POLICY IF EXISTS "reference_files_auth_delete" ON storage.objects;
CREATE POLICY "reference_files_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'reference-files');
