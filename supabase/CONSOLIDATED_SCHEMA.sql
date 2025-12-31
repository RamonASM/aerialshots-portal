-- ============================================================================
-- CONSOLIDATED SCHEMA - ASM Portal Critical Tables
-- ============================================================================
-- This script creates all critical tables with IF NOT EXISTS checks
-- Safe to run multiple times - idempotent operations only
-- Generated: 2025-12-31
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (Create if not exists)
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. ORDERS & PAYMENTS
-- ============================================================================

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  listing_id UUID REFERENCES listings(id),

  -- Service details
  service_type TEXT NOT NULL CHECK (service_type IN ('listing', 'retainer')),
  package_key TEXT NOT NULL,
  package_name TEXT NOT NULL,
  sqft_tier TEXT,
  services JSONB DEFAULT '[]',

  -- Pricing
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Property info
  property_address TEXT,
  property_city TEXT,
  property_state TEXT DEFAULT 'FL',
  property_zip TEXT,
  property_sqft INTEGER,
  property_beds INTEGER,
  property_baths DECIMAL(3,1),

  -- Contact info
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  scheduled_duration_minutes INTEGER,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'confirmed', 'scheduled', 'in_progress',
    'completed', 'delivered', 'cancelled', 'refunded'
  )),

  -- Payment tracking
  payment_intent_id TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'
  )),
  paid_at TIMESTAMPTZ,

  -- Retainer-specific
  retainer_start_date DATE,
  retainer_months INTEGER,

  -- Notes
  special_instructions TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_at ON orders(scheduled_at);

-- Order status history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_type TEXT CHECK (changed_by_type IN ('staff', 'agent', 'system', 'stripe')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- Split payments
CREATE TABLE IF NOT EXISTS split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL DEFAULT 'even',
  total_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_split_payments_order ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_status ON split_payments(status);

-- Payment portions
CREATE TABLE IF NOT EXISTS payment_portions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_payment_id UUID NOT NULL REFERENCES split_payments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  percentage DECIMAL(5, 2),
  payment_method_type TEXT NOT NULL DEFAULT 'card',
  payment_intent_id TEXT,
  payment_method_id TEXT,
  card_brand TEXT,
  card_last_four TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_portions_split ON payment_portions(split_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_portions_status ON payment_portions(status);

-- Payment summaries (legacy table - may be referenced in code)
CREATE TABLE IF NOT EXISTS payment_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  total_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INVOICES & INVOICE TEMPLATES
-- ============================================================================

-- Invoices table (direct agent billing)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  listing_address TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')
  ),
  line_items JSONB DEFAULT '[]'::jsonb,
  due_date DATE NOT NULL,
  days_overdue INTEGER DEFAULT 0,  -- Computed by application or trigger, not generated column
  paid_at TIMESTAMPTZ,
  payment_intent_id TEXT,
  payment_method TEXT,
  custom_notes TEXT,
  brokerage_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_agent_id ON invoices(agent_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_listing_id ON invoices(listing_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agent_unpaid ON invoices(agent_id, status)
  WHERE status IN ('pending', 'overdue');

-- Invoice templates (for PDF customization)
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN DEFAULT FALSE,
  logo_url TEXT,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  accent_color TEXT DEFAULT '#0066cc',
  font_family TEXT DEFAULT 'Inter',
  header_text TEXT,
  footer_text TEXT,
  terms_and_conditions TEXT,
  payment_instructions TEXT,
  show_logo BOOLEAN DEFAULT TRUE,
  show_qr_code BOOLEAN DEFAULT FALSE,
  show_due_date BOOLEAN DEFAULT TRUE,
  show_payment_link BOOLEAN DEFAULT TRUE,
  show_line_item_details BOOLEAN DEFAULT TRUE,
  paper_size TEXT DEFAULT 'letter',
  margin_top DECIMAL(5, 2) DEFAULT 1.0,
  margin_bottom DECIMAL(5, 2) DEFAULT 1.0,
  margin_left DECIMAL(5, 2) DEFAULT 0.75,
  margin_right DECIMAL(5, 2) DEFAULT 0.75,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_templates_agent ON invoice_templates(agent_id);

-- Generated invoices (order-based invoices)
CREATE TABLE IF NOT EXISTS generated_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  template_id UUID REFERENCES invoice_templates(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_to_email TEXT,
  email_opened_at TIMESTAMPTZ,
  internal_notes TEXT,
  customer_notes TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_invoices_order ON generated_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_status ON generated_invoices(status);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_number ON generated_invoices(invoice_number);

-- ============================================================================
-- 3. API KEYS & BUSINESS SETTINGS
-- ============================================================================

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT,
  name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business', 'enterprise')),
  monthly_limit INTEGER DEFAULT 3000,
  requests_this_month INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  description TEXT,
  allowed_domains TEXT[],
  webhook_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- Business Settings
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id)
);

-- Insert default business settings if not exists
INSERT INTO business_settings (setting_key, setting_value, description) VALUES
('travel_fees', '{
  "home_base_lat": 28.5383,
  "home_base_lng": -81.3792,
  "home_base_address": "Orlando, FL",
  "free_radius_miles": 25,
  "per_mile_rate_cents": 75,
  "minimum_fee_cents": 0,
  "maximum_fee_cents": 15000,
  "round_trip": true
}'::jsonb, 'Travel fee calculation settings'),
('booking_cutoff', '{
  "same_day_cutoff_hours": 0,
  "next_day_cutoff_hour": 18,
  "next_day_cutoff_minute": 0,
  "minimum_advance_hours": 24,
  "holiday_blackout_dates": []
}'::jsonb, 'Booking cutoff time settings'),
('weather_alerts', '{
  "rain_threshold_percent": 30,
  "wind_threshold_mph": 15,
  "show_forecast_days": 7
}'::jsonb, 'Weather alert thresholds for scheduling')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 4. WEATHER & LOCATION DATA
-- ============================================================================

-- Weather forecasts
CREATE TABLE IF NOT EXISTS weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_data JSONB NOT NULL,
  high_temp_f INTEGER,
  low_temp_f INTEGER,
  precipitation_chance INTEGER,
  wind_speed_mph INTEGER,
  conditions TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  source TEXT DEFAULT 'openweathermap',
  UNIQUE(latitude, longitude, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_forecasts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_weather_expires ON weather_forecasts(expires_at);

-- ============================================================================
-- 5. TEAM TERRITORIES
-- ============================================================================

-- Service Territories
CREATE TABLE IF NOT EXISTS service_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  zip_codes TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_territories_active ON service_territories(is_active);
CREATE INDEX IF NOT EXISTS idx_service_territories_zip ON service_territories USING GIN(zip_codes);
CREATE INDEX IF NOT EXISTS idx_service_territories_cities ON service_territories USING GIN(cities);

-- Staff Territories (many-to-many)
CREATE TABLE IF NOT EXISTS staff_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES service_territories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_territories_staff ON staff_territories(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_territories_territory ON staff_territories(territory_id);

-- ============================================================================
-- 6. PROCESSING & HDR WORKFLOW
-- ============================================================================

-- Processing Jobs (FoundDR integration)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founddr_job_id UUID,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'queued', 'processing',
    'completed', 'failed', 'cancelled'
  )),
  input_keys TEXT[] NOT NULL,
  output_key TEXT,
  bracket_count INTEGER,
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  metrics JSONB DEFAULT '{}',
  error_message TEXT,
  webhook_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_listing_id ON processing_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_founddr_job_id ON processing_jobs(founddr_job_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

-- ============================================================================
-- 7. LISTING CAMPAIGNS & CAROUSELS (must be before AI agents that reference them)
-- ============================================================================

-- Listing Campaigns (ListingLaunch)
CREATE TABLE IF NOT EXISTS listing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'researching', 'questions', 'generating', 'completed', 'published'
  )),
  neighborhood_data JSONB,
  generated_questions JSONB,
  agent_answers JSONB,
  carousel_types TEXT[],
  blog_post_content JSONB,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_campaigns_listing ON listing_campaigns(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_campaigns_agent ON listing_campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_listing_campaigns_status ON listing_campaigns(status);

-- Listing Carousels
CREATE TABLE IF NOT EXISTS listing_carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES listing_campaigns(id) ON DELETE CASCADE NOT NULL,
  carousel_type VARCHAR(50) NOT NULL CHECK (carousel_type IN (
    'property_highlights', 'neighborhood_guide', 'local_favorites',
    'schools_families', 'lifestyle', 'market_update', 'open_house'
  )),
  title VARCHAR(255),
  slides JSONB NOT NULL DEFAULT '[]',
  caption TEXT,
  hashtags TEXT[],
  bannerbear_collection_uid VARCHAR(100),
  rendered_image_urls TEXT[],
  render_status VARCHAR(50) DEFAULT 'pending' CHECK (render_status IN (
    'pending', 'rendering', 'completed', 'failed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rendered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listing_carousels_campaign ON listing_carousels(campaign_id);
CREATE INDEX IF NOT EXISTS idx_listing_carousels_type ON listing_carousels(carousel_type);

-- ============================================================================
-- 8. AI AGENTS & WORKFLOWS
-- ============================================================================

-- AI Agents Registry
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operations', 'content', 'development', 'lifestyle')),
  is_active BOOLEAN DEFAULT TRUE,
  execution_mode VARCHAR(20) DEFAULT 'sync' CHECK (execution_mode IN ('sync', 'async', 'scheduled')),
  system_prompt TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agents_category ON ai_agents(category);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);

-- AI Agent Executions
CREATE TABLE IF NOT EXISTS ai_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug VARCHAR(100) NOT NULL REFERENCES ai_agents(slug),
  triggered_by UUID REFERENCES staff(id),
  listing_id UUID REFERENCES listings(id),
  campaign_id UUID REFERENCES listing_campaigns(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_source VARCHAR(50),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_agent_slug ON ai_agent_executions(agent_slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_status ON ai_agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_listing_id ON ai_agent_executions(listing_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_created_at ON ai_agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_trigger_source ON ai_agent_executions(trigger_source);

-- AI Agent Workflows
CREATE TABLE IF NOT EXISTS ai_agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  listing_id UUID REFERENCES listings(id),
  campaign_id UUID REFERENCES listing_campaigns(id),
  current_step INTEGER DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]',
  context JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_trigger_event ON ai_agent_workflows(trigger_event);
CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_status ON ai_agent_workflows(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_listing_id ON ai_agent_workflows(listing_id);

-- ============================================================================
-- 9. ROW LEVEL SECURITY - Enable on all tables
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_carousels ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. BASIC RLS POLICIES
-- ============================================================================

-- Orders: Agents see own, Staff see all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Agents can view own orders'
  ) THEN
    CREATE POLICY "Agents can view own orders" ON orders
      FOR SELECT USING (
        agent_id IN (SELECT id FROM agents WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Staff can view all orders'
  ) THEN
    CREATE POLICY "Staff can view all orders" ON orders
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- Invoices: Agents see own, Staff see all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Agents can view own invoices'
  ) THEN
    CREATE POLICY "Agents can view own invoices" ON invoices
      FOR SELECT USING (
        agent_id IN (SELECT id FROM agents WHERE auth_user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Staff can view all invoices'
  ) THEN
    CREATE POLICY "Staff can view all invoices" ON invoices
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_active = true
        )
      );
  END IF;
END $$;

-- API Keys: Users see own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can view own API keys'
  ) THEN
    CREATE POLICY "Users can view own API keys" ON api_keys
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Business Settings: Staff only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'business_settings' AND policyname = 'Staff can view business settings'
  ) THEN
    CREATE POLICY "Staff can view business settings" ON business_settings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = true
        )
      );
  END IF;
END $$;

-- Weather: Public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weather_forecasts' AND policyname = 'Anyone can read weather forecasts'
  ) THEN
    CREATE POLICY "Anyone can read weather forecasts" ON weather_forecasts
      FOR SELECT USING (true);
  END IF;
END $$;

-- Service Territories: Staff can view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'service_territories' AND policyname = 'Staff can view territories'
  ) THEN
    CREATE POLICY "Staff can view territories" ON service_territories
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- Processing Jobs: Staff see all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'processing_jobs' AND policyname = 'Staff can view all processing jobs'
  ) THEN
    CREATE POLICY "Staff can view all processing jobs" ON processing_jobs
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- AI Agents: Service role access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_agents' AND policyname = 'Service role has full access to ai_agents'
  ) THEN
    CREATE POLICY "Service role has full access to ai_agents" ON ai_agents
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Campaigns: Agents see own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'listing_campaigns' AND policyname = 'Agents can view own campaigns'
  ) THEN
    CREATE POLICY "Agents can view own campaigns" ON listing_campaigns
      FOR SELECT USING (
        agent_id IN (SELECT id FROM agents WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- ============================================================================
-- 11. UPDATE TRIGGERS
-- ============================================================================

-- Orders
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Invoices
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Processing Jobs
DROP TRIGGER IF EXISTS processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER processing_jobs_updated_at
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- AI Agents
DROP TRIGGER IF EXISTS ai_agents_updated_at ON ai_agents;
CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- AI Workflows
DROP TRIGGER IF EXISTS ai_agent_workflows_updated_at ON ai_agent_workflows;
CREATE TRIGGER ai_agent_workflows_updated_at
  BEFORE UPDATE ON ai_agent_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Listing Campaigns
DROP TRIGGER IF EXISTS listing_campaigns_updated_at ON listing_campaigns;
CREATE TRIGGER listing_campaigns_updated_at
  BEFORE UPDATE ON listing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Service Territories
DROP TRIGGER IF EXISTS service_territories_updated ON service_territories;
CREATE TRIGGER service_territories_updated
  BEFORE UPDATE ON service_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. COMMENTS
-- ============================================================================

COMMENT ON TABLE orders IS 'Main orders table for booking/payment tracking';
COMMENT ON TABLE invoices IS 'Direct agent billing invoices (separate from order-based generated_invoices)';
COMMENT ON TABLE api_keys IS 'API keys for Life Here API access';
COMMENT ON TABLE business_settings IS 'Configurable business settings (travel fees, cutoff times, etc.)';
COMMENT ON TABLE weather_forecasts IS 'Cached weather data to avoid repeated API calls';
COMMENT ON TABLE service_territories IS 'Geographic service areas for team assignment';
COMMENT ON TABLE staff_territories IS 'Staff member to territory assignments';
COMMENT ON TABLE processing_jobs IS 'Tracks FoundDR HDR processing jobs';
COMMENT ON TABLE ai_agents IS 'Registry of all AI agents in the system';
COMMENT ON TABLE ai_agent_executions IS 'Execution log for AI agent runs';
COMMENT ON TABLE ai_agent_workflows IS 'Multi-step workflow orchestration';
COMMENT ON TABLE listing_campaigns IS 'ListingLaunch marketing campaigns';
COMMENT ON TABLE listing_carousels IS 'Individual carousels within campaigns';

-- ============================================================================
-- 13. NOTIFICATION SYSTEM
-- ============================================================================

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  order_updates BOOLEAN DEFAULT TRUE,
  delivery_notifications BOOLEAN DEFAULT TRUE,
  payment_reminders BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  system_alerts BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipient_type TEXT CHECK (recipient_type IN ('agent', 'staff', 'client', 'developer')),
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at DESC);

-- ============================================================================
-- 14. CREDIT SYSTEM
-- ============================================================================

-- Credit Packages
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credit_amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_packages_sort ON credit_packages(sort_order);

-- Insert default credit packages
INSERT INTO credit_packages (name, description, credit_amount, price_cents, discount_percent, is_popular, sort_order) VALUES
('Starter', 'Perfect for getting started', 100, 9900, 0, FALSE, 1),
('Pro', 'Most popular for regular agents', 500, 44900, 10, TRUE, 2),
('Business', 'Best value for high-volume agents', 1000, 79900, 20, FALSE, 3),
('Enterprise', 'Unlimited shoots package', 2500, 174900, 30, FALSE, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. ANALYTICS SYSTEM
-- ============================================================================

-- Analytics Alerts
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'equals', 'change_percent')),
  threshold DECIMAL(12, 2) NOT NULL,
  comparison_period TEXT DEFAULT '24h',
  notification_channels TEXT[] DEFAULT '{"email"}',
  recipients TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_alerts_active ON analytics_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_metric ON analytics_alerts(metric_type);

-- Analytics Alert History
CREATE TABLE IF NOT EXISTS analytics_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES analytics_alerts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metric_value DECIMAL(12, 2),
  threshold_value DECIMAL(12, 2),
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_channels TEXT[],
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_alert_history_alert ON analytics_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_analytics_alert_history_triggered ON analytics_alert_history(triggered_at DESC);

-- ============================================================================
-- 16. AI AGENT SCHEDULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL REFERENCES ai_agents(slug) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'event')),
  cron_expression TEXT,
  interval_minutes INTEGER,
  event_trigger TEXT,
  max_concurrent INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_slug ON ai_agent_schedules(agent_slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_active ON ai_agent_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_agent_schedules_next_run ON ai_agent_schedules(next_run_at);

-- ============================================================================
-- 17. BOOKING & MEDIA UPLOADS
-- ============================================================================

-- Booking Reference Files
CREATE TABLE IF NOT EXISTS booking_reference_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_session_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reference_files_session ON booking_reference_files(booking_session_id);

-- Media Uploads
CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  uploaded_by UUID,
  filename TEXT NOT NULL,
  original_name TEXT,
  storage_key TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'asm-media',
  content_type TEXT,
  size_bytes BIGINT,
  media_type TEXT CHECK (media_type IN ('photo', 'video', 'floor_plan', 'document', 'raw')),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_listing ON media_uploads(listing_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_status ON media_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_media_uploads_type ON media_uploads(media_type);

-- ============================================================================
-- 18. ADDITIONAL RLS POLICIES
-- ============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reference_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Notification preferences: users see own
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences" ON notification_preferences
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Credit packages: public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'credit_packages' AND policyname = 'Anyone can view active credit packages'
  ) THEN
    CREATE POLICY "Anyone can view active credit packages" ON credit_packages
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Analytics alerts: staff only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analytics_alerts' AND policyname = 'Staff can manage analytics alerts'
  ) THEN
    CREATE POLICY "Staff can manage analytics alerts" ON analytics_alerts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- Media uploads: staff and agents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'media_uploads' AND policyname = 'Staff can view all media uploads'
  ) THEN
    CREATE POLICY "Staff can view all media uploads" ON media_uploads
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email')
      );
  END IF;
END $$;

-- ============================================================================
-- 19. UPDATE TRIGGERS FOR NEW TABLES
-- ============================================================================

DROP TRIGGER IF EXISTS notification_preferences_updated ON notification_preferences;
CREATE TRIGGER notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS credit_packages_updated ON credit_packages;
CREATE TRIGGER credit_packages_updated
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS analytics_alerts_updated ON analytics_alerts;
CREATE TRIGGER analytics_alerts_updated
  BEFORE UPDATE ON analytics_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS media_uploads_updated ON media_uploads;
CREATE TRIGGER media_uploads_updated
  BEFORE UPDATE ON media_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETED
-- ============================================================================

SELECT 'Consolidated schema applied successfully!' as result;
