-- Fix partners table RLS policies
-- The original policy used `user_id = auth.uid()` which references Supabase Auth,
-- but we use Clerk for authentication. This caused RLS to block all partner queries.
--
-- Since we use createAdminClient() with service role key (bypasses RLS) for most
-- partner queries, these policies are mainly for security defense-in-depth.

-- Drop old RLS policy that uses user_id (which never gets populated with Clerk auth)
DROP POLICY IF EXISTS "Partners can view own record" ON partners;

-- Create new policy that works with Clerk authentication
-- Partners can view their own record via clerk_user_id
CREATE POLICY "Partners can view own record" ON partners
  FOR SELECT USING (
    clerk_user_id IS NOT NULL
    AND clerk_user_id = coalesce(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    )
  );

-- Keep existing policies for staff access (they use email lookup which works)
-- "Staff can view all partners" - uses auth.users email lookup
-- "Staff can update partners" - uses auth.users email lookup for admin check

-- Add policy for partners to update their own Stripe Connect fields
DROP POLICY IF EXISTS "Partners can update own connect fields" ON partners;
CREATE POLICY "Partners can update own connect fields" ON partners
  FOR UPDATE USING (
    clerk_user_id IS NOT NULL
    AND clerk_user_id = coalesce(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    )
  )
  WITH CHECK (
    clerk_user_id IS NOT NULL
    AND clerk_user_id = coalesce(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    )
  );

-- Note: The admin client (createAdminClient) uses service role key which bypasses
-- all RLS policies. These policies only affect direct client-side Supabase calls,
-- which we don't currently make for partners data.
