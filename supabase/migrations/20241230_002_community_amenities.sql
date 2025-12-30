-- Community Amenities Library
-- Reusable amenity data for buildings, communities, and listings

-- Amenity Categories
CREATE TABLE IF NOT EXISTS amenity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT, -- Lucide icon name
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO amenity_categories (name, slug, icon, display_order) VALUES
  ('Pool & Spa', 'pool-spa', 'Waves', 1),
  ('Fitness & Recreation', 'fitness', 'Dumbbell', 2),
  ('Community Spaces', 'community', 'Users', 3),
  ('Security & Access', 'security', 'Shield', 4),
  ('Parking & Storage', 'parking', 'Car', 5),
  ('Outdoor Spaces', 'outdoor', 'Trees', 6),
  ('Pet Amenities', 'pets', 'PawPrint', 7),
  ('Technology', 'tech', 'Wifi', 8),
  ('Concierge Services', 'concierge', 'Bell', 9),
  ('Building Features', 'building', 'Building', 10)
ON CONFLICT (slug) DO NOTHING;

-- Community Amenities Library
CREATE TABLE IF NOT EXISTS community_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location Reference (nullable - can be community-wide or specific building)
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,

  -- Amenity Details
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES amenity_categories(id) ON DELETE SET NULL,

  -- Location info for proximity matching
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  proximity_radius_miles DECIMAL(5, 2) DEFAULT 0.5,

  -- Media
  image_url TEXT,

  -- Hours & Access
  hours_of_operation JSONB, -- { mon: "6am-10pm", tue: "6am-10pm", ... }
  access_type TEXT CHECK (access_type IN ('public', 'residents', 'members', 'private')),

  -- Metadata
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES staff(id),
  verified_at TIMESTAMPTZ,

  -- Tags for search
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listing Amenity Associations
-- Links amenities to specific listings
CREATE TABLE IF NOT EXISTS listing_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES community_amenities(id) ON DELETE CASCADE,
  distance_miles DECIMAL(5, 2),
  added_by UUID REFERENCES staff(id),
  auto_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(listing_id, amenity_id)
);

-- Indexes
CREATE INDEX idx_community_amenities_community ON community_amenities(community_id);
CREATE INDEX idx_community_amenities_category ON community_amenities(category_id);
CREATE INDEX idx_community_amenities_location ON community_amenities(lat, lng);
CREATE INDEX idx_community_amenities_tags ON community_amenities USING GIN(tags);
CREATE INDEX idx_listing_amenities_listing ON listing_amenities(listing_id);
CREATE INDEX idx_listing_amenities_amenity ON listing_amenities(amenity_id);

-- RLS
ALTER TABLE amenity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_amenities ENABLE ROW LEVEL SECURITY;

-- Categories are readable by anyone
CREATE POLICY "Amenity categories are readable by anyone"
  ON amenity_categories FOR SELECT
  USING (true);

-- Community amenities are readable by anyone
CREATE POLICY "Community amenities are readable by anyone"
  ON community_amenities FOR SELECT
  USING (true);

-- Staff can manage amenities
CREATE POLICY "Staff can manage community amenities"
  ON community_amenities FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Listing amenities are readable by listing owner or staff
CREATE POLICY "Listing amenities are readable by related parties"
  ON listing_amenities FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings WHERE agent_id = auth.uid()
    )
    OR auth.email() LIKE '%@aerialshots.media'
  );

-- Staff can manage listing amenities
CREATE POLICY "Staff can manage listing amenities"
  ON listing_amenities FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Update timestamp trigger
CREATE TRIGGER update_community_amenities_timestamp
  BEFORE UPDATE ON community_amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- Function to find nearby amenities
CREATE OR REPLACE FUNCTION find_nearby_amenities(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_miles DECIMAL DEFAULT 1.0,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category_name TEXT,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.id,
    ca.name,
    ca.description,
    ac.name AS category_name,
    (
      3959 * acos(
        cos(radians(p_lat)) * cos(radians(ca.lat)) *
        cos(radians(ca.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ca.lat))
      )
    )::DECIMAL AS distance_miles
  FROM community_amenities ca
  LEFT JOIN amenity_categories ac ON ca.category_id = ac.id
  WHERE
    ca.lat IS NOT NULL
    AND ca.lng IS NOT NULL
    AND (p_category_id IS NULL OR ca.category_id = p_category_id)
    AND (
      3959 * acos(
        cos(radians(p_lat)) * cos(radians(ca.lat)) *
        cos(radians(ca.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(ca.lat))
      )
    ) <= p_radius_miles
  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE community_amenities;
ALTER PUBLICATION supabase_realtime ADD TABLE listing_amenities;
