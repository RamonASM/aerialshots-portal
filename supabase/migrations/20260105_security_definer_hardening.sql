-- Security Definer Hardening
-- Made idempotent: 2026-01-07
-- Restrict SECURITY DEFINER functions and lock search_path to prevent hijacking

-- =============================================================================
-- Core RPCs - wrapped in existence checks
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'create_order_and_listing') THEN
    EXECUTE 'ALTER FUNCTION create_order_and_listing(
      uuid, text, text, text, text, jsonb,
      integer, integer, integer, integer,
      text, text, text, text, integer, integer, decimal,
      text, text, text, timestamptz, text, text, text
    ) SET search_path = public, auth';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter create_order_and_listing: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'deduct_agent_credits') THEN
    EXECUTE 'ALTER FUNCTION deduct_agent_credits(uuid, integer) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION deduct_agent_credits(uuid, integer) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION deduct_agent_credits(uuid, integer) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter deduct_agent_credits: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'record_credit_transaction') THEN
    EXECUTE 'ALTER FUNCTION record_credit_transaction(
      uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
    ) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION record_credit_transaction(
      uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
    ) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION record_credit_transaction(
      uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
    ) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter record_credit_transaction: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'check_sufficient_credits') THEN
    EXECUTE 'ALTER FUNCTION check_sufficient_credits(uuid, decimal) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION check_sufficient_credits(uuid, decimal) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION check_sufficient_credits(uuid, decimal) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter check_sufficient_credits: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'deduct_credits_for_order') THEN
    EXECUTE 'ALTER FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter deduct_credits_for_order: %', SQLERRM;
END $$;

-- =============================================================================
-- Render helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'get_resolved_template') THEN
    EXECUTE 'ALTER FUNCTION get_resolved_template(text) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION get_resolved_template(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_resolved_template(text) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter get_resolved_template: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'cleanup_render_cache') THEN
    EXECUTE 'ALTER FUNCTION cleanup_render_cache() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION cleanup_render_cache() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION cleanup_render_cache() TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter cleanup_render_cache: %', SQLERRM;
END $$;

-- =============================================================================
-- Seller portal helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'get_seller_portal_data') THEN
    EXECUTE 'ALTER FUNCTION get_seller_portal_data(text) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION get_seller_portal_data(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_seller_portal_data(text) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter get_seller_portal_data: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'check_seller_media_access') THEN
    EXECUTE 'ALTER FUNCTION check_seller_media_access(uuid, text) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION check_seller_media_access(uuid, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION check_seller_media_access(uuid, text) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter check_seller_media_access: %', SQLERRM;
END $$;

-- =============================================================================
-- Auth sync helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'sync_staff_auth_user_ids') THEN
    EXECUTE 'ALTER FUNCTION sync_staff_auth_user_ids() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION sync_staff_auth_user_ids() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION sync_staff_auth_user_ids() TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter sync_staff_auth_user_ids: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'sync_agent_auth_user_ids') THEN
    EXECUTE 'ALTER FUNCTION sync_agent_auth_user_ids() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION sync_agent_auth_user_ids() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION sync_agent_auth_user_ids() TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter sync_agent_auth_user_ids: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'auto_set_staff_auth_user_id') THEN
    EXECUTE 'ALTER FUNCTION auto_set_staff_auth_user_id() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION auto_set_staff_auth_user_id() FROM PUBLIC';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter auto_set_staff_auth_user_id: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'auto_set_agent_auth_user_id') THEN
    EXECUTE 'ALTER FUNCTION auto_set_agent_auth_user_id() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION auto_set_agent_auth_user_id() FROM PUBLIC';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter auto_set_agent_auth_user_id: %', SQLERRM;
END $$;

-- =============================================================================
-- Photographer location helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'update_photographer_location') THEN
    EXECUTE 'ALTER FUNCTION update_photographer_location(
      uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
    ) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION update_photographer_location(
      uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
    ) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION update_photographer_location(
      uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
    ) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter update_photographer_location: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'cleanup_stale_photographer_locations') THEN
    EXECUTE 'ALTER FUNCTION cleanup_stale_photographer_locations() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION cleanup_stale_photographer_locations() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION cleanup_stale_photographer_locations() TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter cleanup_stale_photographer_locations: %', SQLERRM;
END $$;

-- =============================================================================
-- Payout helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'acquire_payout_lock') THEN
    EXECUTE 'ALTER FUNCTION acquire_payout_lock(text, uuid) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION acquire_payout_lock(text, uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION acquire_payout_lock(text, uuid) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter acquire_payout_lock: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'complete_job_payouts') THEN
    EXECUTE 'ALTER FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter complete_job_payouts: %', SQLERRM;
END $$;

-- =============================================================================
-- Maintenance helpers
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
             WHERE n.nspname = 'public' AND p.proname = 'reset_api_key_monthly_usage') THEN
    EXECUTE 'ALTER FUNCTION reset_api_key_monthly_usage() SET search_path = public, auth';
    EXECUTE 'REVOKE ALL ON FUNCTION reset_api_key_monthly_usage() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION reset_api_key_monthly_usage() TO service_role';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter reset_api_key_monthly_usage: %', SQLERRM;
END $$;
