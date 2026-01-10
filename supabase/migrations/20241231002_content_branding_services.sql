-- Made idempotent: 2026-01-07
-- ============================================================================
-- Content Branding & Social Media Services
-- Adds content retainer packages and video production services
-- ============================================================================

-- ============================================================================
-- Content Retainer Packages (Monthly Subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_retainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tier INTEGER NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  a_la_carte_value DECIMAL(10,2),
  savings DECIMAL(10,2),
  videos_per_month INTEGER NOT NULL,
  shoot_days_per_month INTEGER NOT NULL,
  turnaround_hours INTEGER, -- NULL means standard
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  included_video_types JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Seed Data: Content Retainer Packages
-- ============================================================================
INSERT INTO content_retainers (
  key, name, tier, price_monthly, a_la_carte_value, savings,
  videos_per_month, shoot_days_per_month, turnaround_hours,
  description, features, included_video_types, is_popular, display_order
) VALUES
  (
    'momentum', 'Momentum', 1, 1488, 1975, 487,
    8, 2, NULL,
    'Build your brand foundation with consistent content',
    ARRAY[
      'Branding photoshoot',
      'Scripting assistance',
      'Teleprompter support',
      'Monthly strategy call',
      'Notion dashboard',
      'Slack support'
    ],
    '{"educational": 5, "property_tour": 1, "business_spotlight": 1, "closing_event": 1}',
    false, 1
  ),
  (
    'dominance', 'Dominance', 2, 2500, 2900, 400,
    12, 3, 48,
    'Dominate your market with premium content production',
    ARRAY[
      'All Momentum features',
      'Priority scheduling',
      '48-hour priority edits',
      'Bi-weekly strategy calls',
      'Advanced analytics dashboard'
    ],
    '{"educational": 8, "property_tour": 2, "business_spotlight": 1, "closing_event": 1}',
    true, 2
  ),
  (
    'elite', 'Elite', 3, 4500, 5500, 1000,
    20, 4, 24,
    'Full-service content production for top producers',
    ARRAY[
      'All Dominance features',
      'Dedicated account manager',
      'Weekly strategy calls',
      'Team training session',
      'Branding photos for entire team',
      '24-hour priority turnaround'
    ],
    '{"educational": 15, "property_tour": 3, "business_spotlight": 1, "closing_event": 1}',
    false, 3
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  a_la_carte_value = EXCLUDED.a_la_carte_value,
  savings = EXCLUDED.savings,
  videos_per_month = EXCLUDED.videos_per_month,
  shoot_days_per_month = EXCLUDED.shoot_days_per_month,
  turnaround_hours = EXCLUDED.turnaround_hours,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  included_video_types = EXCLUDED.included_video_types,
  is_popular = EXCLUDED.is_popular,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- Additional Services: Content Video Production (A La Carte)
-- ============================================================================
INSERT INTO services (key, name, base_price, price_label, duration_minutes, category, display_order) VALUES
  -- Content Video Services (for retainer add-ons or standalone)
  ('educationalVideo', 'Educational Video', 125, '$125 (3-video minimum)', 30, 'content', 80),
  ('propertyTourVideo', 'Property Tour Video', 550, NULL, 60, 'content', 81),
  ('businessSpotlight', 'Business Spotlight Video', 450, NULL, 45, 'content', 82),
  ('closingVideo', 'Closing Celebration Video', 350, NULL, 30, 'content', 83),
  ('eventVideo', 'Event Video', 650, NULL, 90, 'content', 84),

  -- Core Listing Video (simpler than full Listing Video)
  ('coreListingVideo', 'Core Listing Video', 200, NULL, 30, 'video', 59),

  -- Additional Drone Location
  ('droneLocation', 'Additional Drone Location', 75, NULL, 15, 'addon', 12),

  -- Social Media Management
  ('socialManagement', 'Social Media Management', 600, '$600/month', 0, 'subscription', 90)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  base_price = EXCLUDED.base_price,
  price_label = EXCLUDED.price_label,
  duration_minutes = EXCLUDED.duration_minutes,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================================
-- Content Retainer Subscriptions (tracks active subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL, -- References clients/agents
  retainer_id UUID NOT NULL REFERENCES content_retainers(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, cancelled
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  videos_used_this_month INTEGER DEFAULT 0,
  shoot_days_used_this_month INTEGER DEFAULT 0,
  stripe_subscription_id TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Content Videos (tracks delivered content videos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES content_subscriptions(id),
  client_id UUID NOT NULL,
  video_type TEXT NOT NULL, -- educational, property_tour, business_spotlight, closing, event
  title TEXT,
  description TEXT,
  shoot_date DATE,
  delivered_at TIMESTAMPTZ,
  storage_path TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, shot, editing, delivered
  is_addon BOOLEAN DEFAULT false, -- true if purchased as add-on (extra cost)
  addon_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Travel Fee Tiers
-- ============================================================================
CREATE TABLE IF NOT EXISTS travel_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_miles INTEGER NOT NULL,
  max_miles INTEGER,
  fee_per_mile DECIMAL(5,2) NOT NULL,
  flat_fee DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO travel_tiers (min_miles, max_miles, fee_per_mile, flat_fee, description) VALUES
  (0, 40, 0, 0, 'Free - Within service area'),
  (41, 75, 1.50, NULL, '$1.50/mile'),
  (76, 150, 2.00, NULL, '$2.00/mile'),
  (151, NULL, 3.00, NULL, '$3.00/mile')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_content_retainers_active ON content_retainers(is_active);
CREATE INDEX IF NOT EXISTS idx_content_subscriptions_client ON content_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_content_subscriptions_status ON content_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_content_videos_subscription ON content_videos(subscription_id);
CREATE INDEX IF NOT EXISTS idx_content_videos_client ON content_videos(client_id);
CREATE INDEX IF NOT EXISTS idx_services_content ON services(category) WHERE category = 'content';

-- ============================================================================
-- Updated At Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS content_retainers_updated_at ON content_retainers;
CREATE TRIGGER content_retainers_updated_at
  BEFORE UPDATE ON content_retainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS content_subscriptions_updated_at ON content_subscriptions;
CREATE TRIGGER content_subscriptions_updated_at
  BEFORE UPDATE ON content_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS content_videos_updated_at ON content_videos;
CREATE TRIGGER content_videos_updated_at
  BEFORE UPDATE ON content_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
