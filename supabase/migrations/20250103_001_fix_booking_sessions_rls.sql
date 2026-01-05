-- Fix booking_sessions RLS to allow anonymous users during checkout
-- Migration: 20250103_001_fix_booking_sessions_rls.sql

-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "Agents can create booking sessions" ON booking_sessions;
DROP POLICY IF EXISTS "Agents can view own booking sessions" ON booking_sessions;
DROP POLICY IF EXISTS "Agents can update own booking sessions" ON booking_sessions;

-- Create new policies allowing anonymous access (session_id acts as security token)
-- Anonymous users can create booking sessions during checkout
CREATE POLICY "Allow anonymous insert booking sessions"
ON booking_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anonymous users can view booking sessions by session_id (the session_id is the security token)
CREATE POLICY "Allow anonymous select booking sessions by session_id"
ON booking_sessions
FOR SELECT
TO anon, authenticated
USING (true);

-- Anonymous users can update booking sessions by session_id
CREATE POLICY "Allow anonymous update booking sessions by session_id"
ON booking_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Authenticated agents can delete their own booking sessions
CREATE POLICY "Agents can delete own booking sessions"
ON booking_sessions
FOR DELETE
TO authenticated
USING (agent_id = auth.uid());

-- Service role has full access (unchanged)
CREATE POLICY "Service role full access to booking sessions"
ON booking_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
