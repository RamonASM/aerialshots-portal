-- Made idempotent: 2026-01-07
-- Team Territories Migration
-- Tier 5: Team Operations - Territory Management

-- Service Territories table
CREATE TABLE IF NOT EXISTS service_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  zip_codes TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff to Territory assignments (many-to-many)
CREATE TABLE IF NOT EXISTS staff_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES service_territories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, territory_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_territories_active ON service_territories(is_active);
CREATE INDEX IF NOT EXISTS idx_service_territories_zip ON service_territories USING GIN(zip_codes);
CREATE INDEX IF NOT EXISTS idx_service_territories_cities ON service_territories USING GIN(cities);
CREATE INDEX IF NOT EXISTS idx_staff_territories_staff ON staff_territories(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_territories_territory ON staff_territories(territory_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_service_territories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_territories_updated ON service_territories;
CREATE TRIGGER service_territories_updated
  BEFORE UPDATE ON service_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_service_territories_timestamp();

-- RLS Policies
ALTER TABLE service_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_territories ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with territories
DROP POLICY IF EXISTS "Admin full access to territories" ON service_territories;
CREATE POLICY "Admin full access to territories" ON service_territories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Staff can view territories" ON service_territories;
CREATE POLICY "Staff can view territories" ON service_territories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin full access to staff_territories" ON staff_territories;
CREATE POLICY "Admin full access to staff_territories" ON staff_territories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Staff can view staff_territories" ON staff_territories;
CREATE POLICY "Staff can view staff_territories" ON staff_territories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE service_territories IS 'Geographic service areas for team assignment';
COMMENT ON TABLE staff_territories IS 'Staff member to territory assignments';
