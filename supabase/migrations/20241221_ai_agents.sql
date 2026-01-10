-- AI Agents System
-- Version: 1.0.0
-- Date: 2024-12-21
-- Purpose: Internal AI agents for operations, content, and development automation

-- =====================
-- AI_AGENTS (registry of all AI agents)
-- =====================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('operations', 'content', 'development', 'lifestyle')),
  is_active BOOLEAN DEFAULT TRUE,
  execution_mode VARCHAR(20) DEFAULT 'sync' CHECK (execution_mode IN ('sync', 'async', 'scheduled')),
  system_prompt TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at for ai_agents
DROP TRIGGER IF EXISTS ai_agents_updated_at ON ai_agents;
CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX IF NOT EXISTS idx_ai_agents_category ON ai_agents(category);
CREATE INDEX IF NOT EXISTS idx_ai_agents_is_active ON ai_agents(is_active);

-- =====================
-- AI_AGENT_EXECUTIONS (execution log for tracking)
-- =====================
CREATE TABLE IF NOT EXISTS ai_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug VARCHAR(100) NOT NULL REFERENCES ai_agents(slug),
  triggered_by UUID REFERENCES staff(id),
  listing_id UUID REFERENCES listings(id),
  campaign_id UUID REFERENCES listing_campaigns(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  trigger_source VARCHAR(50), -- 'webhook', 'cron', 'manual', 'api'
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_agent_slug ON ai_agent_executions(agent_slug);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_status ON ai_agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_listing_id ON ai_agent_executions(listing_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_created_at ON ai_agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_trigger_source ON ai_agent_executions(trigger_source);

-- =====================
-- AI_AGENT_WORKFLOWS (multi-step workflow tracking)
-- =====================
CREATE TABLE IF NOT EXISTS ai_agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL, -- 'order.delivered', 'listing.created', etc.
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  listing_id UUID REFERENCES listings(id),
  campaign_id UUID REFERENCES listing_campaigns(id),
  current_step INTEGER DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]', -- Array of {agent_slug, status, output, completed_at}
  context JSONB DEFAULT '{}', -- Shared context across steps
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Auto-update updated_at for ai_agent_workflows
DROP TRIGGER IF EXISTS ai_agent_workflows_updated_at ON ai_agent_workflows;
CREATE TRIGGER ai_agent_workflows_updated_at
  BEFORE UPDATE ON ai_agent_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for workflow tracking
CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_trigger_event ON ai_agent_workflows(trigger_event);
CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_status ON ai_agent_workflows(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_workflows_listing_id ON ai_agent_workflows(listing_id);

-- =====================
-- Insert initial agent definitions
-- =====================

-- Development Agents
INSERT INTO ai_agents (slug, name, description, category, execution_mode, system_prompt) VALUES
  ('claude-md-updater', 'CLAUDE.md Updater', 'Keeps /CLAUDE.md documentation updated with codebase changes', 'development', 'async',
   'You are a documentation specialist. Analyze codebase changes and update CLAUDE.md with new API routes, database schemas, integrations, environment variables, and workflows. Be concise and maintain existing structure.'),
  ('changelog-generator', 'Changelog Generator', 'Auto-generates changelog entries from git commits', 'development', 'async',
   'You are a changelog writer. Analyze git commits and generate clear, user-friendly changelog entries following Keep a Changelog format.'),
  ('code-reviewer', 'Code Reviewer', 'Reviews pull requests for patterns, security, and best practices', 'development', 'async',
   'You are a senior code reviewer. Review code for security vulnerabilities, performance issues, and adherence to project patterns. Be constructive and specific.')
ON CONFLICT (slug) DO NOTHING;

-- Operations Agents
INSERT INTO ai_agents (slug, name, description, category, execution_mode, system_prompt) VALUES
  ('care-task-generator', 'Care Task Generator', 'Creates care tasks when media is delivered', 'operations', 'async',
   'You are a customer success coordinator. When media is delivered, generate appropriate care call tasks with scripts tailored to the delivery type.'),
  ('delivery-notifier', 'Delivery Notifier', 'Sends personalized delivery notifications with usage tips', 'operations', 'sync',
   'You are a helpful media delivery specialist. Create personalized delivery emails that explain what was delivered and how to use each media type effectively.'),
  ('qc-assistant', 'QC Assistant', 'Pre-screens photos for quality issues and calculates priority', 'operations', 'sync',
   'You are a quality control expert for real estate photography. Analyze images for common issues and rate priority based on deadlines and client importance.'),
  ('job-priority', 'Job Priority Calculator', 'Calculates and updates job priority scores for QC queue', 'operations', 'sync',
   'Calculate job priority based on: rush flag (+50), hours since ready (+2/hour), and deadline proximity. Output green/yellow/red status.')
ON CONFLICT (slug) DO NOTHING;

-- Content Agents
INSERT INTO ai_agents (slug, name, description, category, execution_mode, system_prompt) VALUES
  ('listing-description', 'Listing Description Writer', 'Auto-generates MLS descriptions from listing data', 'content', 'sync',
   'You are a luxury real estate copywriter. Write compelling MLS descriptions that highlight property features while maintaining professional tone. Generate 3 variations: brief, standard, and detailed.'),
  ('social-captions', 'Social Caption Generator', 'Creates Instagram/Facebook captions with hashtags', 'content', 'sync',
   'You are a social media expert for real estate. Write engaging captions that drive engagement while staying authentic to the agent''s brand. Include relevant hashtags.'),
  ('media-tips', 'Media Tips Generator', 'Generates contextual tips for each media category', 'content', 'sync',
   'You are a real estate marketing expert. Provide specific, actionable tips for how agents should use each type of media asset (MLS photos, social content, video, drone, etc.).'),
  ('campaign-launcher', 'Campaign Launcher', 'Auto-starts ListingLaunch campaigns for delivered listings', 'content', 'async',
   'You are a marketing automation coordinator. Initialize ListingLaunch campaigns with appropriate carousel types based on listing characteristics.')
ON CONFLICT (slug) DO NOTHING;

-- Lifestyle/SEO Agents
INSERT INTO ai_agents (slug, name, description, category, execution_mode, system_prompt) VALUES
  ('neighborhood-data', 'Neighborhood Data Aggregator', 'Aggregates neighborhood data for lifestyle pages', 'lifestyle', 'async',
   'You are a neighborhood research specialist. Compile relevant local data including dining, shopping, schools, parks, and walkability scores for property lifestyle pages.'),
  ('seo-meta', 'SEO Meta Generator', 'Generates SEO-optimized meta tags for property pages', 'lifestyle', 'sync',
   'You are an SEO specialist for real estate. Create optimized title tags, meta descriptions, and Open Graph tags that balance search visibility with click-through appeal.'),
  ('portfolio-stats', 'Portfolio Stats Calculator', 'Calculates agent portfolio statistics', 'lifestyle', 'sync',
   'Calculate and format agent portfolio statistics including total volume, average DOM, listing count, and year-over-year comparisons.')
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- RLS Policies (admin-only access for now)
-- =====================

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_workflows ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
DROP POLICY IF EXISTS "Service role has full access to ai_agents" ON ai_agents;
CREATE POLICY "Service role has full access to ai_agents" ON ai_agents FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to ai_agent_executions" ON ai_agent_executions;
CREATE POLICY "Service role has full access to ai_agent_executions" ON ai_agent_executions FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to ai_agent_workflows" ON ai_agent_workflows;
CREATE POLICY "Service role has full access to ai_agent_workflows" ON ai_agent_workflows FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================
-- Helper function for triggering workflows
-- =====================

CREATE OR REPLACE FUNCTION trigger_agent_workflow(
  p_trigger_event VARCHAR(100),
  p_listing_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  INSERT INTO ai_agent_workflows (
    name,
    trigger_event,
    listing_id,
    campaign_id,
    context
  ) VALUES (
    p_trigger_event || ' workflow',
    p_trigger_event,
    p_listing_id,
    p_campaign_id,
    p_context
  )
  RETURNING id INTO v_workflow_id;

  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- View for agent dashboard metrics
-- =====================

CREATE OR REPLACE VIEW ai_agent_metrics AS
SELECT
  a.slug,
  a.name,
  a.category,
  a.is_active,
  COUNT(e.id) as total_executions,
  COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_executions,
  AVG(e.duration_ms) as avg_duration_ms,
  SUM(e.tokens_used) as total_tokens_used,
  MAX(e.created_at) as last_execution
FROM ai_agents a
LEFT JOIN ai_agent_executions e ON a.slug = e.agent_slug
GROUP BY a.slug, a.name, a.category, a.is_active;

COMMENT ON TABLE ai_agents IS 'Registry of all AI agents in the system';
COMMENT ON TABLE ai_agent_executions IS 'Execution log for AI agent runs (usage tracking, no billing)';
COMMENT ON TABLE ai_agent_workflows IS 'Multi-step workflow orchestration for complex agent pipelines';
