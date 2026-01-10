-- ============================================================================
-- Unified Pricing Configuration
-- Single source of truth for all pricing across portal and AI agent backend
-- ============================================================================

-- Pricing Tiers (based on square footage)
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  min_sqft INTEGER NOT NULL,
  max_sqft INTEGER,
  photo_price DECIMAL(10,2) NOT NULL,
  package_tier TEXT NOT NULL, -- Maps to package_pricing tier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packages (Essentials, Signature, Luxury)
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  included_services TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Pricing (price per package per tier)
CREATE TABLE IF NOT EXISTS package_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  UNIQUE(package_id, tier_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services (a la carte and included in packages)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  price_label TEXT, -- For variable pricing like "$175-$550"
  duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'addon', -- core, addon, standalone, video
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source column to orders table for tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'source'
  ) THEN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal';
  END IF;
END $$;

-- ============================================================================
-- Seed Data: Pricing Tiers (from asm_pricing_kb.json)
-- ============================================================================
INSERT INTO pricing_tiers (tier_key, label, min_sqft, max_sqft, photo_price, package_tier) VALUES
  ('lt1500', 'Under 1,500 sq ft', 0, 1500, 175, 'under2000'),
  ('1501_2500', '1,501 – 2,500 sq ft', 1501, 2500, 225, '_2001_2500'),
  ('2501_3500', '2,501 – 3,500 sq ft', 2501, 3500, 275, '_2501_3500'),
  ('3501_4000', '3,501 – 4,000 sq ft', 3501, 4000, 350, '_3501_5000'),
  ('4001_5000', '4,001 – 5,000 sq ft', 4001, 5000, 450, '_3501_5000'),
  ('5001_10000', '5,001 – 10,000 sq ft', 5001, 10000, 550, '_5001_10000')
ON CONFLICT (tier_key) DO UPDATE SET
  label = EXCLUDED.label,
  min_sqft = EXCLUDED.min_sqft,
  max_sqft = EXCLUDED.max_sqft,
  photo_price = EXCLUDED.photo_price,
  package_tier = EXCLUDED.package_tier,
  updated_at = NOW();

-- ============================================================================
-- Seed Data: Packages
-- ============================================================================
INSERT INTO packages (key, name, description, included_services, display_order) VALUES
  ('essentials', 'Essentials (Zillow+)',
   'Everything you need for a professional listing with Zillow Showcase',
   ARRAY['photos', 'droneAddOn', 'zillow3d', '2dFloor', 'stagingCoreAll', 'vtwilight'],
   1),
  ('signature', 'Signature (Social Pro+)',
   'Stand out with professional video content for social media',
   ARRAY['photos', 'droneAddOn', 'zillow3d', '2dFloor', 'stagingCoreAll', 'vtwilight', 'listingVideo'],
   2),
  ('luxury', 'Luxury (All-in)',
   'The complete package for luxury properties and maximum impact',
   ARRAY['photos', 'droneAddOn', 'zillow3d', '2dFloor', 'stagingCoreAll', 'vtwilight', '3dFloor', 'listingVideo', 'signatureVid'],
   3)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  included_services = EXCLUDED.included_services,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- Seed Data: Package Pricing (price matrix)
-- ============================================================================

-- Essentials pricing: under2000=$315, _2001_2500=$375, _2501_3500=$425, _3501_5000=$485, _5001_10000=$580
INSERT INTO package_pricing (package_id, tier_id, price)
SELECT p.id, t.id,
  CASE t.package_tier
    WHEN 'under2000' THEN 315
    WHEN '_2001_2500' THEN 375
    WHEN '_2501_3500' THEN 425
    WHEN '_3501_5000' THEN 485
    WHEN '_5001_10000' THEN 580
  END
FROM packages p, pricing_tiers t
WHERE p.key = 'essentials'
ON CONFLICT (package_id, tier_id) DO UPDATE SET price = EXCLUDED.price;

-- Signature pricing: under2000=$449, _2001_2500=$529, _2501_3500=$579, _3501_5000=$619, _5001_10000=$700
INSERT INTO package_pricing (package_id, tier_id, price)
SELECT p.id, t.id,
  CASE t.package_tier
    WHEN 'under2000' THEN 449
    WHEN '_2001_2500' THEN 529
    WHEN '_2501_3500' THEN 579
    WHEN '_3501_5000' THEN 619
    WHEN '_5001_10000' THEN 700
  END
FROM packages p, pricing_tiers t
WHERE p.key = 'signature'
ON CONFLICT (package_id, tier_id) DO UPDATE SET price = EXCLUDED.price;

-- Luxury pricing: under2000=$649, _2001_2500=$729, _2501_3500=$819, _3501_5000=$899, _5001_10000=$1100
INSERT INTO package_pricing (package_id, tier_id, price)
SELECT p.id, t.id,
  CASE t.package_tier
    WHEN 'under2000' THEN 649
    WHEN '_2001_2500' THEN 729
    WHEN '_2501_3500' THEN 819
    WHEN '_3501_5000' THEN 899
    WHEN '_5001_10000' THEN 1100
  END
FROM packages p, pricing_tiers t
WHERE p.key = 'luxury'
ON CONFLICT (package_id, tier_id) DO UPDATE SET price = EXCLUDED.price;

-- ============================================================================
-- Seed Data: Services (from asm_pricing_kb.json a_la_carte_services)
-- ============================================================================
INSERT INTO services (key, name, base_price, price_label, duration_minutes, category, display_order) VALUES
  -- Core Services
  ('photos', 'Listing Photography', 175, '$175–$550', 45, 'core', 1),

  -- Drone
  ('droneOnly', 'Drone / Aerial (Standalone)', 150, NULL, 30, 'standalone', 10),
  ('droneAddOn', 'Drone / Aerial (Add-On)', 75, NULL, 20, 'addon', 11),

  -- Floor Plans
  ('2dFloor', '2D Floor Plan (Included)', 0, NULL, 0, 'addon', 20),
  ('3dFloor', '3D Floor Plan', 75, NULL, 15, 'addon', 21),

  -- 3D Tours
  ('zillow3d', 'Zillow 3D Tour + Interactive Floor Plan', 150, NULL, 30, 'addon', 30),

  -- Virtual Services
  ('vtwilight', 'Virtual Twilight (per photo)', 15, NULL, 0, 'addon', 40),
  ('realTwilight', 'Real Twilight Photography', 150, NULL, 60, 'standalone', 41),
  ('stagingCoreEa', 'Core Virtual Staging (per photo)', 12, NULL, 0, 'addon', 50),
  ('stagingPremEa', 'Premium Virtual Staging (per photo)', 25, NULL, 0, 'addon', 51),
  ('stagingCoreAll', 'Core Virtual Staging (Full Home)', 125, NULL, 0, 'addon', 52),

  -- Video Services
  ('listingVideo', 'Listing Video', 350, NULL, 45, 'video', 60),
  ('lifestyleVid', 'Lifestyle Listing Video', 425, NULL, 30, 'video', 61),
  ('dayToNight', 'Day-to-Night Video', 750, NULL, 120, 'video', 62),
  ('signatureVid', 'Cinematic Signature Video', 900, NULL, 90, 'video', 63),
  ('render3d', '3D Video Render', 250, NULL, 0, 'video', 64),

  -- Photo to Video
  ('lp2v30', 'Photos → Video (30s)', 95, NULL, 0, 'video', 70),
  ('lp2v60', 'Photos → Video (1 min)', 145, NULL, 0, 'video', 71)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  base_price = EXCLUDED.base_price,
  price_label = EXCLUDED.price_label,
  duration_minutes = EXCLUDED.duration_minutes,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_sqft ON pricing_tiers(min_sqft, max_sqft);
CREATE INDEX IF NOT EXISTS idx_package_pricing_package ON package_pricing(package_id);
CREATE INDEX IF NOT EXISTS idx_package_pricing_tier ON package_pricing(tier_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS pricing_tiers_updated_at ON pricing_tiers;
CREATE TRIGGER pricing_tiers_updated_at
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS packages_updated_at ON packages;
CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
