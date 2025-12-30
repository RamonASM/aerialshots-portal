-- Phase 7: Skill Executions Schema
-- Tracks AI skill executions and outputs for listings

-- Skill execution tracking
CREATE TABLE IF NOT EXISTS skill_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input JSONB,
  output JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 6),
  triggered_by TEXT NOT NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('manual', 'agent', 'workflow', 'cron', 'webhook')),
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skill_executions_listing ON skill_executions(listing_id);
CREATE INDEX idx_skill_executions_status ON skill_executions(status);
CREATE INDEX idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX idx_skill_executions_started ON skill_executions(started_at DESC);

-- Enable realtime for skill executions
ALTER PUBLICATION supabase_realtime ADD TABLE skill_executions;

-- Store skill outputs for listings
CREATE TABLE IF NOT EXISTS listing_skill_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  output_type TEXT NOT NULL,
  output_data JSONB NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  execution_id UUID REFERENCES skill_executions(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, skill_id, output_type)
);

CREATE INDEX idx_listing_skill_outputs_listing ON listing_skill_outputs(listing_id);
CREATE INDEX idx_listing_skill_outputs_skill ON listing_skill_outputs(skill_id);
CREATE INDEX idx_listing_skill_outputs_type ON listing_skill_outputs(output_type);

-- Skill configurations per agent (custom settings)
CREATE TABLE IF NOT EXISTS agent_skill_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_id)
);

-- Skill usage quotas and tracking
CREATE TABLE IF NOT EXISTS skill_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  executions_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_id, period_start)
);

CREATE INDEX idx_skill_usage_agent ON skill_usage(agent_id);
CREATE INDEX idx_skill_usage_period ON skill_usage(period_start, period_end);

-- RLS Policies
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_skill_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skill_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_usage ENABLE ROW LEVEL SECURITY;

-- Staff can see all executions
CREATE POLICY "Staff can view all skill executions"
  ON skill_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
    )
  );

-- Staff can manage executions
CREATE POLICY "Staff can manage skill executions"
  ON skill_executions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
    )
  );

-- Agents can view their own listing outputs
CREATE POLICY "Agents can view their listing skill outputs"
  ON listing_skill_outputs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE l.id = listing_skill_outputs.listing_id
      AND a.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
    )
  );

-- Agents can manage their own skill configs
CREATE POLICY "Agents can manage their skill configs"
  ON agent_skill_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_skill_configs.agent_id
      AND agents.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
    )
  );

-- Agents can view their usage
CREATE POLICY "Agents can view their skill usage"
  ON skill_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = skill_usage.agent_id
      AND agents.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.auth_user_id = auth.uid()
    )
  );

-- Function to update listing_skill_outputs timestamp
CREATE OR REPLACE FUNCTION update_listing_skill_output_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_skill_outputs_updated
  BEFORE UPDATE ON listing_skill_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_skill_output_timestamp();

-- Function to track skill usage
CREATE OR REPLACE FUNCTION track_skill_usage()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id UUID;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Only track completed executions
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get agent_id from listing if available
    IF NEW.listing_id IS NOT NULL THEN
      SELECT agent_id INTO v_agent_id FROM listings WHERE id = NEW.listing_id;
    END IF;

    -- Use agent_id from execution if not from listing
    IF v_agent_id IS NULL THEN
      v_agent_id := NEW.agent_id;
    END IF;

    -- Skip if no agent associated
    IF v_agent_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Calculate period (monthly)
    v_period_start := DATE_TRUNC('month', NEW.completed_at)::DATE;
    v_period_end := (DATE_TRUNC('month', NEW.completed_at) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Upsert usage record
    INSERT INTO skill_usage (agent_id, skill_id, period_start, period_end, executions_count, tokens_used, cost_usd)
    VALUES (v_agent_id, NEW.skill_id, v_period_start, v_period_end, 1, COALESCE(NEW.tokens_used, 0), COALESCE(NEW.cost_usd, 0))
    ON CONFLICT (agent_id, skill_id, period_start)
    DO UPDATE SET
      executions_count = skill_usage.executions_count + 1,
      tokens_used = skill_usage.tokens_used + COALESCE(NEW.tokens_used, 0),
      cost_usd = skill_usage.cost_usd + COALESCE(NEW.cost_usd, 0),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_skill_usage_trigger
  AFTER UPDATE ON skill_executions
  FOR EACH ROW
  EXECUTE FUNCTION track_skill_usage();
