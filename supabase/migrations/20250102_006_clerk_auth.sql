-- ============================================================================
-- Clerk Authentication Integration
-- Adds clerk_user_id columns for user synchronization
-- ============================================================================

-- Add Clerk user ID to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Add Clerk user ID to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Add Clerk user ID to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Add enabled_skills for partner skill toggling
ALTER TABLE staff ADD COLUMN IF NOT EXISTS enabled_skills TEXT[] DEFAULT '{}';

-- ============================================================================
-- Sellers table (Agent's clients - homeowners/sellers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  clerk_user_id TEXT UNIQUE,
  access_level TEXT DEFAULT 'delivery', -- 'delivery', 'full'
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Clerk user ID lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agents_clerk_user_id ON agents(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_clerk_user_id ON staff(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_clerk_user_id ON partners(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_clerk_user_id ON sellers(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
CREATE INDEX IF NOT EXISTS idx_sellers_listing_id ON sellers(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_enabled_skills ON staff USING GIN(enabled_skills);

-- ============================================================================
-- RLS Policies for sellers
-- ============================================================================
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own record
CREATE POLICY "Sellers can view own record" ON sellers
  FOR SELECT
  USING (
    clerk_user_id = (
      SELECT au.raw_user_meta_data->>'clerk_user_id'
      FROM auth.users au
      WHERE au.id = auth.uid()
    )
  );

-- Agents can view their sellers
CREATE POLICY "Agents can view their sellers" ON sellers
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Agents can create/update their sellers
CREATE POLICY "Agents can manage their sellers" ON sellers
  FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Staff can view all sellers
CREATE POLICY "Staff can view all sellers" ON sellers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.is_active = true
    )
  );

-- ============================================================================
-- Updated At Trigger for sellers
-- ============================================================================
DROP TRIGGER IF EXISTS sellers_updated_at ON sellers;
CREATE TRIGGER sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper function to get user role from Clerk ID
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role_by_clerk_id(p_clerk_user_id TEXT)
RETURNS TABLE (
  role TEXT,
  user_table TEXT,
  user_id UUID
) AS $$
BEGIN
  -- Check if partner
  RETURN QUERY
  SELECT 'partner'::TEXT, 'partners'::TEXT, p.id
  FROM partners p
  WHERE p.clerk_user_id = p_clerk_user_id
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Check if staff
  RETURN QUERY
  SELECT s.role, 'staff'::TEXT, s.id
  FROM staff s
  WHERE s.clerk_user_id = p_clerk_user_id
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Check if agent
  RETURN QUERY
  SELECT 'agent'::TEXT, 'agents'::TEXT, a.id
  FROM agents a
  WHERE a.clerk_user_id = p_clerk_user_id
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Check if seller
  RETURN QUERY
  SELECT 'seller'::TEXT, 'sellers'::TEXT, sl.id
  FROM sellers sl
  WHERE sl.clerk_user_id = p_clerk_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
