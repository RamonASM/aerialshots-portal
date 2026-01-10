-- Made idempotent: 2026-01-07
-- Phase 13: Team Portals & Enterprise Integrations
-- Team capabilities, route planning, calendar sync, invoice templates

-- =====================================================
-- TEAM CAPABILITIES & ROLES
-- =====================================================

-- Team member role types (extends staff table)
CREATE TYPE team_role AS ENUM (
  'photographer',
  'videographer',
  'editor',
  'qc_specialist',
  'drone_operator',
  'admin'
);

-- Capability categories
CREATE TYPE capability_category AS ENUM (
  'photography',
  'videography',
  'drone',
  'editing',
  'virtual_staging',
  'floor_plans',
  'qc_review'
);

-- Team member capabilities (many-to-many with proficiency)
CREATE TABLE IF NOT EXISTS team_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  capability capability_category NOT NULL,
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  is_certified BOOLEAN DEFAULT FALSE,
  certification_date DATE,
  certification_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, capability)
);

-- Add role column to staff if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'team_role'
  ) THEN
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS team_role team_role DEFAULT 'photographer';
  END IF;
END $$;

-- =====================================================
-- ROUTE PLANNING & DRIVE TIME
-- =====================================================

-- Daily routes for team members
CREATE TABLE IF NOT EXISTS daily_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,
  start_location_lat DECIMAL(10, 7),
  start_location_lng DECIMAL(10, 7),
  start_address TEXT,
  end_location_lat DECIMAL(10, 7),
  end_location_lng DECIMAL(10, 7),
  end_address TEXT,
  total_distance_miles DECIMAL(10, 2),
  total_drive_time_minutes INTEGER,
  optimized_order JSONB DEFAULT '[]', -- Array of listing IDs in optimized order
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, route_date)
);

-- Route stops (each job in the route)
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES daily_routes(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  scheduled_arrival TIMESTAMPTZ,
  scheduled_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  drive_time_from_previous_minutes INTEGER,
  distance_from_previous_miles DECIMAL(10, 2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'in_progress', 'completed', 'skipped')),
  check_in_lat DECIMAL(10, 7),
  check_in_lng DECIMAL(10, 7),
  check_out_lat DECIMAL(10, 7),
  check_out_lng DECIMAL(10, 7),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drive time cache (to avoid repeated API calls)
CREATE TABLE IF NOT EXISTS drive_time_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  dest_lat DECIMAL(10, 7) NOT NULL,
  dest_lng DECIMAL(10, 7) NOT NULL,
  drive_time_minutes INTEGER NOT NULL,
  distance_miles DECIMAL(10, 2) NOT NULL,
  traffic_model TEXT DEFAULT 'best_guess', -- best_guess, pessimistic, optimistic
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_drive_time_cache_coords ON drive_time_cache(origin_lat, origin_lng, dest_lat, dest_lng);

-- =====================================================
-- CALENDAR INTEGRATIONS
-- =====================================================

-- Calendar sync connections
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT, -- External calendar ID
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_external', 'from_external', 'both')),
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT calendar_owner_check CHECK (
    (staff_id IS NOT NULL AND agent_id IS NULL) OR
    (staff_id IS NULL AND agent_id IS NOT NULL)
  )
);

-- Calendar events sync log
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'listing_scheduled', 'listing_updated', 'listing_cancelled'
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  external_event_id TEXT,
  sync_direction TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'skipped')),
  error_message TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INVOICE & REPORT TEMPLATES
-- =====================================================

-- Invoice templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  logo_url TEXT,
  header_html TEXT,
  footer_html TEXT,
  line_item_format TEXT, -- Template for line items
  payment_terms TEXT,
  notes_template TEXT,
  styling JSONB DEFAULT '{}', -- Colors, fonts, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated invoices (PDF storage)
CREATE TABLE IF NOT EXISTS generated_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  total_amount_cents INTEGER NOT NULL,
  tax_amount_cents INTEGER DEFAULT 0,
  discount_amount_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice sequence for generating invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000;

-- =====================================================
-- ZAPIER & WEBHOOK INTEGRATIONS
-- =====================================================

-- Webhook subscriptions (for Zapier, custom integrations)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT NOT NULL,
  secret_key TEXT, -- For HMAC verification
  events TEXT[] NOT NULL, -- Array of event types to subscribe to
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES staff(id),
  headers JSONB DEFAULT '{}', -- Custom headers to send
  retry_count INTEGER DEFAULT 3,
  last_triggered_at TIMESTAMPTZ,
  last_status TEXT,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TEAM PORTAL ACTIVITY TRACKING
-- =====================================================

-- Portal activity log (for analytics)
CREATE TABLE IF NOT EXISTS portal_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT, -- 'listing', 'order', 'media_asset', etc.
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_portal_activity_staff ON portal_activity_log(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_activity_type ON portal_activity_log(activity_type, created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE team_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can view/edit their own capabilities
DROP POLICY IF EXISTS "Staff can view own capabilities" ON team_capabilities;
DROP POLICY IF EXISTS "Staff can view own capabilities" ON team_capabilities;
CREATE POLICY "Staff can view own capabilities" ON team_capabilities
  FOR SELECT USING (staff_id = auth.uid() OR EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Staff can view/edit their own routes
DROP POLICY IF EXISTS "Staff can manage own routes" ON daily_routes;
DROP POLICY IF EXISTS "Staff can manage own routes" ON daily_routes;
CREATE POLICY "Staff can manage own routes" ON daily_routes
  FOR ALL USING (staff_id = auth.uid() OR EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

-- Staff can view their own route stops
DROP POLICY IF EXISTS "Staff can view own route stops" ON route_stops;
DROP POLICY IF EXISTS "Staff can view own route stops" ON route_stops;
CREATE POLICY "Staff can view own route stops" ON route_stops
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM daily_routes dr WHERE dr.id = route_id AND (
      dr.staff_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  ));

-- Calendar connections
DROP POLICY IF EXISTS "Users can manage own calendar" ON calendar_connections;
DROP POLICY IF EXISTS "Users can manage own calendar" ON calendar_connections;
CREATE POLICY "Users can manage own calendar" ON calendar_connections
  FOR ALL USING (
    staff_id = auth.uid() OR
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin')
  );

-- Invoice templates - admin only for management
DROP POLICY IF EXISTS "Admin can manage invoice templates" ON invoice_templates;
DROP POLICY IF EXISTS "Admin can manage invoice templates" ON invoice_templates;
CREATE POLICY "Admin can manage invoice templates" ON invoice_templates
  FOR ALL USING (EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'
  ));

-- Generated invoices - viewable by relevant parties
DROP POLICY IF EXISTS "View own invoices" ON generated_invoices;
DROP POLICY IF EXISTS "View own invoices" ON generated_invoices;
CREATE POLICY "View own invoices" ON generated_invoices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders o WHERE o.id = order_id AND (
      o.agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM staff WHERE id = auth.uid())
    )
  ));

-- Webhook subscriptions - admin only
DROP POLICY IF EXISTS "Admin can manage webhooks" ON webhook_subscriptions;
DROP POLICY IF EXISTS "Admin can manage webhooks" ON webhook_subscriptions;
CREATE POLICY "Admin can manage webhooks" ON webhook_subscriptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- SEED DATA
-- =====================================================

-- Seed default invoice template (skip if table schema differs)
DO $$
BEGIN
  INSERT INTO invoice_templates (name, is_default)
  VALUES ('Standard Invoice', TRUE)
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not seed invoice_templates: %', SQLERRM;
END $$;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON generated_invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON generated_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_phase13_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS trigger_team_capabilities_timestamp ON team_capabilities;
CREATE TRIGGER trigger_team_capabilities_timestamp
  BEFORE UPDATE ON team_capabilities
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

DROP TRIGGER IF EXISTS trigger_daily_routes_timestamp ON daily_routes;
CREATE TRIGGER trigger_daily_routes_timestamp
  BEFORE UPDATE ON daily_routes
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

DROP TRIGGER IF EXISTS trigger_calendar_connections_timestamp ON calendar_connections;
CREATE TRIGGER trigger_calendar_connections_timestamp
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

DROP TRIGGER IF EXISTS trigger_invoice_templates_timestamp ON invoice_templates;
CREATE TRIGGER trigger_invoice_templates_timestamp
  BEFORE UPDATE ON invoice_templates
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

DROP TRIGGER IF EXISTS trigger_generated_invoices_timestamp ON generated_invoices;
CREATE TRIGGER trigger_generated_invoices_timestamp
  BEFORE UPDATE ON generated_invoices
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

DROP TRIGGER IF EXISTS trigger_webhook_subscriptions_timestamp ON webhook_subscriptions;
CREATE TRIGGER trigger_webhook_subscriptions_timestamp
  BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_phase13_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE team_capabilities IS 'Team member skills and certifications for capability-based assignment';
COMMENT ON TABLE daily_routes IS 'Optimized daily routes for photographers with drive time calculations';
COMMENT ON TABLE route_stops IS 'Individual stops in a daily route with check-in/check-out tracking';
COMMENT ON TABLE drive_time_cache IS 'Cached Google Maps drive time results to reduce API calls';
COMMENT ON TABLE calendar_connections IS 'OAuth connections for external calendar sync (Google, Outlook, Apple)';
COMMENT ON TABLE invoice_templates IS 'Customizable PDF invoice templates';
COMMENT ON TABLE generated_invoices IS 'Generated invoice records with PDF storage';
COMMENT ON TABLE webhook_subscriptions IS 'Custom webhook subscriptions for Zapier and other integrations';
COMMENT ON TABLE portal_activity_log IS 'Activity tracking for team member portals';
