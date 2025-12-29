-- Phase 7: Drone Airspace & Email Marketing Tables
-- Migration for drone airspace checking and bulk email marketing features

-- ============================================
-- AIRSPACE CHECKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS airspace_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  address TEXT,
  can_fly BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('clear', 'caution', 'restricted', 'prohibited')),
  airspace_class TEXT CHECK (airspace_class IN ('A', 'B', 'C', 'D', 'E', 'G')),
  max_altitude INTEGER DEFAULT 400,
  nearby_airports JSONB DEFAULT '[]',
  restrictions JSONB DEFAULT '[]',
  advisories JSONB DEFAULT '[]',
  authorization_required BOOLEAN DEFAULT FALSE,
  authorization_type TEXT,
  authorization_instructions TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for caching
CREATE UNIQUE INDEX IF NOT EXISTS idx_airspace_checks_location
ON airspace_checks(lat, lng);

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS idx_airspace_checks_expires
ON airspace_checks(expires_at);

-- ============================================
-- MARKETING CAMPAIGNS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  recipient_filter JSONB DEFAULT NULL,
  recipient_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
ON marketing_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by
ON marketing_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled
ON marketing_campaigns(scheduled_at)
WHERE status = 'scheduled';

-- ============================================
-- CAMPAIGN SENDS TABLE (Tracking individual sends)
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign
ON campaign_sends(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_status
ON campaign_sends(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_campaign_sends_recipient
ON campaign_sends(recipient_email);

-- ============================================
-- MARKETING LISTS TABLE (Custom recipient lists)
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'dynamic')),
  filter_criteria JSONB DEFAULT NULL,
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MARKETING LIST MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES marketing_lists(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed BOOLEAN DEFAULT TRUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_list_members_list
ON marketing_list_members(list_id);

CREATE INDEX IF NOT EXISTS idx_marketing_list_members_email
ON marketing_list_members(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_list_members_unique
ON marketing_list_members(list_id, email);

-- ============================================
-- EMAIL UNSUBSCRIBES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email
ON email_unsubscribes(email);

-- ============================================
-- ADD AIRSPACE CHECK TO ORDERS
-- ============================================

-- Add airspace check reference to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'airspace_check_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN airspace_check_id UUID REFERENCES airspace_checks(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'drone_approved'
  ) THEN
    ALTER TABLE orders ADD COLUMN drone_approved BOOLEAN DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'drone_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN drone_notes TEXT;
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE airspace_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Airspace checks - public read (for caching), authenticated write
CREATE POLICY "Airspace checks are publicly readable"
ON airspace_checks FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create airspace checks"
ON airspace_checks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Marketing campaigns - staff only
CREATE POLICY "Staff can manage marketing campaigns"
ON marketing_campaigns FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Campaign sends - staff only
CREATE POLICY "Staff can view campaign sends"
ON campaign_sends FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Marketing lists - staff only
CREATE POLICY "Staff can manage marketing lists"
ON marketing_lists FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- List members - staff only
CREATE POLICY "Staff can manage list members"
ON marketing_list_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- Unsubscribes - public write for unsubscribe links, staff read
CREATE POLICY "Anyone can unsubscribe"
ON email_unsubscribes FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Staff can view unsubscribes"
ON email_unsubscribes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.email = auth.jwt()->>'email'
    AND staff.is_active = true
  )
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for marketing_campaigns
CREATE OR REPLACE FUNCTION update_marketing_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketing_campaigns_timestamp ON marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_timestamp
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaign_timestamp();

-- Auto-update member count on list
CREATE OR REPLACE FUNCTION update_list_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE marketing_lists
    SET member_count = (
      SELECT COUNT(*) FROM marketing_list_members
      WHERE list_id = NEW.list_id AND subscribed = true
    )
    WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE marketing_lists
    SET member_count = (
      SELECT COUNT(*) FROM marketing_list_members
      WHERE list_id = OLD.list_id AND subscribed = true
    )
    WHERE id = OLD.list_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE marketing_lists
    SET member_count = (
      SELECT COUNT(*) FROM marketing_list_members
      WHERE list_id = NEW.list_id AND subscribed = true
    )
    WHERE id = NEW.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_list_member_count_trigger ON marketing_list_members;
CREATE TRIGGER update_list_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON marketing_list_members
  FOR EACH ROW
  EXECUTE FUNCTION update_list_member_count();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get campaign analytics
CREATE OR REPLACE FUNCTION get_campaign_analytics(p_campaign_id UUID)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  total_bounced BIGINT,
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) as total_sent,
    COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as total_delivered,
    COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as total_opened,
    COUNT(*) FILTER (WHERE status = 'clicked') as total_clicked,
    COUNT(*) FILTER (WHERE status = 'bounced') as total_bounced,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status IN ('opened', 'clicked'))::DECIMAL /
         COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked'))) * 100, 2
      )
      ELSE 0
    END as open_rate,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'clicked')::DECIMAL /
         COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked'))) * 100, 2
      )
      ELSE 0
    END as click_rate,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE status = 'bounced')::DECIMAL / COUNT(*)) * 100, 2
      )
      ELSE 0
    END as bounce_rate
  FROM campaign_sends
  WHERE campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE airspace_checks IS 'Cache of FAA airspace check results for drone flight eligibility';
COMMENT ON TABLE marketing_campaigns IS 'Email marketing campaigns for bulk agent communications';
COMMENT ON TABLE campaign_sends IS 'Individual email send tracking for campaign analytics';
COMMENT ON TABLE marketing_lists IS 'Custom recipient lists for targeted marketing';
COMMENT ON TABLE marketing_list_members IS 'Members of marketing lists';
COMMENT ON TABLE email_unsubscribes IS 'Email addresses that have unsubscribed from marketing';
