-- Made idempotent: 2026-01-07
-- =============================================
-- Auth User ID Fix Migration
-- Adds missing auth_user_id columns to staff and agents tables
-- Required for RLS policies to work correctly
-- =============================================

-- Add auth_user_id to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Add auth_user_id to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_agents_auth_user_id ON agents(auth_user_id);

-- Function to sync auth_user_id from auth.users based on email
-- Run this manually after migration to populate existing records:
-- SELECT sync_staff_auth_user_ids();
-- SELECT sync_agent_auth_user_ids();

CREATE OR REPLACE FUNCTION sync_staff_auth_user_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE staff s
  SET auth_user_id = u.id
  FROM auth.users u
  WHERE LOWER(s.email) = LOWER(u.email)
  AND s.auth_user_id IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sync_agent_auth_user_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents a
  SET auth_user_id = u.id
  FROM auth.users u
  WHERE LOWER(a.email) = LOWER(u.email)
  AND a.auth_user_id IS NULL;
END;
$$;

-- Trigger to auto-set auth_user_id when staff logs in
CREATE OR REPLACE FUNCTION auto_set_staff_auth_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update staff record with auth user id when they log in
  UPDATE staff
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
  AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set auth_user_id when agent logs in
CREATE OR REPLACE FUNCTION auto_set_agent_auth_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update agent record with auth user id when they log in
  UPDATE agents
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
  AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers on auth.users require superuser access in Supabase
-- Instead, we'll sync on login via the auth callback
-- The sync functions above can be called from the auth callback route

COMMENT ON COLUMN staff.auth_user_id IS 'Links to auth.users for RLS policies';
COMMENT ON COLUMN agents.auth_user_id IS 'Links to auth.users for RLS policies';
