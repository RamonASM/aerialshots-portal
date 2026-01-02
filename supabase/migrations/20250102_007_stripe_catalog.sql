-- ============================================================================
-- Stripe Product Catalog Integration
-- Adds Stripe product/price IDs to pricing tables for catalog sync
-- ============================================================================

-- Add Stripe IDs to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add Stripe IDs to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add Stripe IDs to content_retainers table
ALTER TABLE content_retainers ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE content_retainers ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add Stripe IDs to package_pricing table (for tier-specific prices)
ALTER TABLE package_pricing ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- ============================================================================
-- Stripe Sync Log (tracks sync operations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'full', 'packages', 'services', 'retainers'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  prices_created INTEGER DEFAULT 0,
  prices_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- Indexes for Stripe ID lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_packages_stripe_product ON packages(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_stripe_product ON services(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_services_stripe_price ON services(stripe_price_id) WHERE stripe_price_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_retainers_stripe_product ON content_retainers(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_package_pricing_stripe_price ON package_pricing(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- ============================================================================
-- RLS Policies for stripe_sync_log
-- ============================================================================
ALTER TABLE stripe_sync_log ENABLE ROW LEVEL SECURITY;

-- Only staff can view sync logs
CREATE POLICY "Staff can view sync logs" ON stripe_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.is_active = true
    )
  );

-- Only admins can create sync logs
CREATE POLICY "Admin can create sync logs" ON stripe_sync_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'admin'
      AND staff.is_active = true
    )
  );

-- ============================================================================
-- Helper function to get Stripe price ID for a package tier
-- ============================================================================
CREATE OR REPLACE FUNCTION get_package_stripe_price(
  p_package_key TEXT,
  p_sqft INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_tier_id UUID;
  v_price_id TEXT;
BEGIN
  -- Get the tier for the sqft
  SELECT id INTO v_tier_id
  FROM pricing_tiers
  WHERE p_sqft >= min_sqft
    AND (max_sqft IS NULL OR p_sqft <= max_sqft)
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the Stripe price ID
  SELECT pp.stripe_price_id INTO v_price_id
  FROM package_pricing pp
  JOIN packages pkg ON pp.package_id = pkg.id
  WHERE pkg.key = p_package_key
    AND pp.tier_id = v_tier_id;

  RETURN v_price_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Helper function to get Stripe price ID for a service
-- ============================================================================
CREATE OR REPLACE FUNCTION get_service_stripe_price(
  p_service_key TEXT
) RETURNS TEXT AS $$
  SELECT stripe_price_id
  FROM services
  WHERE key = p_service_key
    AND is_active = true;
$$ LANGUAGE sql STABLE;
