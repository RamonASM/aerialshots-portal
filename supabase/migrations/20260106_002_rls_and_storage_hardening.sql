-- ============================================================================
-- RLS & Storage hardening
-- - Fix legacy policies that referenced the removed user_id columns
-- - Tighten storage bucket access to staff/service-role only
-- - Introduce RLS for the remaining config tables and harden staff access
-- ============================================================================

-- ============================================================================
-- 1. Fix policies that referenced user_id instead of auth_user_id
-- ============================================================================

-- Sellers policies must use auth_user_id for agents and staff lookups
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view their sellers" ON sellers;
DROP POLICY IF EXISTS "Agents can manage their sellers" ON sellers;
DROP POLICY IF EXISTS "Staff can view all sellers" ON sellers;

CREATE POLICY "Agents can view their sellers" ON sellers
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can manage their sellers" ON sellers
  FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all sellers" ON sellers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Team territory policies should also use auth_user_id
DROP POLICY IF EXISTS "Admin full access to territories" ON service_territories;
DROP POLICY IF EXISTS "Staff can view territories" ON service_territories;
DROP POLICY IF EXISTS "Admin full access to staff_territories" ON staff_territories;
DROP POLICY IF EXISTS "Staff can view staff_territories" ON staff_territories;

CREATE POLICY "Admin full access to territories" ON service_territories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Staff can view territories" ON service_territories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admin full access to staff_territories" ON staff_territories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Staff can view staff_territories" ON staff_territories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Render cache staff policies should use auth_user_id
DROP POLICY IF EXISTS "Staff can view all render cache" ON render_cache;
DROP POLICY IF EXISTS "Staff can insert all render cache" ON render_cache;

CREATE POLICY "Staff can view all render cache" ON render_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'photographer', 'videographer', 'qc')
    )
  );

CREATE POLICY "Staff can insert all render cache" ON render_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'photographer', 'videographer', 'qc')
    )
  );

-- Payout idempotency needs auth_user_id
DROP POLICY IF EXISTS "Staff can view payout idempotency" ON payout_idempotency;

CREATE POLICY "Staff can view payout idempotency" ON payout_idempotency
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'qc')
      AND is_active = true
    )
  );

-- Stripe sync log policies should reuse auth_user_id
DROP POLICY IF EXISTS "Staff can view sync logs" ON stripe_sync_log;
DROP POLICY IF EXISTS "Admin can create sync logs" ON stripe_sync_log;

CREATE POLICY "Staff can view sync logs" ON stripe_sync_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admin can create sync logs" ON stripe_sync_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Mobile realtime staff policies also need auth_user_id checks
DROP POLICY IF EXISTS "Staff can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Staff can manage notification history" ON push_notification_history;

CREATE POLICY "Staff can view all presence" ON user_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Staff can manage notification history" ON push_notification_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Advanced features policies with agents/staff lookups also moved to auth_user_id
DROP POLICY IF EXISTS "Agents can view their listing associations" ON listing_customers;
DROP POLICY IF EXISTS "Staff can manage listing customers" ON listing_customers;
DROP POLICY IF EXISTS "Staff can manage video previews" ON video_previews;
DROP POLICY IF EXISTS "Agents can view their video previews" ON video_previews;
DROP POLICY IF EXISTS "Staff can manage merged orders" ON merged_orders;

CREATE POLICY "Agents can view their listing associations" ON listing_customers
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage listing customers" ON listing_customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage video previews" ON video_previews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can view their video previews" ON video_previews
  FOR SELECT
  TO authenticated
  USING (
    media_asset_id IN (
      SELECT ma.id FROM media_assets ma
      JOIN listings l ON ma.listing_id = l.id
      WHERE l.agent_id IN (
        SELECT id FROM agents WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage merged orders" ON merged_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Integrations policies depend on auth_user_id as well
DROP POLICY IF EXISTS "Staff can manage own calendar connections" ON calendar_connections;
DROP POLICY IF EXISTS "Admin can view all calendar connections" ON calendar_connections;
DROP POLICY IF EXISTS "Admin can manage zapier webhooks" ON zapier_webhooks;
DROP POLICY IF EXISTS "Admin can view zapier logs" ON zapier_webhook_logs;
DROP POLICY IF EXISTS "Staff can view integration jobs" ON integration_jobs;
DROP POLICY IF EXISTS "Admin can manage integration jobs" ON integration_jobs;

CREATE POLICY "Staff can manage own calendar connections" ON calendar_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all calendar connections" ON calendar_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admin can manage zapier webhooks" ON zapier_webhooks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admin can view zapier logs" ON zapier_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Staff can view integration jobs" ON integration_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage integration jobs" ON integration_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 2. Harden storage policies
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Virtual staging keeps public read, but only staff/service-role can mutate
DROP POLICY IF EXISTS "virtual_staging_public_read" ON storage.objects;
CREATE POLICY "virtual_staging_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'virtual-staging');

DROP POLICY IF EXISTS "virtual_staging_auth_insert" ON storage.objects;
CREATE POLICY "virtual_staging_auth_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'virtual-staging'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "virtual_staging_auth_update" ON storage.objects;
CREATE POLICY "virtual_staging_auth_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'virtual-staging'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "virtual_staging_auth_delete" ON storage.objects;
CREATE POLICY "virtual_staging_auth_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'virtual-staging'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Media assets - public read, staff/service role writes
DROP POLICY IF EXISTS "media_assets_public_read" ON storage.objects;
CREATE POLICY "media_assets_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'media-assets');

DROP POLICY IF EXISTS "media_assets_auth_insert" ON storage.objects;
CREATE POLICY "media_assets_auth_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media-assets'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "media_assets_auth_update" ON storage.objects;
CREATE POLICY "media_assets_auth_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "media_assets_auth_delete" ON storage.objects;
CREATE POLICY "media_assets_auth_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media-assets'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Render cache - public read, staff/service role writes
DROP POLICY IF EXISTS "render_cache_public_read" ON storage.objects;
CREATE POLICY "render_cache_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'render-cache');

DROP POLICY IF EXISTS "render_cache_auth_insert" ON storage.objects;
CREATE POLICY "render_cache_auth_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'render-cache'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "render_cache_auth_update" ON storage.objects;
CREATE POLICY "render_cache_auth_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'render-cache'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "render_cache_auth_delete" ON storage.objects;
CREATE POLICY "render_cache_auth_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'render-cache'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Reference files reserved for staff
DROP POLICY IF EXISTS "reference_files_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "reference_files_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "reference_files_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "reference_files_auth_delete" ON storage.objects;

CREATE POLICY "Reference files staff access" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'reference-files'
    AND EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'reference-files'
  );

-- Render output upload should be locked to the service role
DROP POLICY IF EXISTS "Service role can upload render output" ON storage.objects;
CREATE POLICY "Service role can upload render output" ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (
    bucket_id = 'render-output'
  );

-- ============================================================================
-- 3. RLS policies for remaining tables that lacked per-row protections
-- ============================================================================

-- Staff table policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own record" ON staff;
DROP POLICY IF EXISTS "Staff can update own record" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;

CREATE POLICY "Staff can view own record" ON staff
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can update own record" ON staff
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
  );

CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- Analytics alert history
ALTER TABLE analytics_alert_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage analytics alert history" ON analytics_alert_history;
CREATE POLICY "Staff can manage analytics alert history" ON analytics_alert_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- AI schedules shared between staff and service_role
ALTER TABLE ai_agent_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage ai agent schedules" ON ai_agent_schedules;
DROP POLICY IF EXISTS "Service role full access to ai agent schedules" ON ai_agent_schedules;

CREATE POLICY "Staff can manage ai agent schedules" ON ai_agent_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role full access to ai agent schedules" ON ai_agent_schedules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Booking time slots
ALTER TABLE booking_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view booking time slots" ON booking_time_slots;
DROP POLICY IF EXISTS "Staff can manage booking time slots" ON booking_time_slots;
DROP POLICY IF EXISTS "Service role full access to booking time slots" ON booking_time_slots;

CREATE POLICY "Authenticated can view booking time slots" ON booking_time_slots
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage booking time slots" ON booking_time_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role full access to booking time slots" ON booking_time_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Care tasks
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view own care tasks" ON care_tasks;
DROP POLICY IF EXISTS "Staff can manage care tasks" ON care_tasks;

CREATE POLICY "Agents can view own care tasks" ON care_tasks
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage care tasks" ON care_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Communications log
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage communications" ON communications;
DROP POLICY IF EXISTS "Agents can view own communications" ON communications;

CREATE POLICY "Staff can manage communications" ON communications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Agents can view own communications" ON communications
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

-- Content retainers (public read, staff/service role writes)
ALTER TABLE content_retainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view content retainers" ON content_retainers;
DROP POLICY IF EXISTS "Staff can manage content retainers" ON content_retainers;
DROP POLICY IF EXISTS "Service role full access to content retainers" ON content_retainers;

CREATE POLICY "Public can view content retainers" ON content_retainers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff can manage content retainers" ON content_retainers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role full access to content retainers" ON content_retainers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Curated items (public read, staff inserts)
ALTER TABLE curated_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read curated items" ON curated_items;
DROP POLICY IF EXISTS "Staff can manage curated items" ON curated_items;

CREATE POLICY "Public can read curated items" ON curated_items
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Staff can manage curated items" ON curated_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Discount codes
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Service role can manage discount codes" ON discount_codes;

CREATE POLICY "Staff can manage discount codes" ON discount_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage discount codes" ON discount_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drive time cache (service role only)
ALTER TABLE drive_time_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role access to drive time cache" ON drive_time_cache;
CREATE POLICY "Service role access to drive time cache" ON drive_time_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Job events (staff can view, service role full)
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view job events" ON job_events;
DROP POLICY IF EXISTS "Service role can manage job events" ON job_events;

CREATE POLICY "Staff can view job events" ON job_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage job events" ON job_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Package pricing and packages
ALTER TABLE package_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read package pricing" ON package_pricing;
DROP POLICY IF EXISTS "Staff can manage package pricing" ON package_pricing;
DROP POLICY IF EXISTS "Service role can manage package pricing" ON package_pricing;

CREATE POLICY "Public can read package pricing" ON package_pricing
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff can manage package pricing" ON package_pricing
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage package pricing" ON package_pricing
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read packages" ON packages;
DROP POLICY IF EXISTS "Staff can manage packages" ON packages;
DROP POLICY IF EXISTS "Service role can manage packages" ON packages;

CREATE POLICY "Public can read packages" ON packages
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Staff can manage packages" ON packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage packages" ON packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Portal activity log
ALTER TABLE portal_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view portal activity log" ON portal_activity_log;
DROP POLICY IF EXISTS "Staff can insert into portal activity log" ON portal_activity_log;

CREATE POLICY "Staff can view portal activity log" ON portal_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Staff can insert into portal activity log" ON portal_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

-- Pricing tiers
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Staff can manage pricing tiers" ON pricing_tiers;
DROP POLICY IF EXISTS "Service role can manage pricing tiers" ON pricing_tiers;

CREATE POLICY "Public can read pricing tiers" ON pricing_tiers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff can manage pricing tiers" ON pricing_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage pricing tiers" ON pricing_tiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service availability and territory availability
ALTER TABLE service_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read service availability" ON service_availability;
DROP POLICY IF EXISTS "Staff can manage service availability" ON service_availability;
DROP POLICY IF EXISTS "Service role can manage service availability" ON service_availability;

CREATE POLICY "Public can read service availability" ON service_availability
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff can manage service availability" ON service_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage service availability" ON service_availability
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read territory availability" ON territory_availability;
DROP POLICY IF EXISTS "Staff can manage territory availability" ON territory_availability;
DROP POLICY IF EXISTS "Service role can manage territory availability" ON territory_availability;

CREATE POLICY "Public can read territory availability" ON territory_availability
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff can manage territory availability" ON territory_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage territory availability" ON territory_availability
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Services catalog
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read services" ON services;
DROP POLICY IF EXISTS "Staff can manage services" ON services;
DROP POLICY IF EXISTS "Service role can manage services" ON services;

CREATE POLICY "Public can read services" ON services
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Staff can manage services" ON services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage services" ON services
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Travel fee calculations
ALTER TABLE travel_fee_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view travel fee calculations" ON travel_fee_calculations;
DROP POLICY IF EXISTS "Service role can manage travel fee calculations" ON travel_fee_calculations;

CREATE POLICY "Staff can view travel fee calculations" ON travel_fee_calculations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role can manage travel fee calculations" ON travel_fee_calculations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Webhook events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Service role full access to webhook events" ON webhook_events;

CREATE POLICY "Staff can view webhook events" ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Service role full access to webhook events" ON webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
