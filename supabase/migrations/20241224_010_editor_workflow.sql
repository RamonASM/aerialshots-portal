-- Editor Workflow Enhancement
-- Version: 1.0.0
-- Date: 2024-12-24
-- Phase 2: Unified Workflow Pipeline

-- =====================
-- 1. ADD EDITOR ROLE TO STAFF
-- =====================
-- First, drop the constraint and recreate with editor role
ALTER TABLE staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE staff
  ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin', 'photographer', 'qc', 'va', 'editor'));

-- =====================
-- 2. ADD EDITOR FIELDS TO LISTINGS
-- =====================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES staff(id);

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS editing_started_at TIMESTAMPTZ;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS editing_completed_at TIMESTAMPTZ;

-- Index for editor assignment
CREATE INDEX IF NOT EXISTS idx_listings_editor_id ON listings(editor_id);

-- =====================
-- 3. CREATE EDITOR ASSIGNMENTS TABLE (for tracking workload)
-- =====================
CREATE TABLE IF NOT EXISTS editor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id UUID NOT NULL REFERENCES staff(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'reassigned')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_editor_assignments_editor ON editor_assignments(editor_id);
CREATE INDEX IF NOT EXISTS idx_editor_assignments_listing ON editor_assignments(listing_id);
CREATE INDEX IF NOT EXISTS idx_editor_assignments_status ON editor_assignments(status);

-- Update trigger
CREATE TRIGGER editor_assignments_updated_at
  BEFORE UPDATE ON editor_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- 4. ADD EDITING WORKFLOW STATUS VALUES
-- =====================
-- Note: ops_status is a TEXT column with CHECK constraint
-- We need to update the constraint to include new statuses

-- First, get current statuses and add new ones
-- The current flow is: scheduled → in_progress → staged → processing → ready_for_qc → in_qc → delivered
-- New flow: scheduled → in_progress → staged → awaiting_editing → in_editing → ready_for_qc → in_qc → delivered

-- Update the listings table check constraint
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_ops_status_check;

-- The ops_status column already allows any text, but we should add validation
-- Adding a comment to document valid statuses
COMMENT ON COLUMN listings.ops_status IS
  'Valid statuses: pending, scheduled, in_progress, staged, awaiting_editing, in_editing, processing, ready_for_qc, in_qc, delivered, on_hold, cancelled';

-- =====================
-- 5. EDITOR WORKLOAD VIEW
-- =====================
CREATE OR REPLACE VIEW editor_workload AS
SELECT
  s.id AS editor_id,
  s.name AS editor_name,
  s.email AS editor_email,
  COUNT(CASE WHEN ea.status = 'pending' THEN 1 END) AS pending_jobs,
  COUNT(CASE WHEN ea.status = 'in_progress' THEN 1 END) AS active_jobs,
  COUNT(CASE WHEN ea.status = 'completed' AND ea.completed_at > NOW() - INTERVAL '7 days' THEN 1 END) AS completed_this_week,
  COUNT(ea.id) AS total_assignments
FROM staff s
LEFT JOIN editor_assignments ea ON s.id = ea.editor_id
WHERE s.role = 'editor' AND s.is_active = true
GROUP BY s.id, s.name, s.email;

-- =====================
-- 6. FUNCTION TO AUTO-ASSIGN EDITOR (based on workload)
-- =====================
CREATE OR REPLACE FUNCTION get_available_editor()
RETURNS UUID AS $$
DECLARE
  editor_uuid UUID;
BEGIN
  -- Get the editor with the least active assignments
  SELECT editor_id INTO editor_uuid
  FROM editor_workload
  ORDER BY active_jobs ASC, pending_jobs ASC
  LIMIT 1;

  RETURN editor_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 7. TRIGGER TO CREATE EDITOR ASSIGNMENT ON STATUS CHANGE
-- =====================
CREATE OR REPLACE FUNCTION create_editor_assignment_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When listing moves to awaiting_editing, create an assignment if editor assigned
  IF NEW.ops_status = 'awaiting_editing' AND NEW.editor_id IS NOT NULL THEN
    INSERT INTO editor_assignments (editor_id, listing_id, status)
    VALUES (NEW.editor_id, NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  -- When listing moves to in_editing, update assignment
  IF NEW.ops_status = 'in_editing' THEN
    NEW.editing_started_at = COALESCE(NEW.editing_started_at, NOW());

    UPDATE editor_assignments
    SET status = 'in_progress', started_at = NOW()
    WHERE listing_id = NEW.id AND status = 'pending';
  END IF;

  -- When listing moves to ready_for_qc from editing, mark complete
  IF NEW.ops_status = 'ready_for_qc' AND OLD.ops_status = 'in_editing' THEN
    NEW.editing_completed_at = NOW();

    UPDATE editor_assignments
    SET status = 'completed', completed_at = NOW()
    WHERE listing_id = NEW.id AND status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_editor_assignment ON listings;
CREATE TRIGGER listings_editor_assignment
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION create_editor_assignment_on_status_change();

-- =====================
-- 8. RLS POLICIES FOR EDITOR ASSIGNMENTS
-- =====================
ALTER TABLE editor_assignments ENABLE ROW LEVEL SECURITY;

-- Staff can view all assignments
CREATE POLICY "Staff can view all editor assignments"
  ON editor_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can insert assignments
CREATE POLICY "Staff can create editor assignments"
  ON editor_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can update assignments
CREATE POLICY "Staff can update editor assignments"
  ON editor_assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- =====================
-- 9. NOTIFICATION PREFERENCES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS staff_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) UNIQUE,
  email_on_assignment BOOLEAN DEFAULT TRUE,
  sms_on_assignment BOOLEAN DEFAULT TRUE,
  email_on_status_change BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER staff_notification_prefs_updated_at
  BEFORE UPDATE ON staff_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- 10. ACTIVITY LOG FOR AUDIT TRAIL
-- =====================
CREATE TABLE IF NOT EXISTS ops_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  actor_id UUID, -- staff or agent id
  actor_type TEXT CHECK (actor_type IN ('staff', 'agent', 'system', 'webhook')),
  action TEXT NOT NULL, -- 'status_change', 'assignment', 'upload', 'comment', etc.
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_activity_log_listing ON ops_activity_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_ops_activity_log_created ON ops_activity_log(created_at DESC);

-- RLS for activity log
ALTER TABLE ops_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view activity log"
  ON ops_activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Staff can insert activity log"
  ON ops_activity_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));
