-- Migration: Create communities table for area/neighborhood pages
-- This supports the Community Page feature for SEO-optimized area guides

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Images
  hero_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',

  -- Location
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'FL',
  zip TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',

  -- Content sections (JSONB for flexibility)
  overview_content JSONB DEFAULT '{}',
  lifestyle_content JSONB DEFAULT '{}',
  market_snapshot JSONB DEFAULT '{}',
  schools_info JSONB DEFAULT '{}',
  subdivisions JSONB DEFAULT '[]',
  quick_facts JSONB DEFAULT '{}',

  -- Agent showcase
  featured_agent_ids UUID[] DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_location ON communities(lat, lng);
CREATE INDEX idx_communities_published ON communities(is_published) WHERE is_published = true;
CREATE INDEX idx_communities_city_state ON communities(city, state);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_communities_updated_at();

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Public read access for published communities
CREATE POLICY "Public can view published communities"
  ON communities FOR SELECT
  USING (is_published = true);

-- Staff can manage communities
CREATE POLICY "Staff can manage communities"
  ON communities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.email = auth.jwt() ->> 'email'
      AND staff.is_active = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE communities IS 'Community/neighborhood pages for SEO-optimized area guides. Supports buyer/seller focused content.';

-- Sample JSONB structure documentation
COMMENT ON COLUMN communities.overview_content IS 'Rich text content blocks: {"blocks": [{"type": "paragraph", "content": "..."}]}';
COMMENT ON COLUMN communities.market_snapshot IS 'Market stats: {"median_price": 600000, "avg_dom": 45, "yoy_change": 5.2, "active_listings": 120}';
COMMENT ON COLUMN communities.schools_info IS 'School data: {"elementary": [...], "middle": [...], "high": [...]}';
COMMENT ON COLUMN communities.subdivisions IS 'Subdivision list: [{"name": "...", "description": "...", "price_range": "...", "homes_count": 500}]';
COMMENT ON COLUMN communities.quick_facts IS 'Quick facts: {"population": 10000, "founded": 1996, "avg_commute": 25}';
