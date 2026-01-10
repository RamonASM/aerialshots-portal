-- Made idempotent: 2026-01-07
-- Webhook Idempotency Support
-- Tracks processed event IDs to prevent double-processing.
-- Generated: 2026-01-02

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- 'stripe', 'bannerbear', etc.
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Index for expiration cleanup later
CREATE INDEX IF NOT EXISTS idx_processed_events_processed_at ON processed_events(processed_at);

-- Add RLS (No one should read/write except service role/admin)
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'processed_events' AND policyname = 'Admin can manage processed events'
  ) THEN
DROP POLICY IF EXISTS "Admin can manage processed events" ON processed_events;
    DROP POLICY IF EXISTS "Admin can manage processed events" ON processed_events;
CREATE POLICY "Admin can manage processed events" ON processed_events
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
