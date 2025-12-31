-- ============================================================================
-- CRITICAL SECURITY FIX: Enable Row Level Security on ALL tables
-- ============================================================================
--
-- ISSUE: 330 RLS policies were defined but NO tables had RLS enabled.
-- This meant all authenticated users could access ALL data.
--
-- This migration enables RLS on every table in the database.
-- Existing policies will now be enforced.
--
-- Date: January 1, 2025
-- ============================================================================

-- Core Tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_mls_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skill_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_slack_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tips ENABLE ROW LEVEL SECURITY;

-- AI/Automation Tables
ALTER TABLE ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_execution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workflow_templates ENABLE ROW LEVEL SECURITY;

-- Airspace & Location Tables
ALTER TABLE airspace_checks ENABLE ROW LEVEL SECURITY;

-- Amenity Tables
ALTER TABLE amenity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_amenities ENABLE ROW LEVEL SECURITY;

-- Analytics Tables
ALTER TABLE analytics_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_geographic ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_realtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_benchmarks ENABLE ROW LEVEL SECURITY;

-- API Tables
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

-- Booking & Scheduling Tables
ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reference_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

-- Business Settings
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Calendar Tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_log ENABLE ROW LEVEL SECURITY;

-- Campaign Tables
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Canva/Integration OAuth
ALTER TABLE canva_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

-- Care/Support Tables
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;

-- Carousel Tables
ALTER TABLE carousel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_carousels ENABLE ROW LEVEL SECURITY;

-- Client Tables
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Communication Tables
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Community Tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Content/Retainer Tables
ALTER TABLE content_retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_videos ENABLE ROW LEVEL SECURITY;

-- Coupon Tables
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Credit Tables
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage_rates ENABLE ROW LEVEL SECURITY;

-- Curated Content Tables
ALTER TABLE curated_items ENABLE ROW LEVEL SECURITY;

-- Drip Campaign Tables
ALTER TABLE drip_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;

-- Route Tables
ALTER TABLE daily_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_time_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Delivery Tables
ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Dropbox Integration
ALTER TABLE dropbox_folder_monitors ENABLE ROW LEVEL SECURITY;

-- Edit Request Tables
ALTER TABLE edit_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Editor Tables
ALTER TABLE editor_assignments ENABLE ROW LEVEL SECURITY;

-- Email Tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Invoice Tables
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Processing Tables
ALTER TABLE inpainting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lightroom_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_sessions ENABLE ROW LEVEL SECURITY;

-- Instagram Tables
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_embed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Integration Tables
ALTER TABLE integration_jobs ENABLE ROW LEVEL SECURITY;

-- Job Tables
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_time_logs ENABLE ROW LEVEL SECURITY;

-- Lead Tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Listing Tables
ALTER TABLE listing_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_skill_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Loyalty Tables
ALTER TABLE low_balance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_card_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;

-- Marketing Tables
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lists ENABLE ROW LEVEL SECURITY;

-- Media Tables
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Merged Orders
ALTER TABLE merged_orders ENABLE ROW LEVEL SECURITY;

-- MLS Tables
ALTER TABLE mls_providers ENABLE ROW LEVEL SECURITY;

-- Notification Tables
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Offline Tables
ALTER TABLE offline_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_actions ENABLE ROW LEVEL SECURITY;

-- Open House Tables
ALTER TABLE open_house_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_houses ENABLE ROW LEVEL SECURITY;

-- Activity Log Tables
ALTER TABLE ops_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_activity_log ENABLE ROW LEVEL SECURITY;

-- Order Tables
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Package Tables
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;

-- Payment Tables
ALTER TABLE payment_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- Photographer Tables
ALTER TABLE photographer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_specialties ENABLE ROW LEVEL SECURITY;

-- Portal Tables
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Portfolio Tables
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Pricing Tables
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_tiers ENABLE ROW LEVEL SECURITY;

-- QR Code Tables
ALTER TABLE qr_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Realtime Tables
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Redemption Tables
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Referral Tables
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Reschedule Tables
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Review Tables
ALTER TABLE review_request_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

-- Seller Tables
ALTER TABLE seller_access_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_schedules ENABLE ROW LEVEL SECURITY;

-- Service Tables
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Share Tables
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Skill Tables
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_usage ENABLE ROW LEVEL SECURITY;

-- Slack Tables
ALTER TABLE slack_workspaces ENABLE ROW LEVEL SECURITY;

-- Social Tables
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;

-- Staff Tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_territories ENABLE ROW LEVEL SECURITY;

-- Storage Tables
ALTER TABLE storage_buckets_config ENABLE ROW LEVEL SECURITY;

-- Storywork Tables
ALTER TABLE storywork_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_users ENABLE ROW LEVEL SECURITY;

-- Task Tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Team Tables
ALTER TABLE team_capabilities ENABLE ROW LEVEL SECURITY;

-- Template Tables
ALTER TABLE template_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Unified User Tables
ALTER TABLE unified_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_users ENABLE ROW LEVEL SECURITY;

-- Video Tables
ALTER TABLE video_previews ENABLE ROW LEVEL SECURITY;

-- Webhook Tables
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Zapier Tables
ALTER TABLE zapier_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification Query (run after migration to confirm)
-- ============================================================================
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ============================================================================
-- ============================================================================
-- Test Accounts for E2E Testing
-- ============================================================================
-- Creates test accounts for each role to enable end-to-end testing.
-- These accounts use @test.aerialshots.media domain for easy identification.
--
-- IMPORTANT: These accounts are for testing only.
-- In production, you may want to skip this migration or delete these accounts.
-- ============================================================================

-- ============================================================================
-- Test Agent Account
-- ============================================================================
INSERT INTO agents (
  id,
  name,
  email,
  phone,
  brokerage,
  license_number,
  bio,
  headshot_url,
  credits,
  tier,
  is_active,
  slug
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Test Agent',
  'agent@test.aerialshots.media',
  '555-100-0001',
  'Test Brokerage Inc',
  'TEST-AGENT-001',
  'Test agent account for E2E testing',
  NULL,
  1000,
  'gold',
  true,
  'test-agent'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Test Staff Accounts (Photographer, Editor, Videographer, QC)
-- ============================================================================
INSERT INTO staff (
  id,
  auth_user_id,
  name,
  email,
  phone,
  role,
  is_active,
  hire_date
) VALUES
  -- Photographer
  (
    'b0000000-0000-0000-0000-000000000001',
    NULL,
    'Test Photographer',
    'photographer@test.aerialshots.media',
    '555-200-0001',
    'photographer',
    true,
    CURRENT_DATE
  ),
  -- Editor
  (
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    'Test Editor',
    'editor@test.aerialshots.media',
    '555-200-0002',
    'editor',
    true,
    CURRENT_DATE
  ),
  -- Videographer
  (
    'b0000000-0000-0000-0000-000000000003',
    NULL,
    'Test Videographer',
    'videographer@test.aerialshots.media',
    '555-200-0003',
    'videographer',
    true,
    CURRENT_DATE
  ),
  -- QC Staff
  (
    'b0000000-0000-0000-0000-000000000004',
    NULL,
    'Test QC Reviewer',
    'qc@test.aerialshots.media',
    '555-200-0004',
    'qc',
    true,
    CURRENT_DATE
  ),
  -- Admin
  (
    'b0000000-0000-0000-0000-000000000005',
    NULL,
    'Test Admin',
    'admin@test.aerialshots.media',
    '555-200-0005',
    'admin',
    true,
    CURRENT_DATE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Test Listing
-- ============================================================================
INSERT INTO listings (
  id,
  agent_id,
  address,
  city,
  state,
  zip,
  sqft,
  bedrooms,
  bathrooms,
  price,
  status,
  ops_status,
  mls_number,
  template_id
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '123 Test Street',
  'Orlando',
  'FL',
  '32801',
  2500,
  4,
  3,
  450000,
  'active',
  'pending',
  'TEST-MLS-001',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  address = EXCLUDED.address,
  status = EXCLUDED.status;

-- ============================================================================
-- Test Order
-- ============================================================================
INSERT INTO orders (
  id,
  contact_name,
  contact_email,
  contact_phone,
  property_address,
  property_city,
  property_state,
  property_zip,
  property_sqft,
  service_type,
  package_key,
  package_name,
  subtotal_cents,
  total_cents,
  status,
  payment_status,
  source,
  agent_id,
  listing_id
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Test Agent',
  'agent@test.aerialshots.media',
  '555-100-0001',
  '123 Test Street',
  'Orlando',
  'FL',
  '32801',
  2500,
  'listing',
  'signature',
  'Signature',
  52900,
  52900,
  'paid',
  'succeeded',
  'e2e_test',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status;

-- ============================================================================
-- Test Photographer Assignment
-- ============================================================================
INSERT INTO photographer_assignments (
  id,
  photographer_id,
  listing_id,
  scheduled_at,
  status
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  NOW() + INTERVAL '2 days',
  'confirmed'
) ON CONFLICT (id) DO UPDATE SET
  scheduled_at = EXCLUDED.scheduled_at,
  status = EXCLUDED.status;

-- ============================================================================
-- Test Community
-- ============================================================================
INSERT INTO communities (
  id,
  name,
  slug,
  description,
  city,
  state,
  latitude,
  longitude,
  is_active
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'Test Community',
  'test-community',
  'A test community for E2E testing',
  'Orlando',
  'FL',
  28.5383,
  -81.3792,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- Test Service Availability (next 7 days)
-- ============================================================================
INSERT INTO service_availability (date, total_slots, booked_slots, blocked_slots, morning_available, afternoon_available, evening_available, is_peak, price_modifier)
SELECT
  generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, INTERVAL '1 day')::DATE,
  6,
  0,
  0,
  TRUE,
  TRUE,
  FALSE,
  EXTRACT(DOW FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, INTERVAL '1 day')) IN (0, 6),
  1.00
ON CONFLICT (date) DO NOTHING;

-- ============================================================================
-- Test Booking Time Slots (next 3 days, 9 AM - 5 PM)
-- ============================================================================
INSERT INTO booking_time_slots (date, start_time, end_time, status, duration_minutes)
SELECT
  d::DATE,
  t::TIME,
  (t + INTERVAL '2 hours')::TIME,
  'available',
  120
FROM
  generate_series(CURRENT_DATE + 1, CURRENT_DATE + 3, INTERVAL '1 day') d,
  generate_series('09:00'::TIME, '15:00'::TIME, INTERVAL '2 hours') t
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE agents IS 'Test agent: agent@test.aerialshots.media';
