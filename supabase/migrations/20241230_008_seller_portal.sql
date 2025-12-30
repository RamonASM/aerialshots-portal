-- =============================================
-- Seller Portal Migration
-- Enables home sellers to track photographers, view deliverables,
-- and manage scheduling
-- =============================================

-- ============================================
-- 1. SELLER ACCESS CONTROLS
-- Controls whether sellers can view media deliverables
-- ============================================

CREATE TABLE IF NOT EXISTS seller_access_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  media_access_enabled BOOLEAN DEFAULT false,
  granted_by_payment BOOLEAN DEFAULT false,
  granted_by_agent BOOLEAN DEFAULT false,
  granted_by_admin BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  granted_by_user_id UUID, -- who granted access
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_seller_access_controls_listing
  ON seller_access_controls(listing_id);

-- Enable RLS
ALTER TABLE seller_access_controls ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can manage all access controls
CREATE POLICY "Staff can manage seller access controls"
  ON seller_access_controls
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM staff WHERE is_active = true
    )
  );

-- Policy: Agents can view/update access for their listings
CREATE POLICY "Agents can manage access for their listings"
  ON seller_access_controls
  FOR ALL
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE a.auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 2. RESCHEDULE REQUESTS
-- Sellers can request to reschedule shoots
-- ============================================

CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  original_date TIMESTAMPTZ,
  requested_slots JSONB NOT NULL DEFAULT '[]', -- Array of preferred date/time slots
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  admin_notes TEXT,
  handled_by UUID REFERENCES staff(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reschedule requests
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_listing
  ON reschedule_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status
  ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_created
  ON reschedule_requests(created_at DESC);

-- Enable RLS
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can manage all reschedule requests
CREATE POLICY "Staff can manage reschedule requests"
  ON reschedule_requests
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM staff WHERE is_active = true
    )
  );

-- Policy: Agents can view reschedule requests for their listings
CREATE POLICY "Agents can view reschedule requests for their listings"
  ON reschedule_requests
  FOR SELECT
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE a.auth_user_id = auth.uid()
    )
  );

-- Policy: Anyone with a valid share link can insert reschedule requests
-- (Uses service role for anonymous insert via API)

-- ============================================
-- 3. UPDATE SHARE_LINKS CONSTRAINT
-- Add 'seller' link type for seller portal access
-- ============================================

-- Drop the existing constraint
ALTER TABLE share_links DROP CONSTRAINT IF EXISTS check_link_type;

-- Add updated constraint with 'seller' type
ALTER TABLE share_links ADD CONSTRAINT check_link_type
  CHECK (link_type IN ('media', 'schedule', 'status', 'seller'));

-- ============================================
-- 4. SELLER PORTAL VIEWS (Performance optimization)
-- ============================================

-- Function to get seller portal data by token
CREATE OR REPLACE FUNCTION get_seller_portal_data(p_token TEXT)
RETURNS TABLE (
  listing_id UUID,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  scheduled_at TIMESTAMPTZ,
  ops_status TEXT,
  media_access_enabled BOOLEAN,
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  photographer_name TEXT,
  photographer_lat DECIMAL,
  photographer_lng DECIMAL,
  photographer_status TEXT,
  photographer_eta INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.address,
    l.city,
    l.state,
    l.zip,
    l.scheduled_at,
    l.ops_status,
    COALESCE(sac.media_access_enabled, false),
    a.name AS agent_name,
    a.email AS agent_email,
    a.phone AS agent_phone,
    s.name AS photographer_name,
    pl.latitude,
    pl.longitude,
    pl.status,
    pl.eta_minutes
  FROM share_links sl
  JOIN listings l ON sl.listing_id = l.id
  LEFT JOIN agents a ON l.agent_id = a.id
  LEFT JOIN seller_access_controls sac ON l.id = sac.listing_id
  LEFT JOIN staff s ON l.assigned_photographer_id = s.id
  LEFT JOIN photographer_locations pl ON s.id = pl.staff_id AND pl.listing_id = l.id
  WHERE sl.share_token = p_token
    AND sl.link_type = 'seller'
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > NOW());
END;
$$;

-- Function to check if seller has media access
CREATE OR REPLACE FUNCTION check_seller_media_access(p_listing_id UUID, p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- Check if token is valid and linked to listing
  SELECT EXISTS (
    SELECT 1 FROM share_links
    WHERE share_token = p_token
    AND listing_id = p_listing_id
    AND link_type = 'seller'
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO has_access;

  IF NOT has_access THEN
    RETURN false;
  END IF;

  -- Check access control
  SELECT COALESCE(sac.media_access_enabled, false)
  INTO has_access
  FROM seller_access_controls sac
  WHERE sac.listing_id = p_listing_id;

  IF has_access THEN
    RETURN true;
  END IF;

  -- Check if paid via order
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.listing_id = p_listing_id
    AND o.payment_status = 'paid'
  ) INTO has_access;

  RETURN has_access;
END;
$$;

-- ============================================
-- 5. ENABLE REALTIME FOR SELLER TRACKING
-- ============================================

-- Ensure photographer_locations is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'photographer_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE photographer_locations;
  END IF;
END $$;

-- Ensure reschedule_requests is in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE reschedule_requests;

-- Ensure seller_access_controls is in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE seller_access_controls;

-- ============================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Trigger for seller_access_controls
CREATE OR REPLACE FUNCTION update_seller_access_controls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seller_access_controls_updated_at
  BEFORE UPDATE ON seller_access_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_access_controls_updated_at();

-- Trigger for reschedule_requests
CREATE OR REPLACE FUNCTION update_reschedule_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reschedule_requests_updated_at
  BEFORE UPDATE ON reschedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_reschedule_requests_updated_at();

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE seller_access_controls IS 'Controls whether sellers can view media deliverables for a listing';
COMMENT ON TABLE reschedule_requests IS 'Sellers can request to reschedule shoots through the seller portal';
COMMENT ON FUNCTION get_seller_portal_data(TEXT) IS 'Retrieves all seller portal data by share token';
COMMENT ON FUNCTION check_seller_media_access(UUID, TEXT) IS 'Checks if seller has media access for a listing';
