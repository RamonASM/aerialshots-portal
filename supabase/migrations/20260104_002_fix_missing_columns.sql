-- Fix missing columns that weren't applied from previous migrations
-- Safe to run multiple times (uses IF NOT EXISTS)

-- 1. Add team_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
        CREATE TYPE team_role AS ENUM (
            'photographer',
            'videographer',
            'editor',
            'qc',
            'admin',
            'manager'
        );
    END IF;
END $$;

-- 2. Add team_role column to staff table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'staff' AND column_name = 'team_role'
    ) THEN
        ALTER TABLE staff ADD COLUMN team_role TEXT DEFAULT 'photographer';
    END IF;
END $$;

-- 3. Add media_url column to media_assets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media_assets' AND column_name = 'media_url'
    ) THEN
        ALTER TABLE media_assets ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- 4. Add processed_storage_path column to media_assets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media_assets' AND column_name = 'processed_storage_path'
    ) THEN
        ALTER TABLE media_assets ADD COLUMN processed_storage_path TEXT;
    END IF;
END $$;

-- 5. Add approved_storage_path column to media_assets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media_assets' AND column_name = 'approved_storage_path'
    ) THEN
        ALTER TABLE media_assets ADD COLUMN approved_storage_path TEXT;
    END IF;
END $$;

-- 6. Add storage_path column to media_assets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media_assets' AND column_name = 'storage_path'
    ) THEN
        ALTER TABLE media_assets ADD COLUMN storage_path TEXT;
    END IF;
END $$;

-- 7. Add comments
COMMENT ON COLUMN media_assets.media_url IS 'Native ASM storage URL (Supabase Storage)';
COMMENT ON COLUMN staff.team_role IS 'Team role for portal access';
