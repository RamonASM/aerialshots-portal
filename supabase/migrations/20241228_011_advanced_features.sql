-- Tier 8: Advanced Features
-- Multi-customer orders, video previews, order merging

-- Multi-customer orders: Allow multiple agents/customers per listing
CREATE TABLE IF NOT EXISTS listing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'secondary', -- primary, secondary, co-listing
  share_percentage DECIMAL(5,2) DEFAULT 0, -- For commission splitting
  can_download BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  notification_enabled BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES staff(id),
  UNIQUE(listing_id, agent_id)
);

-- Video preview settings for portal
CREATE TABLE IF NOT EXISTS video_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  preview_url TEXT, -- Generated preview/thumbnail video URL
  preview_duration INTEGER DEFAULT 15, -- Preview duration in seconds
  watermark_enabled BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order merge tracking
CREATE TABLE IF NOT EXISTS merged_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  merged_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  merged_at TIMESTAMPTZ DEFAULT NOW(),
  merged_by UUID REFERENCES staff(id),
  reason TEXT,
  -- Keep track of what was merged
  merged_services JSONB DEFAULT '[]',
  merged_media_count INTEGER DEFAULT 0
);

-- Add map coordinates to photographer_assignments for calendar map view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photographer_assignments'
    AND column_name = 'location_lat'
  ) THEN
    ALTER TABLE photographer_assignments ADD COLUMN location_lat DECIMAL(10,7);
    ALTER TABLE photographer_assignments ADD COLUMN location_lng DECIMAL(10,7);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE listing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE merged_orders ENABLE ROW LEVEL SECURITY;

-- Listing customers: agents can see their own
CREATE POLICY "Agents can view their listing associations"
  ON listing_customers
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Staff can manage listing customers
CREATE POLICY "Staff can manage listing customers"
  ON listing_customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Video previews: staff can manage
CREATE POLICY "Staff can manage video previews"
  ON video_previews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Agents can view video previews for their listings
CREATE POLICY "Agents can view their video previews"
  ON video_previews
  FOR SELECT
  USING (
    media_asset_id IN (
      SELECT ma.id FROM media_assets ma
      JOIN listings l ON ma.listing_id = l.id
      WHERE l.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
    )
  );

-- Merged orders: staff only
CREATE POLICY "Staff can manage merged orders"
  ON merged_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_customers_listing ON listing_customers(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_customers_agent ON listing_customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_video_previews_asset ON video_previews(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_merged_orders_primary ON merged_orders(primary_listing_id);
CREATE INDEX IF NOT EXISTS idx_assignments_location ON photographer_assignments(location_lat, location_lng)
  WHERE location_lat IS NOT NULL;
