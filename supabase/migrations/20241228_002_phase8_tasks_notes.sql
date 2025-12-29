-- Phase 8: Task Management & Team Notes
-- Migration for task queue per job and team notes features

-- ============================================
-- JOB TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general' CHECK (task_type IN (
    'general',
    'photo_editing',
    'video_editing',
    'floor_plan',
    'virtual_staging',
    'drone_review',
    'qc_review',
    'delivery',
    'client_followup',
    'reshoot',
    'revision'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
  assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  blocked_reason TEXT,
  sort_order INTEGER DEFAULT 0,
  parent_task_id UUID REFERENCES job_tasks(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_tasks_listing
ON job_tasks(listing_id);

CREATE INDEX IF NOT EXISTS idx_job_tasks_order
ON job_tasks(order_id);

CREATE INDEX IF NOT EXISTS idx_job_tasks_assigned
ON job_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_job_tasks_status
ON job_tasks(status);

CREATE INDEX IF NOT EXISTS idx_job_tasks_due_date
ON job_tasks(due_date)
WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_job_tasks_priority
ON job_tasks(priority, status);

-- ============================================
-- JOB NOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN (
    'general',
    'internal',
    'client_visible',
    'photographer',
    'editor',
    'qc',
    'scheduling',
    'issue',
    'resolution'
  )),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  read_by UUID[] DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_notes_listing
ON job_notes(listing_id);

CREATE INDEX IF NOT EXISTS idx_job_notes_order
ON job_notes(order_id);

CREATE INDEX IF NOT EXISTS idx_job_notes_author
ON job_notes(author_id);

CREATE INDEX IF NOT EXISTS idx_job_notes_pinned
ON job_notes(listing_id, is_pinned)
WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_job_notes_mentions
ON job_notes USING GIN(mentions);

-- ============================================
-- TASK COMMENTS TABLE (for task discussions)
-- ============================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES job_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task
ON task_comments(task_id);

-- ============================================
-- TASK HISTORY TABLE (for audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES job_tasks(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task
ON task_history(task_id);

-- ============================================
-- TASK TEMPLATES TABLE (reusable task lists)
-- ============================================

CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  tasks JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed common task templates
INSERT INTO task_templates (name, description, service_type, tasks) VALUES
(
  'Standard Photo Shoot',
  'Default tasks for a standard photography session',
  'photography',
  '[
    {"title": "Review property details", "task_type": "general", "priority": "medium"},
    {"title": "Confirm shoot time with homeowner", "task_type": "scheduling", "priority": "high"},
    {"title": "Complete photo shoot", "task_type": "general", "priority": "high"},
    {"title": "Upload raw photos", "task_type": "general", "priority": "high"},
    {"title": "Edit photos", "task_type": "photo_editing", "priority": "high"},
    {"title": "QC review", "task_type": "qc_review", "priority": "high"},
    {"title": "Deliver to client", "task_type": "delivery", "priority": "high"}
  ]'::JSONB
),
(
  'Drone Photography',
  'Tasks for drone aerial photography',
  'drone',
  '[
    {"title": "Check airspace restrictions", "task_type": "drone_review", "priority": "high"},
    {"title": "Verify drone equipment", "task_type": "general", "priority": "medium"},
    {"title": "Complete aerial shoot", "task_type": "general", "priority": "high"},
    {"title": "Edit drone photos", "task_type": "photo_editing", "priority": "high"},
    {"title": "QC review", "task_type": "qc_review", "priority": "high"}
  ]'::JSONB
),
(
  'Video Production',
  'Tasks for listing video production',
  'video',
  '[
    {"title": "Review shot list", "task_type": "general", "priority": "medium"},
    {"title": "Complete video shoot", "task_type": "general", "priority": "high"},
    {"title": "Edit video", "task_type": "video_editing", "priority": "high"},
    {"title": "Add music and effects", "task_type": "video_editing", "priority": "medium"},
    {"title": "QC review", "task_type": "qc_review", "priority": "high"},
    {"title": "Render final versions", "task_type": "video_editing", "priority": "high"}
  ]'::JSONB
),
(
  'Virtual Staging',
  'Tasks for virtual staging',
  'staging',
  '[
    {"title": "Select photos for staging", "task_type": "virtual_staging", "priority": "high"},
    {"title": "Choose furniture style", "task_type": "virtual_staging", "priority": "medium"},
    {"title": "Complete virtual staging", "task_type": "virtual_staging", "priority": "high"},
    {"title": "Client review", "task_type": "client_followup", "priority": "high"},
    {"title": "Make revisions if needed", "task_type": "revision", "priority": "medium"}
  ]'::JSONB
)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Job tasks - staff can manage
CREATE POLICY "Staff can manage job tasks"
ON job_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Job notes - staff can manage
CREATE POLICY "Staff can manage job notes"
ON job_notes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Task comments - staff can manage
CREATE POLICY "Staff can manage task comments"
ON task_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Task history - staff can view
CREATE POLICY "Staff can view task history"
ON task_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Task templates - staff can manage
CREATE POLICY "Staff can manage task templates"
ON task_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for job_tasks
CREATE OR REPLACE FUNCTION update_job_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_tasks_timestamp ON job_tasks;
CREATE TRIGGER update_job_tasks_timestamp
  BEFORE UPDATE ON job_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_job_task_timestamp();

-- Track task status changes
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assigned_to, 'status', OLD.status, NEW.status);

    -- Set completed_at when task is marked complete
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      NEW.completed_at = NOW();
    END IF;
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assigned_by, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO task_history (task_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, NEW.assigned_to, 'priority', OLD.priority, NEW.priority);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_task_changes ON job_tasks;
CREATE TRIGGER log_task_changes
  BEFORE UPDATE ON job_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_status_change();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get task statistics for a listing
CREATE OR REPLACE FUNCTION get_listing_task_stats(p_listing_id UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  completed_tasks BIGINT,
  blocked_tasks BIGINT,
  overdue_tasks BIGINT,
  completion_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_tasks,
    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()) as overdue_tasks,
    CASE
      WHEN COUNT(*) FILTER (WHERE status != 'cancelled') > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL /
         COUNT(*) FILTER (WHERE status != 'cancelled')) * 100, 2
      )
      ELSE 0
    END as completion_rate
  FROM job_tasks
  WHERE listing_id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Get staff workload summary
CREATE OR REPLACE FUNCTION get_staff_workload(p_staff_id UUID)
RETURNS TABLE (
  assigned_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  due_today BIGINT,
  overdue BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as assigned_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date::DATE = CURRENT_DATE) as due_today,
    COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND due_date < NOW()) as overdue
  FROM job_tasks
  WHERE assigned_to = p_staff_id
    AND status NOT IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE job_tasks IS 'Task queue for managing work items per job/listing';
COMMENT ON TABLE job_notes IS 'Team notes and communication on jobs';
COMMENT ON TABLE task_comments IS 'Comments and discussions on individual tasks';
COMMENT ON TABLE task_history IS 'Audit trail of task changes';
COMMENT ON TABLE task_templates IS 'Reusable task list templates by service type';
