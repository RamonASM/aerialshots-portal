-- Made idempotent: 2026-01-07
-- Phase 12: Real-time & Polish
-- Notification center and real-time updates infrastructure

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

-- User notifications for the notification center
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('staff', 'agent')),

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'order_new',
    'order_status',
    'payment_received',
    'qc_complete',
    'delivery_ready',
    'edit_request',
    'task_assigned',
    'task_due',
    'system',
    'info',
    'warning',
    'error'
  )),

  -- Related entity
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user notifications lookup
CREATE INDEX IF NOT EXISTS idx_user_notifications_user
ON user_notifications(user_id, user_type, is_read, created_at DESC);

-- Index for unread count
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
ON user_notifications(user_id, user_type)
WHERE is_read = false AND is_archived = false;

-- =====================================================
-- REALTIME STATUS TRACKING
-- =====================================================

-- Entity status changes for real-time updates
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  triggered_by UUID,
  triggered_by_type TEXT CHECK (triggered_by_type IN ('staff', 'agent', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for realtime events lookup
CREATE INDEX IF NOT EXISTS idx_realtime_events_entity
ON realtime_events(entity_type, entity_id, created_at DESC);

-- Auto-cleanup old events (keep 7 days)
CREATE INDEX IF NOT EXISTS idx_realtime_events_cleanup
ON realtime_events(created_at);
-- (Removed partial index WHERE clause - NOW() is not immutable)

-- =====================================================
-- MAP/CALENDAR VIEW SUPPORT
-- =====================================================

-- Photographer schedules with location data (extends existing assignments)
CREATE TABLE IF NOT EXISTS schedule_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID,  -- Reference to photographer_assignments if exists
  job_id UUID,         -- Reference to listing/job
  photographer_id UUID NOT NULL REFERENCES staff(id),

  -- Location
  address TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,

  -- Time slot
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 60,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'en_route', 'arrived', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedule_locations_photographer
ON schedule_locations(photographer_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_schedule_locations_date
ON schedule_locations(scheduled_date, status);

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_schedule_locations_updated ON schedule_locations;
CREATE TRIGGER trigger_schedule_locations_updated
  BEFORE UPDATE ON schedule_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTIFICATION TRIGGERS
-- =====================================================

-- Function to create notifications for order status changes
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status changes
  IF OLD.ops_status IS DISTINCT FROM NEW.ops_status THEN
    -- Notify agent
    IF NEW.agent_id IS NOT NULL THEN
      INSERT INTO user_notifications (
        user_id, user_type, title, message, type,
        entity_type, entity_id, action_url
      ) VALUES (
        NEW.agent_id,
        'agent',
        'Order Status Updated',
        'Your order for ' || COALESCE(NEW.property_address, 'a property') || ' is now ' || NEW.ops_status,
        'order_status',
        'listing',
        NEW.id,
        '/dashboard/orders/' || NEW.order_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for listings status changes
DROP TRIGGER IF EXISTS trigger_listing_status_notification ON listings;
CREATE TRIGGER trigger_listing_status_notification
  AFTER UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_locations ENABLE ROW LEVEL SECURITY;

-- User notifications - users can only see their own
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT USING (
    (user_type = 'staff' AND EXISTS (
      SELECT 1 FROM staff WHERE id = user_id AND email = auth.jwt() ->> 'email'
    )) OR
    (user_type = 'agent' AND EXISTS (
      SELECT 1 FROM agents WHERE id = user_id AND email = auth.jwt() ->> 'email'
    ))
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE USING (
    (user_type = 'staff' AND EXISTS (
      SELECT 1 FROM staff WHERE id = user_id AND email = auth.jwt() ->> 'email'
    )) OR
    (user_type = 'agent' AND EXISTS (
      SELECT 1 FROM agents WHERE id = user_id AND email = auth.jwt() ->> 'email'
    ))
  );

-- Realtime events - staff can view all
DROP POLICY IF EXISTS "Staff can view realtime events" ON realtime_events;
DROP POLICY IF EXISTS "Staff can view realtime events" ON realtime_events;
CREATE POLICY "Staff can view realtime events" ON realtime_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email' AND is_active = true
    )
  );

-- Schedule locations - staff can manage
DROP POLICY IF EXISTS "Staff can manage schedule locations" ON schedule_locations;
DROP POLICY IF EXISTS "Staff can manage schedule locations" ON schedule_locations;
CREATE POLICY "Staff can manage schedule locations" ON schedule_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email' AND is_active = true
    )
  );

-- =====================================================
-- SUPABASE REALTIME SETUP
-- =====================================================

-- Enable realtime for key tables (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'realtime_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE realtime_events;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'schedule_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedule_locations;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_notifications IS 'User notification center items';
COMMENT ON TABLE realtime_events IS 'Real-time entity status changes for live updates';
COMMENT ON TABLE schedule_locations IS 'Photographer schedule locations for map view';

COMMENT ON COLUMN user_notifications.type IS 'Notification category for filtering and display';
COMMENT ON COLUMN realtime_events.event_type IS 'Type of change: created, updated, deleted, status_change';
COMMENT ON COLUMN schedule_locations.status IS 'Current status of the scheduled appointment';
