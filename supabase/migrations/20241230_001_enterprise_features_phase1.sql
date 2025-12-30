-- =====================================================
-- ENTERPRISE FEATURES PHASE 1: BOOKING INTELLIGENCE
-- ASM Portal - Airspace, Travel Fees, Weather, Reference Photos
-- =====================================================

-- =====================================================
-- 1. BUSINESS SETTINGS TABLE
-- Configurable settings for travel fees, cutoff times, etc.
-- =====================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES staff(id)
);

-- Insert default settings
INSERT INTO business_settings (setting_key, setting_value, description) VALUES
('travel_fees', '{
  "home_base_lat": 28.5383,
  "home_base_lng": -81.3792,
  "home_base_address": "Orlando, FL",
  "free_radius_miles": 25,
  "per_mile_rate_cents": 75,
  "minimum_fee_cents": 0,
  "maximum_fee_cents": 15000,
  "round_trip": true
}'::jsonb, 'Travel fee calculation settings'),
('booking_cutoff', '{
  "same_day_cutoff_hours": 0,
  "next_day_cutoff_hour": 18,
  "next_day_cutoff_minute": 0,
  "minimum_advance_hours": 24,
  "holiday_blackout_dates": []
}'::jsonb, 'Booking cutoff time settings'),
('weather_alerts', '{
  "rain_threshold_percent": 30,
  "wind_threshold_mph": 15,
  "show_forecast_days": 7
}'::jsonb, 'Weather alert thresholds for scheduling')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 2. LISTING AIRSPACE TRACKING
-- Track airspace qualification status for drone services
-- =====================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS airspace_qualified BOOLEAN DEFAULT NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS airspace_status TEXT
  CHECK (airspace_status IN ('clear', 'caution', 'restricted', 'prohibited', 'unknown'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS airspace_checked_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS airspace_result JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS front_facing_direction TEXT
  CHECK (front_facing_direction IN ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS optimal_shoot_times JSONB;

-- =====================================================
-- 3. BOOKING REFERENCE FILES
-- Allow clients to upload property lines, inspiration photos
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_reference_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  seller_schedule_id UUID REFERENCES seller_schedules(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN (
    'property_line',
    'inspiration',
    'example_shot',
    'access_info',
    'lot_survey',
    'other'
  )),
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'booking-references',
  original_filename TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  notes TEXT,
  uploaded_by_email TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_ref_listing ON booking_reference_files(listing_id);
CREATE INDEX idx_booking_ref_schedule ON booking_reference_files(seller_schedule_id);

-- =====================================================
-- 4. WEATHER FORECASTS CACHE
-- Cache weather data to avoid repeated API calls
-- =====================================================
CREATE TABLE IF NOT EXISTS weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_data JSONB NOT NULL,
  -- Forecast details for quick access
  high_temp_f INTEGER,
  low_temp_f INTEGER,
  precipitation_chance INTEGER, -- 0-100
  wind_speed_mph INTEGER,
  conditions TEXT, -- 'sunny', 'cloudy', 'rain', etc.
  -- Cache management
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  source TEXT DEFAULT 'openweathermap',
  UNIQUE(latitude, longitude, forecast_date)
);

CREATE INDEX idx_weather_location ON weather_forecasts(latitude, longitude);
CREATE INDEX idx_weather_date ON weather_forecasts(forecast_date);
CREATE INDEX idx_weather_expires ON weather_forecasts(expires_at);

-- =====================================================
-- 5. TERRITORY AVAILABILITY
-- Configure which territories are available on which days
-- =====================================================
CREATE TABLE IF NOT EXISTS territory_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID REFERENCES service_territories(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_active BOOLEAN DEFAULT TRUE,
  max_bookings INTEGER, -- Optional cap per day
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(territory_id, day_of_week)
);

-- =====================================================
-- 6. SELLER SCHEDULE ENHANCEMENTS
-- Add arrival windows, vacant property support
-- =====================================================
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS arrival_window_minutes INTEGER DEFAULT 60;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS flexible_timing BOOLEAN DEFAULT FALSE;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS is_vacant_property BOOLEAN DEFAULT FALSE;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS anytime_available BOOLEAN DEFAULT FALSE;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS anytime_start_date DATE;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS anytime_end_date DATE;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS access_instructions TEXT;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS lockbox_code TEXT;
ALTER TABLE seller_schedules ADD COLUMN IF NOT EXISTS gate_code TEXT;

-- =====================================================
-- 7. APPOINTMENT WAITLIST
-- Allow clients to join waitlist for fully booked days
-- =====================================================
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  agent_id UUID REFERENCES agents(id),
  territory_id UUID REFERENCES service_territories(id),
  desired_date DATE NOT NULL,
  desired_time_preference TEXT CHECK (desired_time_preference IN (
    'morning', 'afternoon', 'anytime', 'specific'
  )),
  specific_time TIME, -- If time_preference is 'specific'
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  property_address TEXT,
  services_requested TEXT[], -- Array of service types
  estimated_duration_minutes INTEGER,
  priority INTEGER DEFAULT 0, -- Higher = more priority
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'notified', 'booked', 'expired', 'cancelled'
  )),
  notes TEXT,
  notified_at TIMESTAMPTZ,
  notification_expires_at TIMESTAMPTZ, -- 2 hour window to claim
  booked_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_date ON appointment_waitlist(desired_date);
CREATE INDEX idx_waitlist_status ON appointment_waitlist(status);
CREATE INDEX idx_waitlist_territory ON appointment_waitlist(territory_id);

-- =====================================================
-- 8. TRAVEL FEE HISTORY
-- Track calculated travel fees for orders
-- =====================================================
CREATE TABLE IF NOT EXISTS travel_fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  listing_id UUID REFERENCES listings(id),
  origin_lat DECIMAL(10, 7),
  origin_lng DECIMAL(10, 7),
  destination_lat DECIMAL(10, 7),
  destination_lng DECIMAL(10, 7),
  distance_miles DECIMAL(10, 2),
  drive_time_minutes INTEGER,
  calculated_fee_cents INTEGER,
  applied_fee_cents INTEGER, -- May differ if capped or waived
  is_round_trip BOOLEAN DEFAULT TRUE,
  waived BOOLEAN DEFAULT FALSE,
  waive_reason TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_travel_fee_order ON travel_fee_calculations(order_id);
CREATE INDEX idx_travel_fee_listing ON travel_fee_calculations(listing_id);

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Business settings - staff only
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view business settings"
  ON business_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admin can update business settings"
  ON business_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
      AND role IN ('admin', 'owner')
    )
  );

-- Booking reference files
ALTER TABLE booking_reference_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all reference files"
  ON booking_reference_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Agents can view their own reference files"
  ON booking_reference_files FOR SELECT
  TO authenticated
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE agent_id IN (
        SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

CREATE POLICY "Anyone can insert reference files"
  ON booking_reference_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Weather forecasts - public read for efficiency
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weather forecasts"
  ON weather_forecasts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service can insert weather forecasts"
  ON weather_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Appointment waitlist
ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all waitlist entries"
  ON appointment_waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Agents can view their own waitlist entries"
  ON appointment_waitlist FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Anyone can join waitlist"
  ON appointment_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate distance between two points (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  R CONSTANT DECIMAL := 3959; -- Earth radius in miles
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get business setting value
CREATE OR REPLACE FUNCTION get_business_setting(key TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT setting_value
    FROM business_settings
    WHERE setting_key = key
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if date/time is within booking cutoff
CREATE OR REPLACE FUNCTION is_within_booking_cutoff(
  booking_date DATE,
  booking_time TIME DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  cutoff JSONB;
  cutoff_hour INTEGER;
  cutoff_minute INTEGER;
  min_advance_hours INTEGER;
  now_ts TIMESTAMPTZ := NOW();
  booking_ts TIMESTAMPTZ;
BEGIN
  cutoff := get_business_setting('booking_cutoff');
  cutoff_hour := (cutoff->>'next_day_cutoff_hour')::INTEGER;
  cutoff_minute := (cutoff->>'next_day_cutoff_minute')::INTEGER;
  min_advance_hours := (cutoff->>'minimum_advance_hours')::INTEGER;

  -- Build booking timestamp
  IF booking_time IS NOT NULL THEN
    booking_ts := booking_date + booking_time;
  ELSE
    booking_ts := booking_date + TIME '09:00';
  END IF;

  -- Check minimum advance time
  IF booking_ts < now_ts + (min_advance_hours || ' hours')::INTERVAL THEN
    RETURN FALSE;
  END IF;

  -- Check next-day cutoff
  IF booking_date = CURRENT_DATE + 1 THEN
    IF CURRENT_TIME > (cutoff_hour || ':' || cutoff_minute)::TIME THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Auto-update updated_at on business_settings
CREATE OR REPLACE FUNCTION update_business_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_settings_updated
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_timestamp();

-- Auto-update waitlist entry
CREATE OR REPLACE FUNCTION update_waitlist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_updated
  BEFORE UPDATE ON appointment_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_timestamp();
