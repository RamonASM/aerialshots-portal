-- Phase 11: Packages & Templates (222 votes)
-- 11.1 Bundle Products into Packages (121 votes)
-- 11.2 Conditional Email Templates (101 votes)

-- ============================================
-- SERVICE PACKAGES TABLE
-- Bundle multiple services into packages
-- ============================================

CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Package identification
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL DEFAULT 'standard', -- standard, premium, luxury, custom

  -- Pricing
  base_price_cents INTEGER NOT NULL,
  discount_type TEXT DEFAULT 'fixed', -- fixed, percentage
  discount_amount INTEGER DEFAULT 0, -- cents or percentage based on type

  -- Display
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Validity
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Restrictions
  min_sqft INTEGER,
  max_sqft INTEGER,
  applicable_property_types TEXT[] DEFAULT '{}', -- residential, commercial, vacant_land, etc.

  -- Metadata
  badge_text TEXT, -- e.g., "Most Popular", "Best Value"
  badge_color TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PACKAGE ITEMS TABLE
-- Services included in each package
-- ============================================

CREATE TABLE IF NOT EXISTS package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,

  -- Service reference (can reference service_catalog or be custom)
  service_key TEXT NOT NULL,
  service_name TEXT NOT NULL,

  -- Quantity and pricing
  quantity INTEGER DEFAULT 1,
  included_price_cents INTEGER DEFAULT 0, -- 0 means included in base price
  is_optional BOOLEAN DEFAULT FALSE, -- optional add-on within package

  -- Display
  display_order INTEGER DEFAULT 0,
  description TEXT, -- override description for this package context

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PACKAGE TIERS TABLE
-- Tiered pricing based on square footage
-- ============================================

CREATE TABLE IF NOT EXISTS package_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,

  -- Tier identification
  tier_name TEXT NOT NULL, -- e.g., "Under 2000 sqft", "2001-3000 sqft"

  -- Square footage range
  min_sqft INTEGER NOT NULL,
  max_sqft INTEGER, -- NULL means unlimited

  -- Tier-specific pricing
  price_cents INTEGER NOT NULL,

  display_order INTEGER DEFAULT 0,

  UNIQUE(package_id, min_sqft)
);

-- ============================================
-- TEMPLATE CONDITIONS TABLE
-- Conditional logic for email templates
-- ============================================

CREATE TABLE IF NOT EXISTS template_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,

  -- Condition identification
  name TEXT NOT NULL,
  description TEXT,

  -- Condition logic (stored as JSON for flexibility)
  conditions JSONB NOT NULL DEFAULT '[]',
  -- Example conditions structure:
  -- [
  --   { "field": "service_type", "operator": "equals", "value": "drone" },
  --   { "field": "order_total", "operator": "greater_than", "value": 500 },
  --   { "field": "client_tier", "operator": "in", "value": ["gold", "platinum"] }
  -- ]

  -- Logic operator for multiple conditions
  logic_operator TEXT DEFAULT 'AND', -- AND, OR

  -- Priority (higher = checked first)
  priority INTEGER DEFAULT 0,

  -- Template variation when conditions match
  subject_override TEXT,
  body_override TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATE VARIABLES TABLE
-- Track available variables for templates
-- ============================================

CREATE TABLE IF NOT EXISTS template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Variable identification
  variable_key TEXT UNIQUE NOT NULL, -- e.g., "agent_name", "property_address"
  display_name TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL DEFAULT 'general', -- general, order, agent, property, payment

  -- Data type for validation
  data_type TEXT DEFAULT 'string', -- string, number, date, boolean, array

  -- Example value for preview
  example_value TEXT,

  -- Is this a system variable (always available) or context-specific
  is_system BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEED TEMPLATE VARIABLES
-- ============================================

INSERT INTO template_variables (variable_key, display_name, description, category, data_type, example_value) VALUES
-- General
('current_date', 'Current Date', 'Today''s date', 'general', 'date', '2024-12-28'),
('company_name', 'Company Name', 'Your company name', 'general', 'string', 'Aerial Shots Media'),
('company_phone', 'Company Phone', 'Your company phone', 'general', 'string', '(555) 123-4567'),
('company_email', 'Company Email', 'Your company email', 'general', 'string', 'hello@aerialshots.media'),

-- Agent
('agent_name', 'Agent Name', 'Full name of the agent', 'agent', 'string', 'Jane Smith'),
('agent_email', 'Agent Email', 'Agent''s email address', 'agent', 'string', 'jane@realty.com'),
('agent_phone', 'Agent Phone', 'Agent''s phone number', 'agent', 'string', '(555) 987-6543'),
('agent_company', 'Agent Company', 'Agent''s brokerage', 'agent', 'string', 'Premier Realty'),

-- Order
('order_id', 'Order ID', 'Unique order identifier', 'order', 'string', 'ORD-2024-001'),
('order_total', 'Order Total', 'Total order amount', 'order', 'number', '549.00'),
('order_status', 'Order Status', 'Current order status', 'order', 'string', 'confirmed'),
('order_date', 'Order Date', 'Date order was placed', 'order', 'date', '2024-12-28'),
('scheduled_date', 'Scheduled Date', 'Photo shoot date', 'order', 'date', '2024-12-30'),
('scheduled_time', 'Scheduled Time', 'Photo shoot time', 'order', 'string', '10:00 AM'),
('service_list', 'Service List', 'List of ordered services', 'order', 'array', 'Photography, Drone, Floor Plan'),

-- Property
('property_address', 'Property Address', 'Full property address', 'property', 'string', '123 Main St, Orlando, FL 32801'),
('property_city', 'Property City', 'Property city', 'property', 'string', 'Orlando'),
('property_state', 'Property State', 'Property state', 'property', 'string', 'FL'),
('property_zip', 'Property ZIP', 'Property ZIP code', 'property', 'string', '32801'),
('property_sqft', 'Property Sqft', 'Property square footage', 'property', 'number', '2500'),

-- Payment
('payment_amount', 'Payment Amount', 'Amount paid', 'payment', 'number', '549.00'),
('payment_method', 'Payment Method', 'Payment method used', 'payment', 'string', 'Visa ending in 4242'),
('payment_date', 'Payment Date', 'Date of payment', 'payment', 'date', '2024-12-28'),
('invoice_number', 'Invoice Number', 'Invoice reference number', 'payment', 'string', 'INV-2024-00123'),
('invoice_link', 'Invoice Link', 'Link to view/pay invoice', 'payment', 'string', 'https://portal.aerialshots.media/invoice/xxx'),

-- Delivery
('delivery_link', 'Delivery Link', 'Link to media gallery', 'delivery', 'string', 'https://portal.aerialshots.media/delivery/xxx'),
('photo_count', 'Photo Count', 'Number of photos delivered', 'delivery', 'number', '45'),
('video_link', 'Video Link', 'Link to property video', 'delivery', 'string', 'https://vimeo.com/xxx')

ON CONFLICT (variable_key) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_packages_slug ON service_packages(slug);
CREATE INDEX IF NOT EXISTS idx_service_packages_category ON service_packages(category);
CREATE INDEX IF NOT EXISTS idx_service_packages_active ON service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_tiers_package ON package_tiers(package_id);
CREATE INDEX IF NOT EXISTS idx_template_conditions_template ON template_conditions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_conditions_active ON template_conditions(is_active);
CREATE INDEX IF NOT EXISTS idx_template_variables_category ON template_variables(category);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

-- Packages - viewable by all authenticated, editable by staff
CREATE POLICY "Packages viewable by authenticated" ON service_packages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Packages editable by staff" ON service_packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Package items - same as packages
CREATE POLICY "Package items viewable by authenticated" ON package_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Package items editable by staff" ON package_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Package tiers - same as packages
CREATE POLICY "Package tiers viewable by authenticated" ON package_tiers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Package tiers editable by staff" ON package_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Template conditions - staff only
CREATE POLICY "Template conditions manageable by staff" ON template_conditions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Template variables - viewable by staff
CREATE POLICY "Template variables viewable by staff" ON template_variables
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get package price for a given square footage
CREATE OR REPLACE FUNCTION get_package_price(p_package_id UUID, p_sqft INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_tier_price INTEGER;
  v_base_price INTEGER;
BEGIN
  -- Try to find a matching tier
  SELECT price_cents INTO v_tier_price
  FROM package_tiers
  WHERE package_id = p_package_id
    AND p_sqft >= min_sqft
    AND (max_sqft IS NULL OR p_sqft <= max_sqft)
  ORDER BY min_sqft DESC
  LIMIT 1;

  IF v_tier_price IS NOT NULL THEN
    RETURN v_tier_price;
  END IF;

  -- Fall back to base price
  SELECT base_price_cents INTO v_base_price
  FROM service_packages
  WHERE id = p_package_id;

  RETURN COALESCE(v_base_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Get all services included in a package
CREATE OR REPLACE FUNCTION get_package_services(p_package_id UUID)
RETURNS TABLE (
  service_key TEXT,
  service_name TEXT,
  quantity INTEGER,
  is_optional BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.service_key,
    pi.service_name,
    pi.quantity,
    pi.is_optional
  FROM package_items pi
  WHERE pi.package_id = p_package_id
  ORDER BY pi.display_order, pi.service_name;
END;
$$ LANGUAGE plpgsql;

-- Evaluate template conditions for a given context
CREATE OR REPLACE FUNCTION evaluate_template_conditions(
  p_template_id UUID,
  p_context JSONB
)
RETURNS TABLE (
  condition_id UUID,
  subject_override TEXT,
  body_override TEXT,
  priority INTEGER
) AS $$
BEGIN
  -- This is a placeholder - actual condition evaluation
  -- would need to be done in application code due to
  -- the complexity of condition matching
  RETURN QUERY
  SELECT
    tc.id,
    tc.subject_override,
    tc.body_override,
    tc.priority
  FROM template_conditions tc
  WHERE tc.template_id = p_template_id
    AND tc.is_active = TRUE
  ORDER BY tc.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DEFAULT PACKAGES
-- ============================================

INSERT INTO service_packages (name, slug, description, category, base_price_cents, is_featured, badge_text, badge_color) VALUES
('Essentials', 'essentials', 'Perfect for standard listings. Includes professional photos, drone, 3D tour, floor plan, and virtual staging.', 'standard', 31500, FALSE, NULL, NULL),
('Signature', 'signature', 'Our most popular package. Everything in Essentials plus a professional listing video.', 'premium', 44900, TRUE, 'Most Popular', '#3b82f6'),
('Luxury', 'luxury', 'The complete package for luxury properties. Includes signature video, 3D floor plan, and premium editing.', 'luxury', 64900, FALSE, 'Best Value', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;

-- Add package tiers for Essentials
INSERT INTO package_tiers (package_id, tier_name, min_sqft, max_sqft, price_cents, display_order)
SELECT id, 'Under 2000 sqft', 0, 2000, 31500, 1 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, '2001-2500 sqft', 2001, 2500, 36500, 2 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, '2501-3500 sqft', 2501, 3500, 41500, 3 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, '3501-4000 sqft', 3501, 4000, 46500, 4 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, '4001-5000 sqft', 4001, 5000, 52500, 5 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, '5001+ sqft', 5001, NULL, 58000, 6 FROM service_packages WHERE slug = 'essentials'
ON CONFLICT DO NOTHING;

-- Add package tiers for Signature
INSERT INTO package_tiers (package_id, tier_name, min_sqft, max_sqft, price_cents, display_order)
SELECT id, 'Under 2000 sqft', 0, 2000, 44900, 1 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, '2001-2500 sqft', 2001, 2500, 49900, 2 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, '2501-3500 sqft', 2501, 3500, 54900, 3 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, '3501-4000 sqft', 3501, 4000, 59900, 4 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, '4001-5000 sqft', 4001, 5000, 64900, 5 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, '5001+ sqft', 5001, NULL, 70000, 6 FROM service_packages WHERE slug = 'signature'
ON CONFLICT DO NOTHING;

-- Add package tiers for Luxury
INSERT INTO package_tiers (package_id, tier_name, min_sqft, max_sqft, price_cents, display_order)
SELECT id, 'Under 2000 sqft', 0, 2000, 64900, 1 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, '2001-2500 sqft', 2001, 2500, 74900, 2 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, '2501-3500 sqft', 2501, 3500, 84900, 3 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, '3501-4000 sqft', 3501, 4000, 94900, 4 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, '4001-5000 sqft', 4001, 5000, 104900, 5 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, '5001+ sqft', 5001, NULL, 110000, 6 FROM service_packages WHERE slug = 'luxury'
ON CONFLICT DO NOTHING;

-- Add package items for Essentials
INSERT INTO package_items (package_id, service_key, service_name, quantity, display_order)
SELECT id, 'photos', 'Professional Photography', 1, 1 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, 'drone', 'Drone Aerial Photography', 1, 2 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, 'zillow_3d', 'Zillow 3D Home Tour', 1, 3 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, 'floor_plan_2d', '2D Floor Plan', 1, 4 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, 'virtual_staging', 'Virtual Staging (3 rooms)', 3, 5 FROM service_packages WHERE slug = 'essentials'
UNION ALL
SELECT id, 'virtual_twilight', 'Virtual Twilight', 1, 6 FROM service_packages WHERE slug = 'essentials'
ON CONFLICT DO NOTHING;

-- Add package items for Signature (everything in Essentials + video)
INSERT INTO package_items (package_id, service_key, service_name, quantity, display_order)
SELECT id, 'photos', 'Professional Photography', 1, 1 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'drone', 'Drone Aerial Photography', 1, 2 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'zillow_3d', 'Zillow 3D Home Tour', 1, 3 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'floor_plan_2d', '2D Floor Plan', 1, 4 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'virtual_staging', 'Virtual Staging (3 rooms)', 3, 5 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'virtual_twilight', 'Virtual Twilight', 1, 6 FROM service_packages WHERE slug = 'signature'
UNION ALL
SELECT id, 'listing_video', 'Listing Video', 1, 7 FROM service_packages WHERE slug = 'signature'
ON CONFLICT DO NOTHING;

-- Add package items for Luxury (everything in Signature + extras)
INSERT INTO package_items (package_id, service_key, service_name, quantity, display_order)
SELECT id, 'photos', 'Professional Photography', 1, 1 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'drone', 'Drone Aerial Photography', 1, 2 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'zillow_3d', 'Zillow 3D Home Tour', 1, 3 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'floor_plan_3d', '3D Floor Plan', 1, 4 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'virtual_staging', 'Virtual Staging (5 rooms)', 5, 5 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'virtual_twilight', 'Virtual Twilight', 1, 6 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'signature_video', 'Signature Video', 1, 7 FROM service_packages WHERE slug = 'luxury'
UNION ALL
SELECT id, 'social_reels', 'Social Media Reels', 1, 8 FROM service_packages WHERE slug = 'luxury'
ON CONFLICT DO NOTHING;
