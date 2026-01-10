-- Test Staff Accounts for Development/Testing
-- These accounts use email aliases so emails still go to ramon@aerialshots.media

-- Insert test photographer
INSERT INTO staff (email, name, role, phone, is_active)
VALUES ('ramon+photographer@aerialshots.media', 'Test Photographer', 'photographer', '555-0001', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = true;

-- Insert test QC specialist
INSERT INTO staff (email, name, role, phone, is_active)
VALUES ('ramon+qc@aerialshots.media', 'Test QC Specialist', 'qc', '555-0002', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = true;

-- Insert test editor (using 'va' role since 'editor' constraint may not exist in prod DB)
INSERT INTO staff (email, name, role, phone, is_active)
VALUES ('ramon+editor@aerialshots.media', 'Test Editor', 'va', '555-0003', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = true;

-- Add a comment for future reference
COMMENT ON TABLE staff IS 'Staff members including test accounts: ramon+photographer@, ramon+qc@, ramon+editor@aerialshots.media';
