-- Made idempotent: 2026-01-07
-- =====================================================
-- Phase 14: Complete Platform
-- Analytics, Client Portal, PWA, AI Automation
-- =====================================================

-- =====================================================
-- PART 1: ANALYTICS ENHANCEMENTS
-- =====================================================

-- Analytics alerts for threshold monitoring
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'revenue', 'orders', 'leads', 'conversion_rate',
    'page_views', 'qc_time', 'delivery_time', 'agent_activity'
  )),
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'equals', 'change_percent')),
  threshold DECIMAL(12, 2) NOT NULL,
  comparison_period TEXT DEFAULT 'day' CHECK (comparison_period IN ('hour', 'day', 'week', 'month')),
  notification_channels TEXT[] DEFAULT ARRAY['email'],
  recipients TEXT[], -- email addresses or user IDs
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT 60, -- minimum time between alerts
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history for tracking triggered alerts
CREATE TABLE IF NOT EXISTS analytics_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES analytics_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metric_value DECIMAL(12, 2) NOT NULL,
  threshold_value DECIMAL(12, 2) NOT NULL,
  comparison_value DECIMAL(12, 2), -- previous period value for change_percent
  message TEXT,
  notifications_sent JSONB DEFAULT '[]', -- tracking which channels received the alert
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES staff(id)
);

-- Analytics goals for KPI tracking
CREATE TABLE IF NOT EXISTS analytics_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  target_value DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  achieved_at TIMESTAMPTZ,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geographic analytics data (for heat maps)
CREATE TABLE IF NOT EXISTS analytics_geographic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  zip_code TEXT,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'FL',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  order_count INTEGER DEFAULT 0,
  revenue DECIMAL(12, 2) DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  avg_property_price DECIMAL(12, 2),
  property_types JSONB DEFAULT '{}', -- counts by type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, zip_code)
);

-- Real-time metrics snapshot (updated frequently)
CREATE TABLE IF NOT EXISTS analytics_realtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL UNIQUE,
  metric_value DECIMAL(12, 2) NOT NULL,
  previous_value DECIMAL(12, 2),
  change_percent DECIMAL(8, 2),
  period TEXT DEFAULT 'today',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster geographic queries
CREATE INDEX IF NOT EXISTS idx_analytics_geographic_date ON analytics_geographic(date);
CREATE INDEX IF NOT EXISTS idx_analytics_geographic_zip ON analytics_geographic(zip_code);
CREATE INDEX IF NOT EXISTS idx_analytics_geographic_city ON analytics_geographic(city);

-- =====================================================
-- PART 2: CLIENT SELF-SERVICE PORTAL
-- =====================================================

-- Client accounts (separate from agents, for direct clients)
CREATE TABLE IF NOT EXISTS client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  auth_user_id UUID, -- links to Supabase auth.users

  -- Profile
  avatar_url TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  preferred_contact TEXT DEFAULT 'email' CHECK (preferred_contact IN ('email', 'phone', 'sms')),

  -- Preferences
  notification_preferences JSONB DEFAULT '{
    "order_updates": true,
    "marketing": true,
    "reminders": true
  }',

  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,

  -- Source tracking
  referral_source TEXT,
  referral_code TEXT,
  referred_by_agent_id UUID REFERENCES agents(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client addresses for easy booking
CREATE TABLE IF NOT EXISTS client_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home', -- Home, Office, Property 1, etc.
  street_address TEXT NOT NULL,
  unit TEXT,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'FL',
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_default BOOLEAN DEFAULT FALSE,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'land', 'multi_family')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client booking requests (self-service orders)
CREATE TABLE IF NOT EXISTS client_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,

  -- Property details
  address_id UUID REFERENCES client_addresses(id),
  property_address TEXT NOT NULL,
  property_city TEXT NOT NULL,
  property_state TEXT DEFAULT 'FL',
  property_zip TEXT NOT NULL,
  property_type TEXT DEFAULT 'residential',
  square_feet INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),

  -- Booking details
  package_id UUID, -- links to packages table
  package_name TEXT,
  services JSONB DEFAULT '[]', -- selected services
  addons JSONB DEFAULT '[]', -- additional add-ons

  -- Scheduling
  preferred_date DATE,
  preferred_time_slot TEXT, -- morning, afternoon, evening
  alternate_dates DATE[], -- backup dates
  scheduling_notes TEXT,
  is_flexible BOOLEAN DEFAULT FALSE,

  -- Pricing
  estimated_price DECIMAL(10, 2),
  quoted_price DECIMAL(10, 2),
  discount_code TEXT,
  discount_amount DECIMAL(10, 2) DEFAULT 0,

  -- Status workflow
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'quoted', 'confirmed', 'scheduled',
    'completed', 'cancelled', 'expired'
  )),
  quoted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Linking
  order_id UUID, -- links to orders table when confirmed
  assigned_photographer_id UUID REFERENCES staff(id),
  assigned_agent_id UUID REFERENCES agents(id), -- if booked through an agent

  -- Communication
  special_instructions TEXT,
  access_notes TEXT, -- gate codes, key location, etc.

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client portal sessions for analytics
CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL,
  share_token TEXT, -- if accessing via share link
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  page_views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  actions JSONB DEFAULT '[]' -- track specific actions taken
);

-- Self-service discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'package_upgrade')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_value DECIMAL(10, 2),
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  applicable_packages UUID[], -- null means all packages
  applicable_services TEXT[], -- null means all services
  first_order_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client portal
CREATE INDEX IF NOT EXISTS idx_client_accounts_email ON client_accounts(email);
CREATE INDEX IF NOT EXISTS idx_client_accounts_auth_user ON client_accounts(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_client_bookings_client ON client_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_client_bookings_status ON client_bookings(status);
CREATE INDEX IF NOT EXISTS idx_client_bookings_date ON client_bookings(preferred_date);

-- =====================================================
-- PART 3: PWA & PUSH NOTIFICATIONS
-- =====================================================

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('agent', 'staff', 'client')),
  user_id UUID NOT NULL, -- polymorphic reference

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL, -- public key
  auth_key TEXT NOT NULL, -- auth secret

  -- Device info
  device_name TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  failed_count INTEGER DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_type, user_id, endpoint)
);

-- Push notification history
CREATE TABLE IF NOT EXISTS push_notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_type TEXT NOT NULL,
  user_id UUID NOT NULL,

  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  image TEXT,
  tag TEXT, -- for grouping/replacing notifications
  data JSONB DEFAULT '{}', -- custom payload
  actions JSONB DEFAULT '[]', -- notification actions

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'clicked', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Context
  notification_type TEXT, -- order_update, reminder, marketing, etc.
  reference_type TEXT, -- order, listing, booking
  reference_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline action queue (for background sync)
CREATE TABLE IF NOT EXISTS offline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  device_id TEXT,

  -- Action details
  action_type TEXT NOT NULL, -- upload, form_submit, status_update
  action_data JSONB NOT NULL,
  target_endpoint TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index for push notifications
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_push_notification_history_user ON push_notification_history(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_action_queue(status) WHERE status = 'pending';

-- =====================================================
-- PART 4: AI AUTOMATION ENHANCEMENTS
-- =====================================================

-- Agent schedules (for automated execution)
CREATE TABLE IF NOT EXISTS ai_agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,

  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'event')),
  cron_expression TEXT, -- for cron type: "0 9 * * *"
  interval_minutes INTEGER, -- for interval type
  event_trigger TEXT, -- for event type: listing_created, order_completed, etc.

  -- Execution settings
  is_active BOOLEAN DEFAULT TRUE,
  max_concurrent INTEGER DEFAULT 1,
  timeout_seconds INTEGER DEFAULT 300,
  retry_on_failure BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,

  -- Context/filters
  filter_conditions JSONB DEFAULT '{}', -- conditions to match before running
  default_context JSONB DEFAULT '{}', -- default context to pass

  -- Tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow templates (for visual workflow builder)
CREATE TABLE IF NOT EXISTS ai_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'custom',

  -- Workflow definition
  steps JSONB NOT NULL DEFAULT '[]', -- array of step definitions
  variables JSONB DEFAULT '{}', -- workflow variables

  -- Settings
  is_public BOOLEAN DEFAULT FALSE, -- available to all users
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  icon TEXT,
  color TEXT,
  estimated_duration_seconds INTEGER,

  -- Versioning
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,

  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow execution instances
CREATE TABLE IF NOT EXISTS ai_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES ai_workflow_templates(id) ON DELETE SET NULL,
  workflow_slug TEXT NOT NULL,

  -- Execution context
  trigger_source TEXT NOT NULL, -- manual, scheduled, webhook, event
  trigger_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
  )),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,

  -- Step results
  step_results JSONB DEFAULT '[]',
  output JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- User context
  triggered_by_type TEXT, -- staff, agent, system
  triggered_by_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent execution queue (for rate limiting and prioritization)
CREATE TABLE IF NOT EXISTS ai_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority

  -- Execution details
  context JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  execution_id UUID REFERENCES ai_agent_executions(id),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart pricing rules (AI-assisted pricing)
CREATE TABLE IF NOT EXISTS smart_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Rule conditions
  conditions JSONB NOT NULL DEFAULT '[]', -- array of condition objects

  -- Pricing adjustment
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percent', 'fixed', 'multiply')),
  adjustment_value DECIMAL(10, 2) NOT NULL,

  -- Applicability
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'packages', 'services')),
  package_ids UUID[],
  service_types TEXT[],

  -- Priority and status
  priority INTEGER DEFAULT 5, -- lower runs first
  is_active BOOLEAN DEFAULT TRUE,

  -- Scheduling
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  day_of_week INTEGER[], -- 0-6 for specific days

  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for AI tables
CREATE INDEX IF NOT EXISTS idx_ai_schedules_active ON ai_agent_schedules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_schedules_next_run ON ai_agent_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_executions_status ON ai_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_execution_queue_status ON ai_execution_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_smart_pricing_active ON smart_pricing_rules(is_active) WHERE is_active = TRUE;

-- =====================================================
-- PART 5: BOOKING FLOW ENHANCEMENTS
-- =====================================================

-- Service availability calendar
CREATE TABLE IF NOT EXISTS service_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- Capacity
  total_slots INTEGER DEFAULT 6, -- max shoots per day
  booked_slots INTEGER DEFAULT 0,
  blocked_slots INTEGER DEFAULT 0, -- holidays, maintenance

  -- Time slots
  morning_available BOOLEAN DEFAULT TRUE,
  afternoon_available BOOLEAN DEFAULT TRUE,
  evening_available BOOLEAN DEFAULT TRUE,

  -- Pricing modifiers
  is_peak BOOLEAN DEFAULT FALSE, -- weekends, holidays
  price_modifier DECIMAL(4, 2) DEFAULT 1.00, -- 1.0 = normal, 1.2 = 20% more

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

-- Booking time slots
CREATE TABLE IF NOT EXISTS booking_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Assignment
  photographer_id UUID REFERENCES staff(id),
  territory_id UUID, -- if using territory-based assignment

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'tentative')),
  booking_id UUID REFERENCES client_bookings(id),

  -- Metadata
  duration_minutes INTEGER DEFAULT 120,
  buffer_before INTEGER DEFAULT 30, -- travel time
  buffer_after INTEGER DEFAULT 15,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, start_time, photographer_id)
);

-- Instant quote cache (for fast pricing)
CREATE TABLE IF NOT EXISTS quote_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- hash of: sqft, services, zip, date

  -- Quote details
  base_price DECIMAL(10, 2) NOT NULL,
  adjustments JSONB DEFAULT '[]',
  final_price DECIMAL(10, 2) NOT NULL,
  breakdown JSONB NOT NULL,

  -- Validity
  valid_until TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for booking
CREATE INDEX IF NOT EXISTS idx_service_availability_date ON service_availability(date);
CREATE INDEX IF NOT EXISTS idx_booking_time_slots_date ON booking_time_slots(date, status);
CREATE INDEX IF NOT EXISTS idx_quote_cache_key ON quote_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_quote_cache_valid ON quote_cache(valid_until);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can manage analytics
DROP POLICY IF EXISTS "Staff can manage analytics alerts" ON analytics_alerts;
DROP POLICY IF EXISTS "Staff can manage analytics alerts" ON analytics_alerts;
CREATE POLICY "Staff can manage analytics alerts" ON analytics_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid())
  );

-- Clients can view their own data
DROP POLICY IF EXISTS "Clients can view own account" ON client_accounts;
DROP POLICY IF EXISTS "Clients can view own account" ON client_accounts;
CREATE POLICY "Clients can view own account" ON client_accounts
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own account" ON client_accounts;
DROP POLICY IF EXISTS "Clients can update own account" ON client_accounts;
CREATE POLICY "Clients can update own account" ON client_accounts
  FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Clients can view own bookings" ON client_bookings;
DROP POLICY IF EXISTS "Clients can view own bookings" ON client_bookings;
CREATE POLICY "Clients can view own bookings" ON client_bookings
  FOR SELECT USING (
    client_id IN (SELECT id FROM client_accounts WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients can create bookings" ON client_bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON client_bookings;
CREATE POLICY "Clients can create bookings" ON client_bookings
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM client_accounts WHERE auth_user_id = auth.uid())
  );

-- Staff can manage all client data
DROP POLICY IF EXISTS "Staff can manage client accounts" ON client_accounts;
DROP POLICY IF EXISTS "Staff can manage client accounts" ON client_accounts;
CREATE POLICY "Staff can manage client accounts" ON client_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can manage client bookings" ON client_bookings;
DROP POLICY IF EXISTS "Staff can manage client bookings" ON client_bookings;
CREATE POLICY "Staff can manage client bookings" ON client_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid())
  );

-- Push subscriptions - users can manage their own
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (
    (user_type = 'staff' AND user_id IN (SELECT id FROM staff WHERE auth_user_id = auth.uid())) OR
    (user_type = 'agent' AND user_id IN (SELECT id FROM agents WHERE auth_user_id = auth.uid())) OR
    (user_type = 'client' AND user_id IN (SELECT id FROM client_accounts WHERE auth_user_id = auth.uid()))
  );

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default service availability for next 90 days
INSERT INTO service_availability (date, is_peak, price_modifier)
SELECT
  generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', INTERVAL '1 day')::DATE,
  EXTRACT(DOW FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', INTERVAL '1 day')) IN (0, 6),
  CASE WHEN EXTRACT(DOW FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', INTERVAL '1 day')) IN (0, 6) THEN 1.15 ELSE 1.00 END
ON CONFLICT (date) DO NOTHING;

-- Default discount code
INSERT INTO discount_codes (code, description, discount_type, discount_value, first_order_only)
VALUES ('WELCOME10', 'Welcome discount for new clients', 'percent', 10, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Real-time metrics initialization
INSERT INTO analytics_realtime (metric_key, metric_value, period)
VALUES
  ('orders_today', 0, 'today'),
  ('revenue_today', 0, 'today'),
  ('active_shoots', 0, 'now'),
  ('pending_qc', 0, 'now'),
  ('leads_today', 0, 'today')
ON CONFLICT (metric_key) DO NOTHING;

-- Default AI agent schedules
INSERT INTO ai_agent_schedules (agent_slug, schedule_type, cron_expression, is_active)
VALUES
  ('qc-assistant', 'interval', NULL, TRUE),
  ('delivery-notifier', 'event', NULL, TRUE),
  ('portfolio-stats', 'cron', '0 6 * * *', TRUE) -- Daily at 6 AM
ON CONFLICT DO NOTHING;

-- Update interval for qc-assistant
UPDATE ai_agent_schedules
SET interval_minutes = 15
WHERE agent_slug = 'qc-assistant' AND schedule_type = 'interval';

-- Event trigger for delivery-notifier
UPDATE ai_agent_schedules
SET event_trigger = 'listing_delivered'
WHERE agent_slug = 'delivery-notifier' AND schedule_type = 'event';
