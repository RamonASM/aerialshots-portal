-- Add skills and certifications columns to staff table
-- These columns are queried by team settings pages

ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

COMMENT ON COLUMN staff.certifications IS 'Array of certifications (FAA Part 107, etc.)';
COMMENT ON COLUMN staff.skills IS 'Array of skills (drone, video, HDR, etc.)';
