-- ============================================================================
-- CRITICAL SECURITY FIX: Enable Row Level Security on ALL existing tables
-- ============================================================================
--
-- ISSUE: RLS policies were defined but some tables didn't have RLS enabled.
--
-- This migration enables RLS on every PUBLIC table that exists in the database.
--
-- Date: January 1, 2025 (Updated: January 7, 2026 for idempotency)
-- ============================================================================

-- Enable RLS on all public tables that exist
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- Test Accounts for E2E Testing (wrapped in exception handlers)
-- ============================================================================

-- Test Agent
DO $$
BEGIN
  INSERT INTO agents (id, name, email)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'Test Agent', 'agent@test.aerialshots.media')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test agent: %', SQLERRM;
END $$;

-- Test Staff
DO $$
BEGIN
  INSERT INTO staff (id, name, email, role) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Test Photographer', 'photographer@test.aerialshots.media', 'photographer'),
    ('b0000000-0000-0000-0000-000000000002', 'Test Editor', 'editor@test.aerialshots.media', 'editor'),
    ('b0000000-0000-0000-0000-000000000003', 'Test Videographer', 'videographer@test.aerialshots.media', 'videographer'),
    ('b0000000-0000-0000-0000-000000000004', 'Test QC Reviewer', 'qc@test.aerialshots.media', 'qc'),
    ('b0000000-0000-0000-0000-000000000005', 'Test Admin', 'admin@test.aerialshots.media', 'admin')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test staff: %', SQLERRM;
END $$;

-- Test Listing
DO $$
BEGIN
  INSERT INTO listings (id, agent_id, address, city, state, zip, status, ops_status)
  VALUES ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
          '123 Test Street', 'Orlando', 'FL', '32801', 'active', 'pending')
  ON CONFLICT (id) DO UPDATE SET address = EXCLUDED.address, status = EXCLUDED.status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test listing: %', SQLERRM;
END $$;

-- Test Order
DO $$
BEGIN
  INSERT INTO orders (id, contact_name, contact_email, property_address, property_city, property_state, property_zip, status, source)
  VALUES ('d0000000-0000-0000-0000-000000000001', 'Test Agent', 'agent@test.aerialshots.media',
          '123 Test Street', 'Orlando', 'FL', '32801', 'paid', 'e2e_test')
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test order: %', SQLERRM;
END $$;

-- Test Photographer Assignment
DO $$
BEGIN
  INSERT INTO photographer_assignments (id, photographer_id, listing_id, scheduled_at, status)
  VALUES ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
          'c0000000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days', 'confirmed')
  ON CONFLICT (id) DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at, status = EXCLUDED.status;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test assignment: %', SQLERRM;
END $$;

-- Test Community
DO $$
BEGIN
  INSERT INTO communities (id, name, slug, city, state, latitude, longitude)
  VALUES ('f0000000-0000-0000-0000-000000000001', 'Test Community', 'test-community',
          'Orlando', 'FL', 28.5383, -81.3792)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test community: %', SQLERRM;
END $$;

-- Test Service Availability
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_availability') THEN
    INSERT INTO service_availability (date, total_slots, booked_slots, blocked_slots, morning_available, afternoon_available, evening_available, is_peak, price_modifier)
    SELECT generate_series(CURRENT_DATE + 1, CURRENT_DATE + 7, INTERVAL '1 day')::DATE,
           6, 0, 0, TRUE, TRUE, FALSE, FALSE, 1.00
    ON CONFLICT (date) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test availability: %', SQLERRM;
END $$;

-- Test Booking Time Slots
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_time_slots') THEN
    INSERT INTO booking_time_slots (date, start_time, end_time, status, duration_minutes)
    SELECT d::DATE, t::TIME, (t + INTERVAL '2 hours')::TIME, 'available', 120
    FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 3, INTERVAL '1 day') d,
         generate_series('09:00'::TIME, '15:00'::TIME, INTERVAL '2 hours') t
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create test time slots: %', SQLERRM;
END $$;
