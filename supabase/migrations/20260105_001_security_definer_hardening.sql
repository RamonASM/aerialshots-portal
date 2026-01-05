-- Security Definer Hardening
-- Restrict SECURITY DEFINER functions and lock search_path to prevent hijacking

-- =============================================================================
-- Core RPCs
-- =============================================================================

ALTER FUNCTION create_order_and_listing(
  uuid, text, text, text, text, jsonb,
  integer, integer, integer, integer,
  text, text, text, text, integer, integer, decimal,
  text, text, text, timestamptz, text, text, text
) SET search_path = public, auth;
REVOKE ALL ON FUNCTION create_order_and_listing(
  uuid, text, text, text, text, jsonb,
  integer, integer, integer, integer,
  text, text, text, text, integer, integer, decimal,
  text, text, text, timestamptz, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_and_listing(
  uuid, text, text, text, text, jsonb,
  integer, integer, integer, integer,
  text, text, text, text, integer, integer, decimal,
  text, text, text, timestamptz, text, text, text
) TO service_role;

ALTER FUNCTION deduct_agent_credits(uuid, integer) SET search_path = public, auth;
REVOKE ALL ON FUNCTION deduct_agent_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_agent_credits(uuid, integer) TO service_role;

ALTER FUNCTION record_credit_transaction(
  uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
) SET search_path = public, auth;
REVOKE ALL ON FUNCTION record_credit_transaction(
  uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_credit_transaction(
  uuid, text, decimal, text, uuid, text, text, uuid, text, uuid, text
) TO service_role;

ALTER FUNCTION check_sufficient_credits(uuid, decimal) SET search_path = public, auth;
REVOKE ALL ON FUNCTION check_sufficient_credits(uuid, decimal) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_sufficient_credits(uuid, decimal) TO service_role;

ALTER FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) SET search_path = public, auth;
REVOKE ALL ON FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deduct_credits_for_order(uuid, uuid, decimal, text, text) TO service_role;

-- =============================================================================
-- Render helpers
-- =============================================================================

ALTER FUNCTION get_resolved_template(text) SET search_path = public, auth;
REVOKE ALL ON FUNCTION get_resolved_template(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_resolved_template(text) TO service_role;

ALTER FUNCTION cleanup_render_cache() SET search_path = public, auth;
REVOKE ALL ON FUNCTION cleanup_render_cache() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_render_cache() TO service_role;

-- =============================================================================
-- Seller portal helpers
-- =============================================================================

ALTER FUNCTION get_seller_portal_data(text) SET search_path = public, auth;
REVOKE ALL ON FUNCTION get_seller_portal_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_seller_portal_data(text) TO service_role;

ALTER FUNCTION check_seller_media_access(uuid, text) SET search_path = public, auth;
REVOKE ALL ON FUNCTION check_seller_media_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_seller_media_access(uuid, text) TO service_role;

-- =============================================================================
-- Auth sync helpers
-- =============================================================================

ALTER FUNCTION sync_staff_auth_user_ids() SET search_path = public, auth;
REVOKE ALL ON FUNCTION sync_staff_auth_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_staff_auth_user_ids() TO service_role;

ALTER FUNCTION sync_agent_auth_user_ids() SET search_path = public, auth;
REVOKE ALL ON FUNCTION sync_agent_auth_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sync_agent_auth_user_ids() TO service_role;

ALTER FUNCTION auto_set_staff_auth_user_id() SET search_path = public, auth;
REVOKE ALL ON FUNCTION auto_set_staff_auth_user_id() FROM PUBLIC;

ALTER FUNCTION auto_set_agent_auth_user_id() SET search_path = public, auth;
REVOKE ALL ON FUNCTION auto_set_agent_auth_user_id() FROM PUBLIC;

-- =============================================================================
-- Photographer location helpers
-- =============================================================================

ALTER FUNCTION update_photographer_location(
  uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
) SET search_path = public, auth;
REVOKE ALL ON FUNCTION update_photographer_location(
  uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_photographer_location(
  uuid, uuid, decimal, decimal, decimal, decimal, decimal, text, integer
) TO service_role;

ALTER FUNCTION cleanup_stale_photographer_locations() SET search_path = public, auth;
REVOKE ALL ON FUNCTION cleanup_stale_photographer_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_stale_photographer_locations() TO service_role;

-- =============================================================================
-- Payout helpers
-- =============================================================================

ALTER FUNCTION acquire_payout_lock(text, uuid) SET search_path = public, auth;
REVOKE ALL ON FUNCTION acquire_payout_lock(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acquire_payout_lock(text, uuid) TO service_role;

ALTER FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) SET search_path = public, auth;
REVOKE ALL ON FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_job_payouts(text, uuid, jsonb, jsonb, jsonb) TO service_role;

-- =============================================================================
-- Maintenance helpers
-- =============================================================================

ALTER FUNCTION reset_api_key_monthly_usage() SET search_path = public, auth;
REVOKE ALL ON FUNCTION reset_api_key_monthly_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_api_key_monthly_usage() TO service_role;
