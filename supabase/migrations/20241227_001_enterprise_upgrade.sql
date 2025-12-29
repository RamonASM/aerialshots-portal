-- Enterprise Upgrade Migration
-- Adds: Integration tracking, Smart assignment, SLA tracking, Client portal, Seller scheduling

-- ============================================
-- 1. INTEGRATION TRACKING (Gap #2)
-- Track Fotello, Cubicasa, Zillow 3D status
-- ============================================

-- Add integration status columns to listings
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS fotello_job_id TEXT,
ADD COLUMN IF NOT EXISTS fotello_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS cubicasa_order_id TEXT,
ADD COLUMN IF NOT EXISTS cubicasa_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS zillow_3d_id TEXT,
ADD COLUMN IF NOT EXISTS zillow_3d_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS integration_error_message TEXT,
ADD COLUMN IF NOT EXISTS last_integration_check TIMESTAMPTZ;

-- Integration status enum check
ALTER TABLE listings
ADD CONSTRAINT check_fotello_status
CHECK (fotello_status IN ('pending', 'ordered', 'processing', 'delivered', 'needs_manual', 'failed', 'not_applicable'));

ALTER TABLE listings
ADD CONSTRAINT check_cubicasa_status
CHECK (cubicasa_status IN ('pending', 'ordered', 'processing', 'delivered', 'failed', 'not_applicable'));

ALTER TABLE listings
ADD CONSTRAINT check_zillow_3d_status
CHECK (zillow_3d_status IN ('pending', 'scheduled', 'scanned', 'processing', 'live', 'failed', 'not_applicable'));

-- ============================================
-- 2. SMART ASSIGNMENT (Gap #4)
-- Skills, home location, capacity
-- ============================================

-- Add smart assignment columns to staff
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS max_daily_jobs INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';

-- Photographer specialties table
CREATE TABLE IF NOT EXISTS photographer_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'intermediate',
  certification_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_specialty CHECK (specialty IN ('interior', 'exterior', 'drone', 'commercial', 'vacant_land', 'twilight', 'luxury', 'video')),
  CONSTRAINT check_proficiency CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
  UNIQUE(photographer_id, specialty)
);

-- ============================================
-- 3. SLA TRACKING (Gap #3)
-- Expected completion, stage timing
-- ============================================

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS expected_completion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_track',
ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE listings
ADD CONSTRAINT check_sla_status
CHECK (sla_status IN ('on_track', 'at_risk', 'overdue'));

-- Job time logs for photographer performance tracking
CREATE TABLE IF NOT EXISTS job_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_assignment_id UUID REFERENCES photographer_assignments(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_event_type CHECK (event_type IN ('arrived', 'started', 'completed', 'left', 'break_start', 'break_end'))
);

CREATE INDEX IF NOT EXISTS idx_job_time_logs_listing ON job_time_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_job_time_logs_assignment ON job_time_logs(photographer_assignment_id);

-- ============================================
-- 4. CLIENT PORTAL (Gap #1)
-- Share links, messaging
-- ============================================

-- Share links for seller access
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  client_email TEXT,
  client_name TEXT,
  share_token TEXT UNIQUE NOT NULL,
  link_type TEXT DEFAULT 'media',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_link_type CHECK (link_type IN ('media', 'schedule', 'status'))
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_share_links_listing ON share_links(listing_id);

-- Client messages (seller/agent communication)
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  sender_email TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_sender_type CHECK (sender_type IN ('client', 'seller', 'agent', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_client_messages_listing ON client_messages(listing_id);

-- ============================================
-- 5. SELLER SCHEDULING (F1)
-- Availability submission
-- ============================================

CREATE TABLE IF NOT EXISTS seller_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  available_slots JSONB NOT NULL DEFAULT '[]',
  selected_slot JSONB,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_schedule_status CHECK (status IN ('pending', 'submitted', 'confirmed', 'rescheduled', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_seller_schedules_listing ON seller_schedules(listing_id);

-- ============================================
-- 6. NOTIFICATIONS LOG
-- Track all notifications sent
-- ============================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL,
  recipient_id UUID,
  recipient_email TEXT,
  recipient_phone TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  template_id TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_recipient_type CHECK (recipient_type IN ('agent', 'seller', 'staff', 'admin')),
  CONSTRAINT check_channel CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  CONSTRAINT check_notification_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened'))
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_listing ON notification_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_email);

-- ============================================
-- 7. PORTAL SETTINGS (White-Label)
-- Agent-specific portal customization
-- ============================================

CREATE TABLE IF NOT EXISTS portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0066FF',
  secondary_color TEXT DEFAULT '#1a1a2e',
  font_family TEXT DEFAULT 'Inter',
  custom_css TEXT,
  welcome_message TEXT,
  footer_text TEXT,
  show_powered_by BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- ============================================
-- 8. FEEDBACK & RATINGS
-- Client satisfaction tracking
-- ============================================

CREATE TABLE IF NOT EXISTS client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  category TEXT,
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_feedback_agent ON client_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_feedback_listing ON client_feedback(listing_id);

-- ============================================
-- 9. EMAIL TEMPLATES (F7)
-- Conditional email templates
-- ============================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category TEXT DEFAULT 'general',
  variables JSONB DEFAULT '[]',
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_template_category CHECK (category IN ('general', 'order', 'scheduling', 'delivery', 'marketing', 'reminder'))
);

-- Default templates
INSERT INTO email_templates (name, slug, subject, body_html, category, variables) VALUES
  ('Order Confirmed', 'order-confirmed', 'Your photography session is confirmed!', '<h1>Order Confirmed</h1><p>Hi {{agent_name}},</p><p>Your order #{{order_id}} has been confirmed.</p>', 'order', '["agent_name", "order_id", "address", "scheduled_date"]'),
  ('Seller Schedule Request', 'seller-schedule-request', 'Please select your availability for your property photo shoot', '<h1>Schedule Your Photo Shoot</h1><p>Hi {{seller_name}},</p><p>Please click below to select times when you''re available for the photo shoot at {{address}}.</p>', 'scheduling', '["seller_name", "address", "schedule_link"]'),
  ('Media Ready', 'media-ready', 'Your property photos are ready!', '<h1>Your Photos Are Ready</h1><p>Hi {{seller_name}},</p><p>The photos for {{address}} are now ready to view and download.</p>', 'delivery', '["seller_name", "address", "portal_link"]'),
  ('Delivery Complete', 'delivery-complete', 'Your media has been delivered', '<h1>Delivery Complete</h1><p>Hi {{agent_name}},</p><p>All media for {{address}} has been delivered.</p>', 'delivery', '["agent_name", "address", "listing_link"]')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 10. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE photographer_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Share links - public read by token
CREATE POLICY "Share links readable by token" ON share_links
  FOR SELECT USING (true);

-- Client messages - readable by related parties
CREATE POLICY "Client messages readable by listing access" ON client_messages
  FOR SELECT USING (true);

-- Seller schedules - public insert/read
CREATE POLICY "Seller schedules public access" ON seller_schedules
  FOR ALL USING (true);

-- Portal settings - agents can manage their own
CREATE POLICY "Portal settings by agent" ON portal_settings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Client feedback - public insert
CREATE POLICY "Client feedback public insert" ON client_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Client feedback readable" ON client_feedback
  FOR SELECT USING (true);

-- Email templates - admin only
CREATE POLICY "Email templates admin only" ON email_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Update stage_entered_at when ops_status changes
CREATE OR REPLACE FUNCTION update_stage_entered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.ops_status IS DISTINCT FROM NEW.ops_status THEN
    NEW.stage_entered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stage_entered_at ON listings;
CREATE TRIGGER trigger_update_stage_entered_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_entered_at();

-- Auto-update updated_at for portal_settings
CREATE OR REPLACE FUNCTION update_portal_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_portal_settings_updated_at ON portal_settings;
CREATE TRIGGER trigger_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_settings_updated_at();

-- ============================================
-- DONE
-- ============================================
