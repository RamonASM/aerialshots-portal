-- Tier 7: Integrations
-- Calendar connections for Google Calendar sync
-- Zapier webhooks for automation
-- Third-party service tracking

-- Calendar connections (Google Calendar, Outlook, etc.)
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google', -- google, outlook, apple
  calendar_id TEXT, -- Selected calendar ID
  calendar_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_direction TEXT DEFAULT 'push', -- push, pull, bidirectional
  last_sync_at TIMESTAMPTZ,
  sync_errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, provider)
);

-- Zapier webhooks for automation triggers
CREATE TABLE IF NOT EXISTS zapier_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  trigger_event TEXT NOT NULL, -- order_created, order_delivered, status_changed, etc.
  filter_conditions JSONB DEFAULT '{}', -- Optional filters
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zapier webhook logs
CREATE TABLE IF NOT EXISTS zapier_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES zapier_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Third-party integration status tracking
CREATE TABLE IF NOT EXISTS integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- fotello, cubicasa, zillow_3d
  external_job_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  ordered_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_url TEXT, -- URL to delivered asset
  result_data JSONB, -- Provider-specific result data
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  webhook_events JSONB DEFAULT '[]', -- Log of webhook events received
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add google_event_id to photographer_assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photographer_assignments'
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE photographer_assignments ADD COLUMN google_event_id TEXT;
  END IF;
END $$;

-- RLS Policies
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_jobs ENABLE ROW LEVEL SECURITY;

-- Calendar connections: staff can manage their own
CREATE POLICY "Staff can manage own calendar connections"
  ON calendar_connections
  FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Admin can view all calendar connections
CREATE POLICY "Admin can view all calendar connections"
  ON calendar_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Zapier webhooks: admin only
CREATE POLICY "Admin can manage zapier webhooks"
  ON zapier_webhooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Zapier logs: admin only
CREATE POLICY "Admin can view zapier logs"
  ON zapier_webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Integration jobs: staff can view
CREATE POLICY "Staff can view integration jobs"
  ON integration_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Admin can manage integration jobs
CREATE POLICY "Admin can manage integration jobs"
  ON integration_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_staff ON calendar_connections(staff_id);
CREATE INDEX IF NOT EXISTS idx_zapier_webhooks_event ON zapier_webhooks(trigger_event) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_zapier_logs_webhook ON zapier_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_listing ON integration_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_integration_jobs_provider_status ON integration_jobs(provider, status);
