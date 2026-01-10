-- Made idempotent: 2026-01-07
-- Phase 9: Edit Requests & Order Modifications
-- Migration for post-delivery edit requests and service additions

-- ============================================
-- EDIT REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN (
    'photo_retouching',
    'color_correction',
    'sky_replacement',
    'object_removal',
    'virtual_staging_revision',
    'video_edit',
    'floor_plan_correction',
    'add_watermark',
    'remove_watermark',
    'crop_resize',
    'exposure_adjustment',
    'other'
  )),

  -- Affected assets
  asset_ids UUID[] DEFAULT '{}',

  -- Description
  title TEXT NOT NULL,
  description TEXT,
  reference_images TEXT[] DEFAULT '{}',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'reviewing',
    'approved',
    'in_progress',
    'completed',
    'rejected',
    'cancelled'
  )),

  -- Priority and urgency
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_rush BOOLEAN DEFAULT FALSE,

  -- Assignment
  assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Billing
  is_billable BOOLEAN DEFAULT FALSE,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  invoice_id UUID,

  -- Timestamps
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_edit_requests_listing
ON edit_requests(listing_id);

CREATE INDEX IF NOT EXISTS idx_edit_requests_order
ON edit_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_edit_requests_agent
ON edit_requests(agent_id);

CREATE INDEX IF NOT EXISTS idx_edit_requests_status
ON edit_requests(status)
WHERE status NOT IN ('completed', 'rejected', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_edit_requests_assigned
ON edit_requests(assigned_to)
WHERE status IN ('approved', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_edit_requests_priority
ON edit_requests(priority, status);

-- ============================================
-- EDIT REQUEST COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS edit_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edit_request_id UUID NOT NULL REFERENCES edit_requests(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('agent', 'staff', 'system')),
  author_id UUID,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edit_request_comments_request
ON edit_request_comments(edit_request_id);

-- ============================================
-- ORDER MODIFICATIONS TABLE (Service Additions)
-- ============================================

CREATE TABLE IF NOT EXISTS order_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,

  -- Modification type
  modification_type TEXT NOT NULL CHECK (modification_type IN (
    'add_service',
    'remove_service',
    'upgrade_package',
    'downgrade_package',
    'reschedule',
    'change_contact',
    'apply_discount',
    'price_adjustment'
  )),

  -- Service details (for add/remove service)
  service_id TEXT,
  service_name TEXT,
  service_price DECIMAL(10, 2),
  quantity INTEGER DEFAULT 1,

  -- Price impact
  price_change DECIMAL(10, 2) NOT NULL DEFAULT 0,
  original_total DECIMAL(10, 2),
  new_total DECIMAL(10, 2),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'applied',
    'rejected',
    'cancelled'
  )),

  -- Notes and reason
  reason TEXT,
  notes TEXT,

  -- Who requested/approved
  requested_by UUID,
  requested_by_type TEXT CHECK (requested_by_type IN ('agent', 'staff', 'system')),
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_modifications_order
ON order_modifications(order_id);

CREATE INDEX IF NOT EXISTS idx_order_modifications_listing
ON order_modifications(listing_id);

CREATE INDEX IF NOT EXISTS idx_order_modifications_status
ON order_modifications(status)
WHERE status = 'pending';

-- ============================================
-- SERVICE CATALOG TABLE (for upsells)
-- ============================================

CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'photography',
    'video',
    'drone',
    'floor_plan',
    'virtual_staging',
    '3d_tour',
    'marketing',
    'add_on'
  )),

  -- Pricing
  base_price DECIMAL(10, 2) NOT NULL,
  price_per_sqft DECIMAL(10, 4),
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),

  -- Pricing tiers (JSONB for flexibility)
  pricing_tiers JSONB DEFAULT '{}',

  -- Time estimates
  estimated_duration_minutes INTEGER,
  estimated_turnaround_hours INTEGER,

  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  is_addon BOOLEAN DEFAULT FALSE,
  requires_services TEXT[] DEFAULT '{}',

  -- Display
  display_order INTEGER DEFAULT 0,
  icon TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed service catalog
INSERT INTO service_catalog (service_key, name, description, category, base_price, is_addon, display_order) VALUES
('hdr_photos', 'HDR Photography', 'Professional HDR photos of the property', 'photography', 175.00, false, 1),
('drone_photos', 'Drone Aerial Photos', 'Aerial photography from drone', 'drone', 125.00, true, 2),
('drone_video', 'Drone Aerial Video', 'Aerial video footage from drone', 'drone', 175.00, true, 3),
('listing_video', 'Listing Video', 'Professional property video tour', 'video', 250.00, false, 4),
('signature_video', 'Signature Video', 'Premium cinematic property video', 'video', 450.00, false, 5),
('zillow_3d', 'Zillow 3D Tour', 'Interactive 3D walkthrough for Zillow', '3d_tour', 150.00, true, 6),
('matterport', 'Matterport 3D Tour', 'Full Matterport 3D scan', '3d_tour', 250.00, true, 7),
('floor_plan_2d', '2D Floor Plan', 'Detailed 2D floor plan drawing', 'floor_plan', 75.00, true, 8),
('floor_plan_3d', '3D Floor Plan', 'Interactive 3D floor plan', 'floor_plan', 125.00, true, 9),
('virtual_staging', 'Virtual Staging', 'Digital furniture staging per room', 'virtual_staging', 35.00, true, 10),
('virtual_twilight', 'Virtual Twilight', 'Day-to-dusk photo conversion', 'marketing', 25.00, true, 11),
('social_media_kit', 'Social Media Kit', 'Optimized images for social platforms', 'marketing', 50.00, true, 12),
('rush_delivery', 'Rush Delivery', '24-hour turnaround upgrade', 'add_on', 75.00, true, 13),
('weekend_shoot', 'Weekend Scheduling', 'Saturday/Sunday shoot availability', 'add_on', 50.00, true, 14)
ON CONFLICT (service_key) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

-- Edit requests - staff can manage all, agents can view/create their own
DROP POLICY IF EXISTS "Staff can manage all edit requests" ON edit_requests;
CREATE POLICY "Staff can manage all edit requests" ON edit_requests FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

DROP POLICY IF EXISTS "Agents can view their edit requests" ON edit_requests;
CREATE POLICY "Agents can view their edit requests" ON edit_requests FOR SELECT
TO authenticated
USING (
  agent_id IN (
    SELECT id FROM agents
    WHERE agents.email = auth.jwt()->>'email'
  )
);

DROP POLICY IF EXISTS "Agents can create edit requests" ON edit_requests;
CREATE POLICY "Agents can create edit requests" ON edit_requests FOR INSERT
TO authenticated
WITH CHECK (
  agent_id IN (
    SELECT id FROM agents
    WHERE agents.email = auth.jwt()->>'email'
  )
);

-- Edit request comments - staff can manage, agents can view non-internal
DROP POLICY IF EXISTS "Staff can manage edit request comments" ON edit_request_comments;
CREATE POLICY "Staff can manage edit request comments" ON edit_request_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

DROP POLICY IF EXISTS "Agents can view non-internal comments" ON edit_request_comments;
CREATE POLICY "Agents can view non-internal comments" ON edit_request_comments FOR SELECT
TO authenticated
USING (
  is_internal = false
  AND edit_request_id IN (
    SELECT id FROM edit_requests
    WHERE agent_id IN (
      SELECT id FROM agents
      WHERE agents.email = auth.jwt()->>'email'
    )
  )
);

-- Order modifications - staff only
DROP POLICY IF EXISTS "Staff can manage order modifications" ON order_modifications;
CREATE POLICY "Staff can manage order modifications" ON order_modifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Service catalog - read by all authenticated, write by staff
DROP POLICY IF EXISTS "Anyone can view service catalog" ON service_catalog;
CREATE POLICY "Anyone can view service catalog" ON service_catalog FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage service catalog" ON service_catalog;
CREATE POLICY "Staff can manage service catalog" ON service_catalog FOR ALL
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

-- Auto-update updated_at for edit_requests
CREATE OR REPLACE FUNCTION update_edit_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_edit_requests_timestamp ON edit_requests;
CREATE TRIGGER update_edit_requests_timestamp
  BEFORE UPDATE ON edit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_edit_request_timestamp();

-- Track status changes
CREATE OR REPLACE FUNCTION log_edit_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Auto-set resolved fields when completing
    IF NEW.status IN ('completed', 'rejected') AND OLD.status NOT IN ('completed', 'rejected') THEN
      NEW.resolved_at = NOW();
    END IF;

    -- Auto-set assigned fields when assigning
    IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL THEN
      NEW.assigned_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_edit_request_changes ON edit_requests;
CREATE TRIGGER log_edit_request_changes
  BEFORE UPDATE ON edit_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_edit_request_status_change();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get edit request statistics
CREATE OR REPLACE FUNCTION get_edit_request_stats()
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  in_progress_requests BIGINT,
  completed_today BIGINT,
  avg_resolution_hours DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_requests,
    COUNT(*) FILTER (WHERE status = 'completed' AND resolved_at::DATE = CURRENT_DATE) as completed_today,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL), 2) as avg_resolution_hours
  FROM edit_requests;
END;
$$ LANGUAGE plpgsql;

-- Get agent's edit request summary
CREATE OR REPLACE FUNCTION get_agent_edit_requests(p_agent_id UUID)
RETURNS TABLE (
  total BIGINT,
  pending BIGINT,
  in_progress BIGINT,
  completed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status IN ('reviewing', 'approved', 'in_progress')) as in_progress,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
  FROM edit_requests
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE edit_requests IS 'Post-delivery edit requests from agents';
COMMENT ON TABLE edit_request_comments IS 'Communication thread on edit requests';
COMMENT ON TABLE order_modifications IS 'Service additions and order changes';
COMMENT ON TABLE service_catalog IS 'Available services for ordering and upsells';
