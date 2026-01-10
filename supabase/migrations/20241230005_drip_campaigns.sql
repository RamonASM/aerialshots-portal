-- Made idempotent: 2026-01-07
-- Drip Campaign System
-- Multi-step automated email sequences

-- Drip Campaigns
CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('new_customer', 'delivery_complete', 'lapsed_90_days', 'lapsed_180_days', 'booking_complete', 'review_request', 'manual')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drip Campaign Steps
CREATE TABLE IF NOT EXISTS drip_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  subject TEXT NOT NULL,
  template_id TEXT, -- Reference to email template
  email_body TEXT, -- Raw HTML if no template
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(campaign_id, step_order)
);

-- Drip Enrollments
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES drip_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL, -- References agents or any contact
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'unenrolled')),
  current_step INTEGER DEFAULT 0,
  next_step_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(campaign_id, contact_id)
);

-- Drip Email Logs
CREATE TABLE IF NOT EXISTS drip_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES drip_enrollments(id) ON DELETE CASCADE,
  step_id UUID REFERENCES drip_campaign_steps(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
  email_id TEXT, -- Resend message ID
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Welcome Series Campaign
INSERT INTO drip_campaigns (id, name, description, trigger_type, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'New Agent Welcome Series', 'Automated onboarding emails for new agents', 'new_customer', true)
ON CONFLICT DO NOTHING;

-- Insert Welcome Series Steps
INSERT INTO drip_campaign_steps (campaign_id, step_order, delay_days, delay_hours, subject, email_body) VALUES
  ('00000000-0000-0000-0000-000000000001', 0, 0, 0, 'Welcome to Aerial Shots Media, {{first_name}}!', NULL),
  ('00000000-0000-0000-0000-000000000001', 1, 1, 0, 'Prepare Your Property for Amazing Photos', NULL),
  ('00000000-0000-0000-0000-000000000001', 2, 3, 0, 'Level Up Your Listings with Marketing Tools', NULL),
  ('00000000-0000-0000-0000-000000000001', 3, 7, 0, 'Earn $50 for Every Friend You Refer', NULL)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drip_campaigns_trigger ON drip_campaigns(trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drip_campaign_steps_campaign ON drip_campaign_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_campaign ON drip_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_contact ON drip_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_status ON drip_enrollments(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_next_step ON drip_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_drip_email_logs_enrollment ON drip_email_logs(enrollment_id);

-- RLS
ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE drip_email_logs ENABLE ROW LEVEL SECURITY;

-- Staff can manage campaigns
DROP POLICY IF EXISTS "Staff can manage drip campaigns" ON drip_campaigns;
CREATE POLICY "Staff can manage drip campaigns" ON drip_campaigns FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can manage drip steps" ON drip_campaign_steps;
CREATE POLICY "Staff can manage drip steps" ON drip_campaign_steps FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can manage drip enrollments" ON drip_enrollments;
CREATE POLICY "Staff can manage drip enrollments" ON drip_enrollments FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

DROP POLICY IF EXISTS "Staff can manage drip logs" ON drip_email_logs;
CREATE POLICY "Staff can manage drip logs" ON drip_email_logs FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Contacts can view their own enrollments
DROP POLICY IF EXISTS "Contacts can view their enrollments" ON drip_enrollments;
CREATE POLICY "Contacts can view their enrollments" ON drip_enrollments FOR SELECT
  USING (contact_id = auth.uid());

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_drip_campaigns_timestamp ON drip_campaigns;
CREATE TRIGGER update_drip_campaigns_timestamp
  BEFORE UPDATE ON drip_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

DROP TRIGGER IF EXISTS update_drip_enrollments_timestamp ON drip_enrollments;
CREATE TRIGGER update_drip_enrollments_timestamp
  BEFORE UPDATE ON drip_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE drip_enrollments;
