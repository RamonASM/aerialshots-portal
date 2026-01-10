-- Made idempotent: 2026-01-07
-- Phase 6: FoundDR Integration
-- Portal-to-FoundDR HDR processing pipeline with QC dashboard and delivery workflow
-- Version: 1.0.0
-- Date: 2024-12-28

-- =====================
-- PROCESSING_JOBS (local tracking of FoundDR jobs)
-- =====================
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founddr_job_id UUID, -- ID from FoundDR backend
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'queued', 'processing',
    'completed', 'failed', 'cancelled'
  )),

  -- Processing details
  input_keys TEXT[] NOT NULL,
  output_key TEXT,
  bracket_count INTEGER,

  -- Timing
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Results
  metrics JSONB DEFAULT '{}',
  error_message TEXT,

  -- Webhook tracking
  webhook_received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_listing_id ON processing_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_founddr_job_id ON processing_jobs(founddr_job_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

DROP TRIGGER IF EXISTS processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER processing_jobs_updated_at
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- EXTEND MEDIA_ASSETS for FoundDR integration
-- =====================

-- Add FoundDR processing columns
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS processing_job_id UUID REFERENCES processing_jobs(id),
  ADD COLUMN IF NOT EXISTS processed_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS approved_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS qc_assigned_to UUID REFERENCES staff(id),
  ADD COLUMN IF NOT EXISTS needs_editing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER;

-- Update qc_status constraint to include new states
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_qc_status_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_qc_status_check
  CHECK (qc_status IN ('pending', 'processing', 'ready_for_qc', 'in_review', 'approved', 'rejected', 'needs_edit'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_media_assets_processing_job_id ON media_assets(processing_job_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_qc_assigned_to ON media_assets(qc_assigned_to);
CREATE INDEX IF NOT EXISTS idx_media_assets_needs_editing ON media_assets(needs_editing) WHERE needs_editing = TRUE;

-- =====================
-- INPAINTING_JOBS (AI object removal)
-- =====================
CREATE TABLE IF NOT EXISTS inpainting_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,

  -- Request details
  mask_data JSONB NOT NULL, -- Canvas mask coordinates/paths
  prompt TEXT DEFAULT 'remove object, natural background',
  negative_prompt TEXT,

  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  model_used TEXT DEFAULT 'stable-diffusion-inpaint',

  -- Paths
  input_path TEXT NOT NULL,
  mask_path TEXT,
  output_path TEXT,

  -- Results
  processing_time_ms INTEGER,
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inpainting_jobs_media_asset_id ON inpainting_jobs(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_inpainting_jobs_status ON inpainting_jobs(status);
CREATE INDEX IF NOT EXISTS idx_inpainting_jobs_created_by ON inpainting_jobs(created_by);

-- =====================
-- LIGHTROOM_EXPORTS (bridge for complex edits)
-- =====================
CREATE TABLE IF NOT EXISTS lightroom_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

  -- Export details
  media_asset_ids UUID[] NOT NULL,
  export_folder_name TEXT NOT NULL,
  export_path TEXT, -- Local path on editor's machine

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'exported', 'editing', 'reimporting', 'completed', 'failed'
  )),

  -- Tracking
  exported_by UUID REFERENCES staff(id),
  exported_at TIMESTAMPTZ,
  reimported_at TIMESTAMPTZ,
  reimported_count INTEGER DEFAULT 0,

  -- Notes
  edit_instructions TEXT,
  completion_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lightroom_exports_listing_id ON lightroom_exports(listing_id);
CREATE INDEX IF NOT EXISTS idx_lightroom_exports_status ON lightroom_exports(status);
CREATE INDEX IF NOT EXISTS idx_lightroom_exports_exported_by ON lightroom_exports(exported_by);

DROP TRIGGER IF EXISTS lightroom_exports_updated_at ON lightroom_exports;
CREATE TRIGGER lightroom_exports_updated_at
  BEFORE UPDATE ON lightroom_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- QC_SESSIONS (tracking editor productivity)
-- =====================
CREATE TABLE IF NOT EXISTS qc_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,

  -- Session metrics
  photos_reviewed INTEGER DEFAULT 0,
  photos_approved INTEGER DEFAULT 0,
  photos_rejected INTEGER DEFAULT 0,
  photos_edited INTEGER DEFAULT 0,
  inpainting_requests INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,

  -- Computed on session end
  avg_review_time_seconds DECIMAL(6,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_sessions_staff_id ON qc_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_qc_sessions_listing_id ON qc_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_qc_sessions_started_at ON qc_sessions(started_at DESC);

-- =====================
-- DELIVERY_NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS delivery_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),

  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'in_app')),
  template_key TEXT,
  subject TEXT,
  body TEXT,

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'
  )),

  -- External tracking
  external_id TEXT, -- SendGrid/Twilio message ID

  -- Timing
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notifications_listing_id ON delivery_notifications(listing_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_agent_id ON delivery_notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_status ON delivery_notifications(status);
CREATE INDEX IF NOT EXISTS idx_delivery_notifications_scheduled ON delivery_notifications(scheduled_for)
  WHERE status = 'pending' AND scheduled_for IS NOT NULL;

-- =====================
-- QC_QUEUE_PRIORITY (computed queue position)
-- =====================
CREATE VIEW qc_queue AS
SELECT
  ma.id AS media_asset_id,
  ma.listing_id,
  l.address,
  l.agent_id,
  a.name AS agent_name,
  l.is_rush,
  l.scheduled_at,
  ma.storage_path,
  ma.processed_storage_path,
  ma.qc_status,
  ma.qc_assigned_to,
  ma.needs_editing,
  pj.status AS processing_status,
  pj.completed_at AS processing_completed_at,
  -- Priority score: higher = more urgent
  (
    CASE WHEN l.is_rush THEN 1000 ELSE 0 END +
    CASE WHEN ma.qc_assigned_to IS NOT NULL THEN 500 ELSE 0 END +
    EXTRACT(EPOCH FROM (NOW() - COALESCE(pj.completed_at, ma.created_at))) / 60 -- minutes waiting
  ) AS priority_score
FROM media_assets ma
JOIN listings l ON ma.listing_id = l.id
JOIN agents a ON l.agent_id = a.id
LEFT JOIN processing_jobs pj ON ma.processing_job_id = pj.id
WHERE ma.qc_status IN ('ready_for_qc', 'in_review', 'needs_edit')
  AND ma.type = 'photo'
ORDER BY priority_score DESC;

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to calculate QC session metrics on end
CREATE OR REPLACE FUNCTION end_qc_session(p_session_id UUID)
RETURNS qc_sessions AS $$
DECLARE
  v_session qc_sessions;
  v_duration INTEGER;
  v_avg_time DECIMAL;
BEGIN
  -- Calculate duration
  SELECT EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
  INTO v_duration
  FROM qc_sessions WHERE id = p_session_id;

  -- Calculate average review time
  v_avg_time := CASE
    WHEN (SELECT photos_reviewed FROM qc_sessions WHERE id = p_session_id) > 0
    THEN v_duration::DECIMAL / (SELECT photos_reviewed FROM qc_sessions WHERE id = p_session_id)
    ELSE 0
  END;

  -- Update session
  UPDATE qc_sessions
  SET
    ended_at = NOW(),
    total_duration_seconds = v_duration,
    avg_review_time_seconds = v_avg_time
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- Function to get next QC item for a staff member
CREATE OR REPLACE FUNCTION get_next_qc_item(p_staff_id UUID)
RETURNS TABLE (
  media_asset_id UUID,
  listing_id UUID,
  address TEXT,
  is_rush BOOLEAN,
  storage_path TEXT,
  processed_storage_path TEXT
) AS $$
BEGIN
  -- First check for assigned items
  RETURN QUERY
  SELECT
    ma.id, ma.listing_id, l.address, l.is_rush,
    ma.storage_path, ma.processed_storage_path
  FROM media_assets ma
  JOIN listings l ON ma.listing_id = l.id
  WHERE ma.qc_assigned_to = p_staff_id
    AND ma.qc_status IN ('ready_for_qc', 'in_review', 'needs_edit')
  ORDER BY l.is_rush DESC, ma.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- Get next unassigned item
    RETURN QUERY
    SELECT
      ma.id, ma.listing_id, l.address, l.is_rush,
      ma.storage_path, ma.processed_storage_path
    FROM media_assets ma
    JOIN listings l ON ma.listing_id = l.id
    WHERE ma.qc_assigned_to IS NULL
      AND ma.qc_status = 'ready_for_qc'
    ORDER BY l.is_rush DESC, ma.created_at ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to move photos through delivery pipeline
CREATE OR REPLACE FUNCTION approve_and_deliver(
  p_listing_id UUID,
  p_staff_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Check for any pending QC items
  SELECT COUNT(*) INTO v_pending_count
  FROM media_assets
  WHERE listing_id = p_listing_id
    AND type = 'photo'
    AND qc_status NOT IN ('approved');

  IF v_pending_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- Update listing status
  UPDATE listings
  SET
    ops_status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_listing_id;

  -- Log the event
  INSERT INTO job_events (listing_id, event_type, new_value, actor_id, actor_type)
  VALUES (
    p_listing_id,
    'delivered',
    jsonb_build_object('delivered_by', p_staff_id, 'delivered_at', NOW()),
    p_staff_id,
    'staff'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on new tables
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inpainting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lightroom_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notifications ENABLE ROW LEVEL SECURITY;

-- Processing jobs: staff can view all, agents see their listings only
DROP POLICY IF EXISTS "Staff can view all processing jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Staff can view all processing jobs" ON processing_jobs;
CREATE POLICY "Staff can view all processing jobs" ON processing_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE id::text = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Agents can view own listing jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Agents can view own listing jobs" ON processing_jobs;
CREATE POLICY "Agents can view own listing jobs" ON processing_jobs
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id::text = auth.uid()::text
    )
  );

-- Inpainting jobs: staff only
DROP POLICY IF EXISTS "Staff can manage inpainting jobs" ON inpainting_jobs;
DROP POLICY IF EXISTS "Staff can manage inpainting jobs" ON inpainting_jobs;
CREATE POLICY "Staff can manage inpainting jobs" ON inpainting_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE id::text = auth.uid()::text)
  );

-- Lightroom exports: staff only
DROP POLICY IF EXISTS "Staff can manage lightroom exports" ON lightroom_exports;
DROP POLICY IF EXISTS "Staff can manage lightroom exports" ON lightroom_exports;
CREATE POLICY "Staff can manage lightroom exports" ON lightroom_exports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE id::text = auth.uid()::text)
  );

-- QC sessions: staff can view own, admins see all
DROP POLICY IF EXISTS "Staff can view own QC sessions" ON qc_sessions;
DROP POLICY IF EXISTS "Staff can view own QC sessions" ON qc_sessions;
CREATE POLICY "Staff can view own QC sessions" ON qc_sessions
  FOR SELECT USING (staff_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Staff can create own QC sessions" ON qc_sessions;
DROP POLICY IF EXISTS "Staff can create own QC sessions" ON qc_sessions;
CREATE POLICY "Staff can create own QC sessions" ON qc_sessions
  FOR INSERT WITH CHECK (staff_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Staff can update own QC sessions" ON qc_sessions;
DROP POLICY IF EXISTS "Staff can update own QC sessions" ON qc_sessions;
CREATE POLICY "Staff can update own QC sessions" ON qc_sessions
  FOR UPDATE USING (staff_id::text = auth.uid()::text);

-- Delivery notifications: staff can manage, agents can view own
DROP POLICY IF EXISTS "Staff can manage delivery notifications" ON delivery_notifications;
DROP POLICY IF EXISTS "Staff can manage delivery notifications" ON delivery_notifications;
CREATE POLICY "Staff can manage delivery notifications" ON delivery_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE id::text = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Agents can view own notifications" ON delivery_notifications;
DROP POLICY IF EXISTS "Agents can view own notifications" ON delivery_notifications;
CREATE POLICY "Agents can view own notifications" ON delivery_notifications
  FOR SELECT USING (agent_id::text = auth.uid()::text);

-- =====================
-- REALTIME SUBSCRIPTIONS
-- =====================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE media_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_notifications;

-- =====================
-- COMMENTS
-- =====================

COMMENT ON TABLE processing_jobs IS 'Tracks FoundDR HDR processing jobs initiated from the portal';
COMMENT ON TABLE inpainting_jobs IS 'AI-powered object removal requests using Stable Diffusion';
COMMENT ON TABLE lightroom_exports IS 'Bridge for complex edits requiring Adobe Lightroom Classic';
COMMENT ON TABLE qc_sessions IS 'Tracks QC specialist productivity and review sessions';
COMMENT ON TABLE delivery_notifications IS 'Notifications sent to agents when photos are ready';
COMMENT ON VIEW qc_queue IS 'Prioritized queue of photos awaiting QC review';
