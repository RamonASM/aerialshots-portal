-- Agent Assets Storage Bucket
-- For agent profile images (headshots, logos)
-- Public read, authenticated write

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-assets',
  'agent-assets',
  true,  -- Public read for displaying profile images
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- AGENT-ASSETS BUCKET POLICIES
-- Public read, authenticated write
-- =============================================

-- Public read access for displaying profile images
DROP POLICY IF EXISTS "agent_assets_public_read" ON storage.objects;
CREATE POLICY "agent_assets_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'agent-assets');

-- Authenticated users can upload
DROP POLICY IF EXISTS "agent_assets_auth_insert" ON storage.objects;
CREATE POLICY "agent_assets_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agent-assets');

-- Authenticated users can update their uploads
DROP POLICY IF EXISTS "agent_assets_auth_update" ON storage.objects;
CREATE POLICY "agent_assets_auth_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'agent-assets');

-- Authenticated users can delete their uploads
DROP POLICY IF EXISTS "agent_assets_auth_delete" ON storage.objects;
CREATE POLICY "agent_assets_auth_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'agent-assets');

-- Service role has full access (for admin operations)
DROP POLICY IF EXISTS "agent_assets_service_all" ON storage.objects;
CREATE POLICY "agent_assets_service_all" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'agent-assets')
WITH CHECK (bucket_id = 'agent-assets');
