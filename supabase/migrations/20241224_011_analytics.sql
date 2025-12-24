-- Agent Analytics & View Tracking
-- Version: 1.0.0
-- Date: 2024-12-24
-- Phase 3: Agent Analytics & Empowerment

-- =====================
-- 1. PAGE VIEWS TABLE
-- =====================
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN ('property', 'portfolio', 'delivery')),

  -- Visitor info
  visitor_id TEXT, -- Anonymous ID from cookie/session
  visitor_ip TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Session data
  session_id TEXT,
  duration_seconds INTEGER,
  scroll_depth INTEGER, -- Percentage 0-100

  -- Location (derived from IP)
  visitor_city TEXT,
  visitor_region TEXT,
  visitor_country TEXT,

  -- Device info (derived from user agent)
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile', 'unknown')),
  browser TEXT,
  os TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_page_views_listing ON page_views(listing_id);
CREATE INDEX idx_page_views_agent ON page_views(agent_id);
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX idx_page_views_page_type ON page_views(page_type);
CREATE INDEX idx_page_views_session ON page_views(session_id);

-- =====================
-- 2. MEDIA DOWNLOADS TABLE
-- =====================
CREATE TABLE media_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

  -- Download info
  asset_type TEXT NOT NULL, -- 'photo', 'video', 'floorplan', '3d_tour', etc.
  file_name TEXT,
  file_size_bytes INTEGER,

  -- Visitor info
  visitor_id TEXT,
  visitor_ip TEXT,

  -- Timestamps
  downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_downloads_listing ON media_downloads(listing_id);
CREATE INDEX idx_media_downloads_agent ON media_downloads(agent_id);
CREATE INDEX idx_media_downloads_asset_type ON media_downloads(asset_type);
CREATE INDEX idx_media_downloads_date ON media_downloads(downloaded_at DESC);

-- =====================
-- 3. LEAD CONVERSIONS TABLE
-- =====================
CREATE TABLE lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  page_view_id UUID REFERENCES page_views(id),

  -- Conversion info
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('contact_form', 'phone_click', 'email_click', 'schedule_showing')),

  -- Lead info
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,

  -- Timestamps
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_conversions_listing ON lead_conversions(listing_id);
CREATE INDEX idx_lead_conversions_agent ON lead_conversions(agent_id);
CREATE INDEX idx_lead_conversions_date ON lead_conversions(converted_at DESC);

-- =====================
-- 4. AGENT ANALYTICS SUMMARY (Materialized View)
-- =====================
CREATE MATERIALIZED VIEW agent_analytics_summary AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.slug AS agent_slug,

  -- Total views
  COUNT(DISTINCT pv.id) AS total_views,
  COUNT(DISTINCT CASE WHEN pv.created_at > NOW() - INTERVAL '7 days' THEN pv.id END) AS views_last_7_days,
  COUNT(DISTINCT CASE WHEN pv.created_at > NOW() - INTERVAL '30 days' THEN pv.id END) AS views_last_30_days,

  -- Unique visitors
  COUNT(DISTINCT pv.visitor_id) AS unique_visitors,
  COUNT(DISTINCT CASE WHEN pv.created_at > NOW() - INTERVAL '7 days' THEN pv.visitor_id END) AS unique_visitors_7_days,

  -- Avg session duration
  AVG(pv.duration_seconds) FILTER (WHERE pv.duration_seconds IS NOT NULL) AS avg_duration_seconds,

  -- Downloads
  COUNT(DISTINCT md.id) AS total_downloads,
  COUNT(DISTINCT CASE WHEN md.downloaded_at > NOW() - INTERVAL '30 days' THEN md.id END) AS downloads_last_30_days,

  -- Leads
  COUNT(DISTINCT lc.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN lc.converted_at > NOW() - INTERVAL '30 days' THEN lc.id END) AS leads_last_30_days,

  -- Device breakdown
  COUNT(*) FILTER (WHERE pv.device_type = 'mobile') AS mobile_views,
  COUNT(*) FILTER (WHERE pv.device_type = 'desktop') AS desktop_views,
  COUNT(*) FILTER (WHERE pv.device_type = 'tablet') AS tablet_views,

  -- Active listings count
  COUNT(DISTINCT l.id) FILTER (WHERE l.ops_status NOT IN ('cancelled', 'on_hold')) AS active_listings,

  -- Last updated
  NOW() AS last_refreshed

FROM agents a
LEFT JOIN listings l ON l.agent_id = a.id
LEFT JOIN page_views pv ON pv.agent_id = a.id
LEFT JOIN media_downloads md ON md.agent_id = a.id
LEFT JOIN lead_conversions lc ON lc.agent_id = a.id
GROUP BY a.id, a.name, a.slug;

-- Index for quick lookup
CREATE UNIQUE INDEX idx_agent_analytics_summary_id ON agent_analytics_summary(agent_id);

-- =====================
-- 5. LISTING ANALYTICS SUMMARY
-- =====================
CREATE MATERIALIZED VIEW listing_analytics_summary AS
SELECT
  l.id AS listing_id,
  l.address,
  l.agent_id,

  -- Views
  COUNT(DISTINCT pv.id) AS total_views,
  COUNT(DISTINCT CASE WHEN pv.created_at > NOW() - INTERVAL '7 days' THEN pv.id END) AS views_last_7_days,
  COUNT(DISTINCT pv.visitor_id) AS unique_visitors,

  -- Engagement
  AVG(pv.duration_seconds) FILTER (WHERE pv.duration_seconds IS NOT NULL) AS avg_duration_seconds,
  AVG(pv.scroll_depth) FILTER (WHERE pv.scroll_depth IS NOT NULL) AS avg_scroll_depth,

  -- Downloads
  COUNT(DISTINCT md.id) AS total_downloads,

  -- Leads
  COUNT(DISTINCT lc.id) AS total_leads,

  -- Top referrers
  MODE() WITHIN GROUP (ORDER BY pv.referrer) FILTER (WHERE pv.referrer IS NOT NULL) AS top_referrer,

  -- Device breakdown
  ROUND(100.0 * COUNT(*) FILTER (WHERE pv.device_type = 'mobile') / NULLIF(COUNT(*), 0), 1) AS mobile_pct,

  NOW() AS last_refreshed

FROM listings l
LEFT JOIN page_views pv ON pv.listing_id = l.id
LEFT JOIN media_downloads md ON md.listing_id = l.id
LEFT JOIN lead_conversions lc ON lc.listing_id = l.id
GROUP BY l.id, l.address, l.agent_id;

CREATE UNIQUE INDEX idx_listing_analytics_summary_id ON listing_analytics_summary(listing_id);

-- =====================
-- 6. FUNCTION TO REFRESH ANALYTICS
-- =====================
CREATE OR REPLACE FUNCTION refresh_analytics_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_analytics_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY listing_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 7. RLS POLICIES
-- =====================
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_conversions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert page views (public tracking)
CREATE POLICY "Anyone can insert page views"
  ON page_views FOR INSERT
  WITH CHECK (true);

-- Agents can view their own analytics
CREATE POLICY "Agents can view own page views"
  ON page_views FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

-- Staff can view all analytics
CREATE POLICY "Staff can view all page views"
  ON page_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Media downloads policies
CREATE POLICY "Anyone can insert downloads"
  ON media_downloads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents can view own downloads"
  ON media_downloads FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Staff can view all downloads"
  ON media_downloads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- Lead conversion policies
CREATE POLICY "Anyone can insert lead conversions"
  ON lead_conversions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agents can view own leads"
  ON lead_conversions FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Staff can view all leads"
  ON lead_conversions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email'
  ));

-- =====================
-- 8. MARKET BENCHMARKS TABLE
-- =====================
CREATE TABLE market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  metric_value DECIMAL(12, 2) NOT NULL,
  sample_size INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Insert initial benchmarks (will be updated periodically)
INSERT INTO market_benchmarks (metric_name, metric_value, sample_size, notes) VALUES
  ('avg_views_per_listing', 1203, 500, 'Average property page views per listing'),
  ('avg_session_duration', 45, 500, 'Average session duration in seconds'),
  ('avg_lead_conversion_rate', 2.5, 500, 'Average % of views that become leads'),
  ('avg_download_rate', 15, 500, 'Average % of visitors who download media');
