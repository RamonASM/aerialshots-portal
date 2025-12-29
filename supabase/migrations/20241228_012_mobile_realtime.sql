-- Tier 9: Mobile & Real-Time Features
-- Push notifications, device tokens, real-time subscriptions

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL, -- p256dh and auth keys
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  -- Notification type preferences
  order_updates BOOLEAN DEFAULT TRUE,
  delivery_notifications BOOLEAN DEFAULT TRUE,
  payment_reminders BOOLEAN DEFAULT TRUE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  system_alerts BOOLEAN DEFAULT TRUE,
  -- Schedule preferences
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Real-time presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online', -- 'online', 'away', 'busy', 'offline'
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  current_page TEXT,
  device_info JSONB,
  UNIQUE(user_id)
);

-- Offline action queue (for sync when back online)
CREATE TABLE IF NOT EXISTS offline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'update_order', 'upload_media', etc.
  action_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Push notification history
CREATE TABLE IF NOT EXISTS push_notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_history ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Users can see their own presence
CREATE POLICY "Users can manage their own presence"
  ON user_presence
  FOR ALL
  USING (user_id = auth.uid());

-- Staff can see all presence
CREATE POLICY "Staff can view all presence"
  ON user_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own offline actions
CREATE POLICY "Users can manage their own offline actions"
  ON offline_actions
  FOR ALL
  USING (user_id = auth.uid());

-- Users can view their own notification history
CREATE POLICY "Users can view their own notification history"
  ON push_notification_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Staff can manage all notification history
CREATE POLICY "Staff can manage notification history"
  ON push_notification_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_offline_actions_user_status ON offline_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_push_history_user ON push_notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_push_history_status ON push_notification_history(status);

-- Function to update presence
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for presence updates
DROP TRIGGER IF EXISTS update_presence_timestamp ON user_presence;
CREATE TRIGGER update_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_presence();

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
