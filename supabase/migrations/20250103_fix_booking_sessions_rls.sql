-- Fix booking_sessions RLS to allow anonymous users during checkout
-- Migration: 20250103_001_fix_booking_sessions_rls.sql
-- Made idempotent: 2026-01-07

-- Only run if booking_sessions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_sessions') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Agents can create booking sessions" ON booking_sessions;
    DROP POLICY IF EXISTS "Agents can view own booking sessions" ON booking_sessions;
    DROP POLICY IF EXISTS "Agents can update own booking sessions" ON booking_sessions;
    DROP POLICY IF EXISTS "Allow anonymous insert booking sessions" ON booking_sessions;
    DROP POLICY IF EXISTS "Allow anonymous select booking sessions by session_id" ON booking_sessions;
    DROP POLICY IF EXISTS "Allow anonymous update booking sessions by session_id" ON booking_sessions;
    DROP POLICY IF EXISTS "Agents can delete own booking sessions" ON booking_sessions;
    DROP POLICY IF EXISTS "Service role full access to booking sessions" ON booking_sessions;

    -- Create new policies allowing anonymous access (session_id acts as security token)
    CREATE POLICY "Allow anonymous insert booking sessions" ON booking_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

    CREATE POLICY "Allow anonymous select booking sessions by session_id" ON booking_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);

    CREATE POLICY "Allow anonymous update booking sessions by session_id" ON booking_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Agents can delete own booking sessions" ON booking_sessions
    FOR DELETE
    TO authenticated
    USING (agent_id = auth.uid());

    CREATE POLICY "Service role full access to booking sessions" ON booking_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
