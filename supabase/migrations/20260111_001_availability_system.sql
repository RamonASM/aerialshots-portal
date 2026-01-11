-- Photographer Availability and Time Off System
-- Migration: 20260111_001_availability_system.sql

-- =====================================================
-- PHOTOGRAPHER AVAILABILITY TABLE
-- Tracks daily availability windows for staff
-- =====================================================
CREATE TABLE IF NOT EXISTS photographer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Time windows (null means full day availability/unavailability)
  available_from TIME,
  available_to TIME,

  -- Availability status
  is_available BOOLEAN DEFAULT true,

  -- Max jobs for this specific day (overrides staff.max_daily_jobs)
  max_jobs_override INTEGER,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one entry per staff per date
  UNIQUE(staff_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_photographer_availability_staff_date
  ON photographer_availability(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_photographer_availability_date
  ON photographer_availability(date);

-- =====================================================
-- TIME OFF REQUESTS TABLE
-- Tracks time off requests from staff
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Request details
  reason TEXT NOT NULL CHECK (reason IN (
    'vacation', 'sick', 'personal', 'training',
    'equipment_maintenance', 'family_emergency', 'other'
  )),
  reason_details TEXT,

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES staff(id),
  review_notes TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure valid date range
  CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff
  ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates
  ON staff_time_off(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status
  ON staff_time_off(status);

-- =====================================================
-- RECURRING AVAILABILITY PATTERNS
-- For setting regular weekly schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS photographer_weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Time windows
  available_from TIME NOT NULL DEFAULT '08:00',
  available_to TIME NOT NULL DEFAULT '18:00',

  -- Is this day available by default?
  is_available BOOLEAN DEFAULT true,

  -- Max jobs for this day of week
  max_jobs INTEGER DEFAULT 4,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One schedule entry per staff per day of week
  UNIQUE(staff_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_photographer_weekly_schedule_staff
  ON photographer_weekly_schedule(staff_id);

-- =====================================================
-- EXTEND STAFF TABLE
-- Add availability-related fields
-- =====================================================
DO $$
BEGIN
  -- Default working hours
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'default_start_time'
  ) THEN
    ALTER TABLE staff ADD COLUMN default_start_time TIME DEFAULT '08:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'default_end_time'
  ) THEN
    ALTER TABLE staff ADD COLUMN default_end_time TIME DEFAULT '18:00';
  END IF;

  -- Time zone preference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE staff ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
  END IF;

  -- Vacation days allocation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'vacation_days_total'
  ) THEN
    ALTER TABLE staff ADD COLUMN vacation_days_total INTEGER DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'vacation_days_used'
  ) THEN
    ALTER TABLE staff ADD COLUMN vacation_days_used INTEGER DEFAULT 0;
  END IF;

  -- Sick days allocation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'sick_days_total'
  ) THEN
    ALTER TABLE staff ADD COLUMN sick_days_total INTEGER DEFAULT 5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'sick_days_used'
  ) THEN
    ALTER TABLE staff ADD COLUMN sick_days_used INTEGER DEFAULT 0;
  END IF;
END$$;

-- =====================================================
-- VIEW: Staff Availability Summary
-- Combines weekly schedule with specific overrides
-- =====================================================
CREATE OR REPLACE VIEW staff_availability_view AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.team_role,
  s.max_daily_jobs,
  s.default_start_time,
  s.default_end_time,
  s.vacation_days_total - COALESCE(s.vacation_days_used, 0) AS vacation_days_remaining,
  s.sick_days_total - COALESCE(s.sick_days_used, 0) AS sick_days_remaining,
  -- Count pending time off requests
  (SELECT COUNT(*) FROM staff_time_off t
   WHERE t.staff_id = s.id AND t.status = 'pending') AS pending_time_off_requests,
  -- Count approved upcoming time off
  (SELECT COUNT(*) FROM staff_time_off t
   WHERE t.staff_id = s.id
   AND t.status = 'approved'
   AND t.start_date >= CURRENT_DATE) AS upcoming_time_off_count
FROM staff s
WHERE s.is_active = true
AND s.team_role IN ('photographer', 'videographer');

-- =====================================================
-- FUNCTION: Check if staff is available on a date
-- =====================================================
CREATE OR REPLACE FUNCTION is_staff_available(
  p_staff_id UUID,
  p_date DATE,
  p_time TIME DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_available BOOLEAN;
  v_time_off_count INTEGER;
  v_specific_availability RECORD;
  v_weekly_schedule RECORD;
  v_day_of_week INTEGER;
BEGIN
  -- Check for approved time off
  SELECT COUNT(*) INTO v_time_off_count
  FROM staff_time_off
  WHERE staff_id = p_staff_id
    AND status = 'approved'
    AND p_date BETWEEN start_date AND end_date;

  IF v_time_off_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check for specific date override
  SELECT * INTO v_specific_availability
  FROM photographer_availability
  WHERE staff_id = p_staff_id
    AND date = p_date;

  IF FOUND THEN
    -- Has specific override for this date
    IF NOT v_specific_availability.is_available THEN
      RETURN FALSE;
    END IF;

    -- Check time window if time provided
    IF p_time IS NOT NULL AND v_specific_availability.available_from IS NOT NULL THEN
      RETURN p_time >= v_specific_availability.available_from
         AND p_time <= v_specific_availability.available_to;
    END IF;

    RETURN TRUE;
  END IF;

  -- Fall back to weekly schedule
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  SELECT * INTO v_weekly_schedule
  FROM photographer_weekly_schedule
  WHERE staff_id = p_staff_id
    AND day_of_week = v_day_of_week;

  IF FOUND THEN
    IF NOT v_weekly_schedule.is_available THEN
      RETURN FALSE;
    END IF;

    -- Check time window if time provided
    IF p_time IS NOT NULL THEN
      RETURN p_time >= v_weekly_schedule.available_from
         AND p_time <= v_weekly_schedule.available_to;
    END IF;

    RETURN TRUE;
  END IF;

  -- Default: available during weekdays (Mon-Fri)
  RETURN v_day_of_week BETWEEN 1 AND 5;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE photographer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE photographer_weekly_schedule ENABLE ROW LEVEL SECURITY;

-- Photographers can view and manage their own availability
CREATE POLICY "Staff can view own availability"
  ON photographer_availability FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert own availability"
  ON photographer_availability FOR INSERT
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update own availability"
  ON photographer_availability FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete own availability"
  ON photographer_availability FOR DELETE
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Admin/Owner can manage all availability
CREATE POLICY "Admin can manage all availability"
  ON photographer_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- Time Off Policies
CREATE POLICY "Staff can view own time off"
  ON staff_time_off FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can request time off"
  ON staff_time_off FOR INSERT
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can cancel own pending requests"
  ON staff_time_off FOR UPDATE
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
    AND status = 'pending'
  );

CREATE POLICY "Admin can manage all time off"
  ON staff_time_off FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- Weekly Schedule Policies
CREATE POLICY "Staff can view own weekly schedule"
  ON photographer_weekly_schedule FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage own weekly schedule"
  ON photographer_weekly_schedule FOR ALL
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all weekly schedules"
  ON photographer_weekly_schedule FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- =====================================================
-- TRIGGER: Update vacation/sick days used
-- =====================================================
CREATE OR REPLACE FUNCTION update_days_used()
RETURNS TRIGGER AS $$
DECLARE
  v_days INTEGER;
BEGIN
  -- Calculate days in the request
  v_days := NEW.end_date - NEW.start_date + 1;

  -- On approval, add to used days
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.reason = 'vacation' THEN
      UPDATE staff
      SET vacation_days_used = COALESCE(vacation_days_used, 0) + v_days
      WHERE id = NEW.staff_id;
    ELSIF NEW.reason = 'sick' THEN
      UPDATE staff
      SET sick_days_used = COALESCE(sick_days_used, 0) + v_days
      WHERE id = NEW.staff_id;
    END IF;
  END IF;

  -- On cancellation/rejection of approved request, subtract from used days
  IF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
    IF NEW.reason = 'vacation' THEN
      UPDATE staff
      SET vacation_days_used = GREATEST(0, COALESCE(vacation_days_used, 0) - v_days)
      WHERE id = NEW.staff_id;
    ELSIF NEW.reason = 'sick' THEN
      UPDATE staff
      SET sick_days_used = GREATEST(0, COALESCE(sick_days_used, 0) - v_days)
      WHERE id = NEW.staff_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_days_used ON staff_time_off;
CREATE TRIGGER trigger_update_days_used
  AFTER INSERT OR UPDATE ON staff_time_off
  FOR EACH ROW
  EXECUTE FUNCTION update_days_used();

-- =====================================================
-- TRIGGER: Auto-create availability blocks for time off
-- =====================================================
CREATE OR REPLACE FUNCTION create_availability_blocks_for_time_off()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
BEGIN
  -- When time off is approved, create unavailability blocks
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    FOR v_date IN SELECT generate_series(NEW.start_date, NEW.end_date, '1 day'::interval)::date
    LOOP
      INSERT INTO photographer_availability (staff_id, date, is_available, notes)
      VALUES (NEW.staff_id, v_date, false, 'Time off: ' || NEW.reason)
      ON CONFLICT (staff_id, date)
      DO UPDATE SET is_available = false, notes = 'Time off: ' || NEW.reason;
    END LOOP;
  END IF;

  -- When time off is cancelled/rejected, remove the blocks
  IF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
    DELETE FROM photographer_availability
    WHERE staff_id = NEW.staff_id
      AND date BETWEEN NEW.start_date AND NEW.end_date
      AND notes LIKE 'Time off:%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_availability_blocks ON staff_time_off;
CREATE TRIGGER trigger_create_availability_blocks
  AFTER INSERT OR UPDATE ON staff_time_off
  FOR EACH ROW
  EXECUTE FUNCTION create_availability_blocks_for_time_off();
