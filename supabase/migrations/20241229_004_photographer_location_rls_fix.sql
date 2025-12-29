-- =============================================
-- Photographer Location RLS Policy Fix
-- Fixes RLS policies that reference non-existent tables/columns
-- =============================================

-- Drop the problematic policies if they exist
DROP POLICY IF EXISTS "Staff can update own location" ON photographer_locations;
DROP POLICY IF EXISTS "Clients can view photographer location for their bookings" ON photographer_locations;
DROP POLICY IF EXISTS "Staff can view all locations" ON photographer_locations;

-- Recreate policy: Staff can update their own location
-- Uses email matching instead of auth_user_id (which may not be populated)
CREATE POLICY "Staff can update own location"
  ON photographer_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = photographer_locations.staff_id
      AND s.is_active = true
      AND (
        -- Match by auth_user_id if populated
        s.auth_user_id = auth.uid()
        OR
        -- Fallback to email matching
        LOWER(s.email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
      )
    )
  );

-- Recreate policy: Clients can view location for their bookings
-- Fixed: Use agent_id (which exists) instead of client_id (which doesn't)
-- The property owner (agent) can see the photographer location for their listing
CREATE POLICY "Agents can view photographer location for their listings"
  ON photographer_locations
  FOR SELECT
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE (
        -- Match by auth_user_id if populated
        a.auth_user_id = auth.uid()
        OR
        -- Fallback to email matching
        LOWER(a.email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
      )
    )
  );

-- Recreate policy: Staff can view all locations
CREATE POLICY "Staff can view all locations"
  ON photographer_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.is_active = true
      AND (
        s.auth_user_id = auth.uid()
        OR
        LOWER(s.email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
      )
    )
  );

-- Add a policy for service role to manage all locations
CREATE POLICY "Service role can manage all locations"
  ON photographer_locations
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE photographer_locations IS 'Real-time photographer location tracking. RLS policies allow staff to update their own location, agents to view location for their listings, and service role full access.';
