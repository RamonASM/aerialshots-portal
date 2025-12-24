-- Photographer Assignments
-- Version: 1.0.0
-- Date: 2024-12-24
-- Phase 2.4: Assignment System

-- =====================
-- 1. ADD PHOTOGRAPHER FIELD TO LISTINGS
-- =====================
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS photographer_id UUID REFERENCES staff(id);

-- Index for photographer assignment
CREATE INDEX IF NOT EXISTS idx_listings_photographer_id ON listings(photographer_id);

-- =====================
-- 2. CREATE PHOTOGRAPHER ASSIGNMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS photographer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES staff(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'reassigned', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photographer_assignments_photographer ON photographer_assignments(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photographer_assignments_listing ON photographer_assignments(listing_id);
CREATE INDEX IF NOT EXISTS idx_photographer_assignments_status ON photographer_assignments(status);
CREATE INDEX IF NOT EXISTS idx_photographer_assignments_scheduled ON photographer_assignments(scheduled_at);

-- Update trigger
CREATE TRIGGER photographer_assignments_updated_at
  BEFORE UPDATE ON photographer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- 3. PHOTOGRAPHER WORKLOAD VIEW
-- =====================
CREATE OR REPLACE VIEW photographer_workload AS
SELECT
  s.id AS photographer_id,
  s.name AS photographer_name,
  s.email AS photographer_email,
  s.phone AS photographer_phone,
  COUNT(CASE WHEN pa.status = 'pending' THEN 1 END) AS pending_jobs,
  COUNT(CASE WHEN pa.status = 'confirmed' THEN 1 END) AS confirmed_jobs,
  COUNT(CASE WHEN pa.status = 'in_progress' THEN 1 END) AS active_jobs,
  COUNT(CASE WHEN pa.status = 'completed' AND pa.completed_at > NOW() - INTERVAL '7 days' THEN 1 END) AS completed_this_week,
  COUNT(pa.id) AS total_assignments,
  -- Today's schedule
  COUNT(CASE WHEN pa.scheduled_at::date = CURRENT_DATE THEN 1 END) AS jobs_today
FROM staff s
LEFT JOIN photographer_assignments pa ON s.id = pa.photographer_id
WHERE s.role = 'photographer' AND s.is_active = true
GROUP BY s.id, s.name, s.email, s.phone;

-- =====================
-- 4. FUNCTION TO GET AVAILABLE PHOTOGRAPHERS
-- =====================
CREATE OR REPLACE FUNCTION get_available_photographers(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  photographer_id UUID,
  photographer_name TEXT,
  jobs_on_date BIGINT,
  pending_jobs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    COUNT(CASE WHEN pa.scheduled_at::date = target_date THEN 1 END),
    COUNT(CASE WHEN pa.status = 'pending' OR pa.status = 'confirmed' THEN 1 END)
  FROM staff s
  LEFT JOIN photographer_assignments pa ON s.id = pa.photographer_id
  WHERE s.role = 'photographer' AND s.is_active = true
  GROUP BY s.id, s.name
  ORDER BY COUNT(CASE WHEN pa.scheduled_at::date = target_date THEN 1 END) ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 5. TRIGGER TO SYNC PHOTOGRAPHER ASSIGNMENT
-- =====================
CREATE OR REPLACE FUNCTION sync_photographer_assignment_on_listing_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When photographer is assigned to listing
  IF NEW.photographer_id IS NOT NULL AND (OLD.photographer_id IS NULL OR OLD.photographer_id != NEW.photographer_id) THEN
    -- Create photographer assignment
    INSERT INTO photographer_assignments (photographer_id, listing_id, scheduled_at, status)
    VALUES (NEW.photographer_id, NEW.id, NEW.scheduled_at, 'confirmed')
    ON CONFLICT DO NOTHING;

    -- Log activity
    INSERT INTO ops_activity_log (listing_id, actor_type, action, details)
    VALUES (NEW.id, 'system', 'photographer_assigned', jsonb_build_object(
      'photographer_id', NEW.photographer_id
    ));
  END IF;

  -- When listing status changes to in_progress, update assignment
  IF NEW.ops_status = 'in_progress' AND OLD.ops_status != 'in_progress' THEN
    UPDATE photographer_assignments
    SET status = 'in_progress', started_at = NOW()
    WHERE listing_id = NEW.id AND status IN ('pending', 'confirmed');
  END IF;

  -- When listing moves to staged (photography done)
  IF NEW.ops_status = 'staged' AND OLD.ops_status = 'in_progress' THEN
    UPDATE photographer_assignments
    SET status = 'completed', completed_at = NOW()
    WHERE listing_id = NEW.id AND status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_photographer_assignment ON listings;
CREATE TRIGGER listings_photographer_assignment
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION sync_photographer_assignment_on_listing_update();

-- =====================
-- 6. RLS POLICIES
-- =====================
ALTER TABLE photographer_assignments ENABLE ROW LEVEL SECURITY;

-- Staff can view all assignments
CREATE POLICY "Staff can view all photographer assignments"
  ON photographer_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can insert assignments
CREATE POLICY "Staff can create photographer assignments"
  ON photographer_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can update assignments
CREATE POLICY "Staff can update photographer assignments"
  ON photographer_assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- =====================
-- 7. UNIFIED STAFF AVAILABILITY VIEW
-- =====================
CREATE OR REPLACE VIEW staff_availability AS
SELECT
  s.id,
  s.name,
  s.email,
  s.phone,
  s.role,
  s.is_active,
  CASE
    WHEN s.role = 'photographer' THEN (
      SELECT COUNT(*) FROM photographer_assignments pa
      WHERE pa.photographer_id = s.id AND pa.scheduled_at::date = CURRENT_DATE
    )
    WHEN s.role = 'editor' THEN (
      SELECT COUNT(*) FROM editor_assignments ea
      WHERE ea.editor_id = s.id AND ea.status IN ('pending', 'in_progress')
    )
    ELSE 0
  END AS current_workload,
  CASE
    WHEN s.role = 'photographer' THEN (
      SELECT COUNT(*) FROM photographer_assignments pa
      WHERE pa.photographer_id = s.id AND pa.status IN ('pending', 'confirmed')
    )
    WHEN s.role = 'editor' THEN (
      SELECT COUNT(*) FROM editor_assignments ea
      WHERE ea.editor_id = s.id AND ea.status = 'pending'
    )
    ELSE 0
  END AS pending_jobs
FROM staff s
WHERE s.is_active = true AND s.role IN ('photographer', 'editor', 'qc');

COMMENT ON TABLE photographer_assignments IS 'Tracks photographer job assignments and scheduling';
COMMENT ON VIEW staff_availability IS 'Shows current workload for all operational staff';
