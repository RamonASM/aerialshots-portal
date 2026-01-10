-- Made idempotent: 2026-01-07
-- Add Clerk user ID columns if they don't exist
-- This migration adds the required columns for Clerk authentication

ALTER TABLE agents ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS enabled_skills TEXT[] DEFAULT '{}';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_agents_clerk_user_id ON agents(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_clerk_user_id ON staff(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_clerk_user_id ON partners(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- Create sellers table if not exists
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  clerk_user_id TEXT UNIQUE,
  access_level TEXT DEFAULT 'delivery',
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS to sellers if needed
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Create indexes for sellers
CREATE INDEX IF NOT EXISTS idx_sellers_clerk_user_id ON sellers(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
