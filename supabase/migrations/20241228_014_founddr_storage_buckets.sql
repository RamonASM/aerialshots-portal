-- Phase 6: FoundDR Storage Buckets
-- Storage buckets for HDR processing pipeline
-- Version: 1.0.0
-- Date: 2024-12-28

-- =====================
-- CREATE STORAGE BUCKETS
-- =====================

-- Bucket for staged photos (raw uploads from photographers)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staged-photos',
  'staged-photos',
  FALSE,
  104857600, -- 100MB limit for RAW files
  ARRAY['image/x-sony-arw', 'image/x-canon-cr2', 'image/x-canon-cr3', 'image/x-nikon-nef', 'image/x-adobe-dng', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for processed photos (after FoundDR HDR processing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed-photos',
  'processed-photos',
  FALSE,
  52428800, -- 50MB limit for processed JPEGs
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/tiff']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for edited photos (after QC edits/inpainting)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edited-photos',
  'edited-photos',
  FALSE,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/tiff']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for approved photos (final delivery)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'approved-photos',
  'approved-photos',
  TRUE, -- Public for agent portal access
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for Lightroom exports (temporary bridge storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lightroom-exports',
  'lightroom-exports',
  FALSE,
  209715200, -- 200MB for high-res exports
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'application/zip']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for inpainting masks (temporary)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inpainting-masks',
  'inpainting-masks',
  FALSE,
  10485760, -- 10MB for mask images
  ARRAY['image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================
-- STORAGE POLICIES
-- =====================

-- STAGED-PHOTOS: Staff can upload, read, delete
CREATE POLICY "Staff can upload staged photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'staged-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

CREATE POLICY "Staff can read staged photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'staged-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

CREATE POLICY "Staff can delete staged photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'staged-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- PROCESSED-PHOTOS: Service role can write (from FoundDR), staff can read
CREATE POLICY "Staff can read processed photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'processed-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- EDITED-PHOTOS: Staff can manage
CREATE POLICY "Staff can manage edited photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'edited-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'edited-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- APPROVED-PHOTOS: Public read, staff can write
CREATE POLICY "Anyone can read approved photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'approved-photos');

CREATE POLICY "Staff can upload approved photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'approved-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

CREATE POLICY "Staff can delete approved photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'approved-photos' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- LIGHTROOM-EXPORTS: Staff only
CREATE POLICY "Staff can manage lightroom exports"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lightroom-exports' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'lightroom-exports' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- INPAINTING-MASKS: Staff only
CREATE POLICY "Staff can manage inpainting masks"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'inpainting-masks' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'inpainting-masks' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id::text = auth.uid()::text)
);

-- =====================
-- COMMENTS
-- =====================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for FoundDR processing pipeline';
