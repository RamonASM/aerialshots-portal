-- Migration: Seed Celebration, FL demo data
-- This creates a complete demo for the community page feature

-- Insert Celebration, FL community
INSERT INTO communities (
  slug,
  name,
  tagline,
  description,
  hero_image_url,
  gallery_urls,
  lat,
  lng,
  city,
  state,
  zip,
  meta_title,
  meta_description,
  focus_keyword,
  secondary_keywords,
  overview_content,
  market_snapshot,
  schools_info,
  subdivisions,
  quick_facts,
  is_published,
  published_at
) VALUES (
  'celebration-fl',
  'Celebration',
  'Experience the Magic of Disney''s Master-Planned Community',
  'Celebration is a master-planned community developed by The Walt Disney Company, located adjacent to Walt Disney World Resort. Known for its neo-traditional architecture and walkable downtown, Celebration offers a unique blend of small-town charm and modern amenities.',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
  ],
  28.3253,
  -81.5339,
  'Celebration',
  'FL',
  '34747',
  'Celebration FL Homes for Sale | Disney''s Master-Planned Community',
  'Discover Celebration, FL - a unique master-planned community near Disney World. Explore homes for sale, schools, amenities, and the iconic downtown area.',
  'Celebration FL homes for sale',
  ARRAY['Celebration Florida real estate', 'homes near Disney World', 'master planned community Florida', 'Celebration homes', 'Osceola County real estate'],
  '{
    "blocks": [
      {
        "type": "paragraph",
        "content": "Welcome to Celebration, a visionary master-planned community that brings the charm of small-town America to Central Florida. Developed by The Walt Disney Company in 1996, Celebration was designed to evoke the idyllic neighborhoods of pre-1940s America while incorporating modern amenities and sustainable planning principles."
      },
      {
        "type": "heading",
        "content": "A Community Like No Other"
      },
      {
        "type": "paragraph",
        "content": "Celebration is renowned for its neo-traditional architecture, featuring a mix of Classical, Victorian, Colonial Revival, Coastal, Mediterranean, and French Normandy styles. The community was designed by world-renowned architects including Robert A.M. Stern, Michael Graves, Philip Johnson, and Cesar Pelli."
      },
      {
        "type": "list",
        "items": [
          "Award-winning public schools within walking distance",
          "18-hole championship golf course designed by Robert Trent Jones, Sr.",
          "Over 20 miles of walking and biking trails",
          "Lakefront downtown with shops, restaurants, and year-round events",
          "Just 5 minutes from Walt Disney World Resort"
        ]
      }
    ],
    "highlights": [
      "Master-planned by Disney",
      "Award-winning schools",
      "Walkable downtown",
      "Near Disney World"
    ]
  }'::jsonb,
  '{
    "median_price": 650000,
    "avg_dom": 32,
    "yoy_change": 8.5,
    "active_listings": 87,
    "sold_last_30": 23,
    "price_per_sqft": 285,
    "updated_at": "2024-12-22T00:00:00Z"
  }'::jsonb,
  '{
    "elementary": [
      {
        "name": "Celebration K-8 School",
        "type": "elementary",
        "rating": 9,
        "distance": "0.5 mi",
        "enrollment": 1800,
        "grades": "K-8"
      }
    ],
    "middle": [
      {
        "name": "Celebration K-8 School",
        "type": "middle",
        "rating": 9,
        "distance": "0.5 mi",
        "enrollment": 1800,
        "grades": "K-8"
      }
    ],
    "high": [
      {
        "name": "Celebration High School",
        "type": "high",
        "rating": 8,
        "distance": "1.2 mi",
        "enrollment": 3200,
        "grades": "9-12"
      }
    ],
    "private": [
      {
        "name": "The Madeira School",
        "type": "private",
        "rating": 10,
        "distance": "3.5 mi",
        "enrollment": 450,
        "grades": "PK-8"
      }
    ]
  }'::jsonb,
  '[
    {
      "name": "North Village",
      "description": "The original Celebration neighborhood featuring classic architecture and mature landscaping. Home to some of the community''s most iconic homes.",
      "price_range": "$450K - $1.5M",
      "homes_count": 850,
      "year_built": "1996-2000",
      "home_styles": ["Colonial Revival", "Victorian", "Classical"]
    },
    {
      "name": "South Village",
      "description": "A family-friendly neighborhood with excellent access to schools and parks. Features a mix of single-family homes and townhouses.",
      "price_range": "$375K - $900K",
      "homes_count": 1200,
      "year_built": "1998-2005",
      "home_styles": ["Coastal", "Mediterranean", "Classical"]
    },
    {
      "name": "West Village",
      "description": "Known for estate-sized lots and luxury homes, West Village offers more space and privacy while maintaining Celebration''s architectural standards.",
      "price_range": "$800K - $3M",
      "homes_count": 450,
      "year_built": "2000-2008",
      "home_styles": ["French Normandy", "Mediterranean", "Estate"]
    },
    {
      "name": "Celebration Village",
      "description": "The heart of Celebration, featuring townhomes and condos with immediate access to downtown shops, restaurants, and the lakefront.",
      "price_range": "$350K - $650K",
      "homes_count": 600,
      "year_built": "1996-2002",
      "home_styles": ["Urban", "Traditional", "Contemporary"]
    },
    {
      "name": "Island Village",
      "description": "The newest addition to Celebration, featuring modern designs with smart home technology and energy-efficient construction.",
      "price_range": "$500K - $1.2M",
      "homes_count": 320,
      "year_built": "2018-Present",
      "home_styles": ["Modern Coastal", "Contemporary", "Transitional"]
    }
  ]'::jsonb,
  '{
    "population": 11000,
    "founded": 1996,
    "avg_commute": 28,
    "median_income": 95000,
    "area_sqmi": 6.2,
    "zip_codes": ["34747"],
    "nearby_cities": ["Kissimmee", "Orlando", "Winter Garden", "Lake Buena Vista"]
  }'::jsonb,
  true,
  now()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  hero_image_url = EXCLUDED.hero_image_url,
  gallery_urls = EXCLUDED.gallery_urls,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zip = EXCLUDED.zip,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  focus_keyword = EXCLUDED.focus_keyword,
  secondary_keywords = EXCLUDED.secondary_keywords,
  overview_content = EXCLUDED.overview_content,
  market_snapshot = EXCLUDED.market_snapshot,
  schools_info = EXCLUDED.schools_info,
  subdivisions = EXCLUDED.subdivisions,
  quick_facts = EXCLUDED.quick_facts,
  is_published = EXCLUDED.is_published,
  published_at = EXCLUDED.published_at,
  updated_at = now();

-- Insert curated items for Celebration area
INSERT INTO curated_items (
  title,
  description,
  source_url,
  category,
  lat,
  lng,
  radius_miles,
  expires_at
) VALUES
(
  'Island Village Grand Opening',
  'Celebration''s newest neighborhood, Island Village, is now welcoming residents. Features modern architecture, smart home technology, and lakefront views.',
  'https://www.celebrationtowncenter.com',
  'development',
  28.3253,
  -81.5339,
  5,
  '2025-06-01T00:00:00Z'
),
(
  'Town Center Renovation Complete',
  'Downtown Celebration''s Town Center has completed major renovations including new landscaping, improved walkways, and enhanced lakefront seating areas.',
  'https://www.celebrationtowncenter.com',
  'infrastructure',
  28.3253,
  -81.5339,
  5,
  '2025-03-01T00:00:00Z'
),
(
  'Celebration K-8 Earns A Rating',
  'Celebration K-8 School has earned an A rating from the Florida Department of Education for the fifth consecutive year.',
  'https://www.osceolaschools.net',
  'school',
  28.3253,
  -81.5339,
  5,
  '2025-08-01T00:00:00Z'
),
(
  'New Whole Foods Opening',
  'Whole Foods Market is opening a new location near Celebration in Spring 2025, providing convenient access to organic groceries and prepared foods.',
  'https://www.wholefoodsmarket.com',
  'business',
  28.3253,
  -81.5339,
  5,
  '2025-05-01T00:00:00Z'
)
ON CONFLICT DO NOTHING;

-- Add a comment for documentation
COMMENT ON TABLE communities IS 'Community/neighborhood pages for SEO-optimized area guides. Celebration, FL is the demo community.';
