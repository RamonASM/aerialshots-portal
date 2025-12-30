-- Review Request System
-- Automated review requests after media delivery

-- Review Request Table
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Request Details
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp', 'trustpilot')),
  review_url TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'completed', 'cancelled', 'bounced')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Communication
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,

  -- Tracking
  email_id TEXT, -- Resend message ID
  tracking_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review Response Table (optional - for tracking submissions)
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,

  -- Response Details
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  platform_review_id TEXT, -- External ID if available

  -- Sentiment (AI analyzed)
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review Request Templates
CREATE TABLE IF NOT EXISTS review_request_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template Info
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp', 'trustpilot', 'all')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),

  -- Content
  subject TEXT, -- For email
  email_body TEXT,
  sms_body TEXT,

  -- Variables available: {{agent_name}}, {{listing_address}}, {{review_url}}, {{company_name}}

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default templates
INSERT INTO review_request_templates (name, platform, channel, subject, email_body, sms_body, is_default) VALUES
(
  'Google Review - Email',
  'google',
  'email',
  'How was your experience with Aerial Shots Media?',
  E'Hi {{agent_name}},\n\nThank you for choosing Aerial Shots Media for your recent listing at {{listing_address}}!\n\nWe hope you loved your photos. Would you mind taking a moment to share your experience?\n\n{{review_url}}\n\nYour feedback helps us continue providing exceptional service.\n\nBest,\nThe Aerial Shots Media Team',
  NULL,
  true
),
(
  'Google Review - SMS',
  'google',
  'sms',
  NULL,
  NULL,
  'Hi {{agent_name}}! Thank you for using Aerial Shots Media. We''d love your feedback: {{review_url}}',
  false
),
(
  'Google Review - Both',
  'google',
  'both',
  'How was your experience with Aerial Shots Media?',
  E'Hi {{agent_name}},\n\nThank you for choosing Aerial Shots Media for your recent listing at {{listing_address}}!\n\nWe hope you loved your photos. Would you mind taking a moment to share your experience?\n\n{{review_url}}\n\nYour feedback helps us continue providing exceptional service.\n\nBest,\nThe Aerial Shots Media Team',
  'Hi {{agent_name}}! Thank you for using Aerial Shots Media. We''d love your feedback: {{review_url}}',
  false
);

-- Review Request Settings
CREATE TABLE IF NOT EXISTS review_request_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timing
  delay_after_delivery_ms INTEGER DEFAULT 7200000, -- 2 hours default
  send_time_start TIME DEFAULT '09:00:00', -- Don't send before 9am
  send_time_end TIME DEFAULT '20:00:00', -- Don't send after 8pm

  -- Limits
  max_requests_per_agent_per_month INTEGER DEFAULT 2,
  min_days_between_requests INTEGER DEFAULT 14,

  -- Channels
  default_channel TEXT DEFAULT 'email' CHECK (default_channel IN ('email', 'sms', 'both')),

  -- Platforms
  primary_platform TEXT DEFAULT 'google' CHECK (primary_platform IN ('google', 'facebook', 'yelp', 'trustpilot')),

  -- URLs
  google_review_url TEXT,
  facebook_review_url TEXT,
  yelp_review_url TEXT,
  trustpilot_review_url TEXT,

  is_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO review_request_settings (google_review_url) VALUES
('https://g.page/r/YOUR_REVIEW_LINK/review')
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX idx_review_requests_agent ON review_requests(agent_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_scheduled ON review_requests(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_review_requests_tracking ON review_requests(tracking_token);
CREATE INDEX idx_review_responses_request ON review_responses(review_request_id);

-- RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_request_settings ENABLE ROW LEVEL SECURITY;

-- Staff can manage everything
CREATE POLICY "Staff can manage review requests"
  ON review_requests FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

CREATE POLICY "Staff can manage review responses"
  ON review_responses FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

CREATE POLICY "Staff can manage review templates"
  ON review_request_templates FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

CREATE POLICY "Staff can manage review settings"
  ON review_request_settings FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Agents can view their own review requests
CREATE POLICY "Agents can view their review requests"
  ON review_requests FOR SELECT
  USING (agent_id = auth.uid());

-- Update timestamp trigger
CREATE TRIGGER update_review_requests_timestamp
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

CREATE TRIGGER update_review_templates_timestamp
  BEFORE UPDATE ON review_request_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

CREATE TRIGGER update_review_settings_timestamp
  BEFORE UPDATE ON review_request_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- View for review request stats
CREATE OR REPLACE VIEW review_request_stats AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent,
  COUNT(*) FILTER (WHERE status = 'clicked') AS clicked,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'clicked') / NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 1) AS click_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0), 1) AS completion_rate
FROM review_requests
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE review_requests;
