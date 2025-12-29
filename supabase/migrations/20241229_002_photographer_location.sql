-- =============================================
-- Photographer Location Tracking
-- Enables real-time location updates for sellers
-- =============================================

-- Table for tracking photographer locations during shoots
CREATE TABLE IF NOT EXISTS photographer_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2), -- GPS accuracy in meters
  heading DECIMAL(5, 2), -- Direction in degrees (0-360)
  speed DECIMAL(6, 2), -- Speed in m/s
  status TEXT DEFAULT 'en_route' CHECK (status IN ('en_route', 'arriving', 'on_site', 'shooting', 'departing', 'offline')),
  eta_minutes INTEGER, -- Estimated time of arrival
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by staff
CREATE INDEX IF NOT EXISTS idx_photographer_locations_staff ON photographer_locations(staff_id);

-- Index for fast lookups by listing
CREATE INDEX IF NOT EXISTS idx_photographer_locations_listing ON photographer_locations(listing_id);

-- Index for fast lookups by recent updates (for cleanup)
CREATE INDEX IF NOT EXISTS idx_photographer_locations_updated ON photographer_locations(last_updated_at DESC);

-- Enable RLS
ALTER TABLE photographer_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can update their own location
CREATE POLICY "Staff can update own location"
  ON photographer_locations
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM staff WHERE id = photographer_locations.staff_id
    )
  );

-- Policy: Clients can view location for their bookings
CREATE POLICY "Clients can view photographer location for their bookings"
  ON photographer_locations
  FOR SELECT
  USING (
    listing_id IN (
      SELECT l.id FROM listings l
      JOIN clients c ON l.client_id = c.id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Policy: Admin/staff can view all locations
CREATE POLICY "Staff can view all locations"
  ON photographer_locations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM staff WHERE is_active = true
    )
  );

-- Function to update location and broadcast via realtime
CREATE OR REPLACE FUNCTION update_photographer_location(
  p_staff_id UUID,
  p_listing_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_accuracy DECIMAL DEFAULT NULL,
  p_heading DECIMAL DEFAULT NULL,
  p_speed DECIMAL DEFAULT NULL,
  p_status TEXT DEFAULT 'en_route',
  p_eta_minutes INTEGER DEFAULT NULL
)
RETURNS photographer_locations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result photographer_locations;
BEGIN
  -- Upsert the location
  INSERT INTO photographer_locations (
    staff_id, listing_id, latitude, longitude,
    accuracy, heading, speed, status, eta_minutes, last_updated_at
  )
  VALUES (
    p_staff_id, p_listing_id, p_latitude, p_longitude,
    p_accuracy, p_heading, p_speed, p_status, p_eta_minutes, NOW()
  )
  ON CONFLICT (staff_id)
  DO UPDATE SET
    listing_id = EXCLUDED.listing_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy = EXCLUDED.accuracy,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    status = EXCLUDED.status,
    eta_minutes = EXCLUDED.eta_minutes,
    last_updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Add unique constraint on staff_id for upsert
ALTER TABLE photographer_locations
ADD CONSTRAINT photographer_locations_staff_unique UNIQUE (staff_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE photographer_locations;

-- Cleanup function - remove stale locations (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_stale_photographer_locations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM photographer_locations
  WHERE last_updated_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Comment for documentation
COMMENT ON TABLE photographer_locations IS 'Real-time photographer location tracking for seller visibility during shoots';
