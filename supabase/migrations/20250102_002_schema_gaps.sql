-- ============================================================================
-- Schema Gaps Migration - December 30, 2024
-- Fixes missing view, tables, and columns identified in deep audit
-- ============================================================================

-- ============================================================================
-- 1. Agent Activity Summary View
-- Referenced in: src/lib/queries/agents.ts:47, src/app/api/admin/analytics/route.ts:89
-- ============================================================================
CREATE OR REPLACE VIEW agent_activity_summary AS
SELECT
  a.id as agent_id,
  a.name,
  a.email,
  COUNT(DISTINCT l.id) as total_listings,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') as active_listings,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_cents), 0) as total_revenue_cents,
  MAX(l.created_at) as last_listing_at,
  MAX(o.created_at) as last_order_at
FROM agents a
LEFT JOIN listings l ON l.agent_id = a.id
LEFT JOIN orders o ON o.agent_id = a.id
GROUP BY a.id, a.name, a.email;

-- ============================================================================
-- 2. Agent Weekly Stats Table
-- Referenced in: src/lib/queries/agents.ts:112
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  listings_created INT DEFAULT 0,
  orders_placed INT DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  page_views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, week_start)
);

-- Enable RLS
ALTER TABLE agent_weekly_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agents can view own weekly stats"
  ON agent_weekly_stats FOR SELECT
  USING (agent_id IN (
    SELECT id FROM agents WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Staff can view all weekly stats"
  ON agent_weekly_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Staff can manage weekly stats"
  ON agent_weekly_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- ============================================================================
-- 3. Agent Contact History Table
-- Referenced in: src/lib/queries/agents.ts:156
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'sms', 'call', 'meeting')),
  subject TEXT,
  notes TEXT,
  contacted_by UUID REFERENCES staff(id),
  contacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_contact_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view contact history"
  ON agent_contact_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Staff can manage contact history"
  ON agent_contact_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_contact_history_agent_id
  ON agent_contact_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contact_history_contacted_at
  ON agent_contact_history(contacted_at DESC);

-- ============================================================================
-- 4. Staff Columns: weekly_report_enabled, timezone
-- Referenced in: src/lib/notifications/weekly-report.ts:23,45
-- ============================================================================
ALTER TABLE staff ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- ============================================================================
-- 5. Agents Column: last_contacted_at
-- Referenced in: src/lib/queries/agents.ts:178
-- ============================================================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Index for sorting by last contact
CREATE INDEX IF NOT EXISTS idx_agents_last_contacted_at
  ON agents(last_contacted_at DESC NULLS LAST);

-- ============================================================================
-- Trigger: Auto-update agents.last_contacted_at when contact history added
-- ============================================================================
CREATE OR REPLACE FUNCTION update_agent_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agents
  SET last_contacted_at = NEW.contacted_at
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_last_contacted ON agent_contact_history;
CREATE TRIGGER trigger_update_agent_last_contacted
  AFTER INSERT ON agent_contact_history
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_last_contacted();

-- ============================================================================
-- Done
-- ============================================================================
SELECT 'Schema gaps migration completed successfully!' as result;
