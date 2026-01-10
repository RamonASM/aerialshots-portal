-- Made idempotent: 2026-01-07
-- Migration: Partner Multi-Role Support
-- Enables partners to activate photographer/videographer/qc/va roles
-- with manual toggles and auto-detection when designated staff assigned

-- Add active_roles column (array of enabled roles)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS active_roles JSONB DEFAULT '[]'::jsonb;

-- Add designated_staff column (tracks assigned staff per role)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS designated_staff JSONB DEFAULT '{}'::jsonb;

-- Add override flags for when partner wants to work despite designated staff
ALTER TABLE partners ADD COLUMN IF NOT EXISTS role_overrides JSONB DEFAULT '{}'::jsonb;

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_partners_active_roles ON partners USING GIN (active_roles);

-- Comments for documentation
COMMENT ON COLUMN partners.active_roles IS 'Array of active roles: ["photographer", "videographer", "qc", "va"]';
COMMENT ON COLUMN partners.designated_staff IS 'Staff IDs assigned per role: {"photographer": "uuid", "videographer": null, "qc": "uuid", "va": null}';
COMMENT ON COLUMN partners.role_overrides IS 'Override flags when partner works despite designated staff: {"photographer": true}';
