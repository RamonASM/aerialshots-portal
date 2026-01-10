-- Made idempotent: 2026-01-07
-- External Integrations System
-- OAuth tokens and integration settings for Canva, MLS, Dropbox, Slack

-- Agent Integrations Table
CREATE TABLE IF NOT EXISTS agent_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Integration Type
  integration_type TEXT NOT NULL CHECK (integration_type IN ('canva', 'mls', 'dropbox', 'slack')),

  -- OAuth Tokens
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,

  -- External User Info
  external_user_id TEXT,
  external_username TEXT,

  -- Integration-specific metadata
  metadata JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, integration_type)
);

-- OAuth State Table (for CSRF protection)
CREATE TABLE IF NOT EXISTS canva_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  redirect_after TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MLS Provider Configurations
CREATE TABLE IF NOT EXISTS mls_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('flexmls', 'matrix', 'bright', 'crmls', 'stellar', 'other')),

  -- API Configuration
  api_base_url TEXT,
  api_key TEXT,
  api_secret TEXT,

  -- Supported Features
  supports_photo_upload BOOLEAN DEFAULT true,
  supports_video_upload BOOLEAN DEFAULT false,
  supports_3d_tour BOOLEAN DEFAULT false,
  max_photos INTEGER DEFAULT 50,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent MLS Credentials
CREATE TABLE IF NOT EXISTS agent_mls_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  mls_provider_id UUID NOT NULL REFERENCES mls_providers(id) ON DELETE CASCADE,

  -- MLS Login
  mls_agent_id TEXT NOT NULL,
  mls_password TEXT, -- Encrypted
  mls_office_id TEXT,

  -- Status
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'active', 'error', 'disabled')),
  error_message TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, mls_provider_id)
);

-- Dropbox Folder Monitoring
CREATE TABLE IF NOT EXISTS dropbox_folder_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Folder Configuration
  folder_path TEXT NOT NULL,
  folder_id TEXT, -- Dropbox folder ID

  -- Processing Settings
  auto_create_listing BOOLEAN DEFAULT true,
  default_service_package TEXT,

  -- Monitoring Status
  last_check_at TIMESTAMPTZ,
  cursor TEXT, -- Dropbox cursor for delta sync

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, folder_path)
);

-- Slack Workspace Connections
CREATE TABLE IF NOT EXISTS slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workspace Info
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT,

  -- Bot Token
  bot_access_token TEXT,
  bot_user_id TEXT,

  -- Webhook
  incoming_webhook_url TEXT,
  incoming_webhook_channel TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Slack Preferences
CREATE TABLE IF NOT EXISTS agent_slack_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  slack_workspace_id UUID NOT NULL REFERENCES slack_workspaces(id) ON DELETE CASCADE,

  -- Channel Preferences
  notify_channel_id TEXT,
  dm_user_id TEXT,

  -- Notification Settings
  notify_on_booking BOOLEAN DEFAULT true,
  notify_on_delivery BOOLEAN DEFAULT true,
  notify_on_payment BOOLEAN DEFAULT true,
  notify_on_qc_complete BOOLEAN DEFAULT true,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agent_id, slack_workspace_id)
);

-- Insert default MLS providers
INSERT INTO mls_providers (name, slug, provider_type, supports_photo_upload, supports_video_upload, supports_3d_tour, max_photos) VALUES
  ('FlexMLS', 'flexmls', 'flexmls', true, true, true, 50),
  ('Matrix', 'matrix', 'matrix', true, false, true, 40),
  ('Bright MLS', 'bright', 'bright', true, true, true, 50),
  ('CRMLS', 'crmls', 'crmls', true, true, true, 100),
  ('Stellar MLS', 'stellar', 'stellar', true, true, true, 50)
ON CONFLICT (slug) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_integrations_agent ON agent_integrations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_integrations_type ON agent_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_canva_oauth_states_state ON canva_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_canva_oauth_states_expires ON canva_oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_mls_credentials_agent ON agent_mls_credentials(agent_id);
CREATE INDEX IF NOT EXISTS idx_dropbox_monitors_agent ON dropbox_folder_monitors(agent_id);
CREATE INDEX IF NOT EXISTS idx_slack_preferences_agent ON agent_slack_preferences(agent_id);

-- RLS
ALTER TABLE agent_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE canva_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE mls_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_mls_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropbox_folder_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_slack_preferences ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own integrations
DROP POLICY IF EXISTS "Agents can manage their integrations" ON agent_integrations;
CREATE POLICY "Agents can manage their integrations" ON agent_integrations FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Staff can view all integrations
DROP POLICY IF EXISTS "Staff can view all integrations" ON agent_integrations;
CREATE POLICY "Staff can view all integrations" ON agent_integrations FOR SELECT
  USING (auth.email() LIKE '%@aerialshots.media');

-- OAuth states accessible by owner
DROP POLICY IF EXISTS "Agents can access their OAuth states" ON canva_oauth_states;
CREATE POLICY "Agents can access their OAuth states" ON canva_oauth_states FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- MLS providers are public
DROP POLICY IF EXISTS "MLS providers are public" ON mls_providers;
CREATE POLICY "MLS providers are public" ON mls_providers FOR SELECT
  USING (true);

-- Staff can manage MLS providers
DROP POLICY IF EXISTS "Staff can manage MLS providers" ON mls_providers;
CREATE POLICY "Staff can manage MLS providers" ON mls_providers FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Agents can manage their MLS credentials
DROP POLICY IF EXISTS "Agents can manage their MLS credentials" ON agent_mls_credentials;
CREATE POLICY "Agents can manage their MLS credentials" ON agent_mls_credentials FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Agents can manage their Dropbox monitors
DROP POLICY IF EXISTS "Agents can manage their Dropbox monitors" ON dropbox_folder_monitors;
CREATE POLICY "Agents can manage their Dropbox monitors" ON dropbox_folder_monitors FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Staff can manage Slack workspaces
DROP POLICY IF EXISTS "Staff can manage Slack workspaces" ON slack_workspaces;
CREATE POLICY "Staff can manage Slack workspaces" ON slack_workspaces FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Agents can manage their Slack preferences
DROP POLICY IF EXISTS "Agents can manage their Slack preferences" ON agent_slack_preferences;
CREATE POLICY "Agents can manage their Slack preferences" ON agent_slack_preferences FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_agent_integrations_timestamp ON agent_integrations;
CREATE TRIGGER update_agent_integrations_timestamp
  BEFORE UPDATE ON agent_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

DROP TRIGGER IF EXISTS update_mls_providers_timestamp ON mls_providers;
CREATE TRIGGER update_mls_providers_timestamp
  BEFORE UPDATE ON mls_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

DROP TRIGGER IF EXISTS update_agent_mls_credentials_timestamp ON agent_mls_credentials;
CREATE TRIGGER update_agent_mls_credentials_timestamp
  BEFORE UPDATE ON agent_mls_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

DROP TRIGGER IF EXISTS update_dropbox_monitors_timestamp ON dropbox_folder_monitors;
CREATE TRIGGER update_dropbox_monitors_timestamp
  BEFORE UPDATE ON dropbox_folder_monitors
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

DROP TRIGGER IF EXISTS update_slack_workspaces_timestamp ON slack_workspaces;
CREATE TRIGGER update_slack_workspaces_timestamp
  BEFORE UPDATE ON slack_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- Cleanup expired OAuth states (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM canva_oauth_states -- REMOVED: partial index with NOW();
END;
$$ LANGUAGE plpgsql;

-- Realtime for agent integrations
ALTER PUBLICATION supabase_realtime ADD TABLE agent_integrations;
