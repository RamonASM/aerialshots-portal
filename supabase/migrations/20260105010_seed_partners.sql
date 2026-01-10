-- Made idempotent: 2026-01-07
-- Seed initial partner records
-- These are the only emails allowed to be partners (per webhook config in /api/webhooks/clerk/route.ts)
--
-- CRITICAL: The partners table existed but was never seeded, causing partner login to fail.
-- The Clerk webhook only LINKS to existing partner records, it doesn't create them.
-- Without these records, partners are assigned role='agent' instead of 'partner'.

INSERT INTO partners (name, email, is_active)
VALUES
  ('Ramon', 'ramon@aerialshots.media', true),
  ('Alex', 'alex@aerialshots.media', true)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Also ensure the clerk_user_id column exists (for Clerk auth linking)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Create index for faster lookups by clerk_user_id
CREATE INDEX IF NOT EXISTS idx_partners_clerk_user_id ON partners(clerk_user_id);
