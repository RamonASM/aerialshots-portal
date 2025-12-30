-- Phase 7: Skills Platform Integration
-- Migration: skill_executions and listing_skill_outputs tables

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
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  parent_execution_id UUID REFERENCES skill_executions(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_skill_executions_listing ON skill_executions(listing_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_status ON skill_executions(status);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_executions_started ON skill_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_executions_trigger_source ON skill_executions(trigger_source);

-- Store skill outputs for listings (descriptions, captions, videos, etc.)
CREATE TABLE IF NOT EXISTS listing_skill_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  output_type TEXT NOT NULL,
  output_data JSONB NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  execution_id UUID REFERENCES skill_executions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, skill_id, output_type)
);

-- Indexes for listing skill outputs
CREATE INDEX IF NOT EXISTS idx_listing_skill_outputs_listing ON listing_skill_outputs(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_skill_outputs_skill ON listing_skill_outputs(skill_id);
CREATE INDEX IF NOT EXISTS idx_listing_skill_outputs_type ON listing_skill_outputs(output_type);

-- Enable realtime for skill_executions (for live status updates in admin UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'skill_executions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE skill_executions;
  END IF;
END $$;

-- RLS Policies for skill_executions
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;

-- Staff can view all skill executions
CREATE POLICY "Staff can view skill executions" ON skill_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
    )
  );

-- Staff can insert skill executions
CREATE POLICY "Staff can insert skill executions" ON skill_executions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
    )
  );

-- Staff can update skill executions
CREATE POLICY "Staff can update skill executions" ON skill_executions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
    )
  );

-- Service role can do anything (for agents/workflows)
CREATE POLICY "Service role full access to skill executions" ON skill_executions
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for listing_skill_outputs
ALTER TABLE listing_skill_outputs ENABLE ROW LEVEL SECURITY;

-- Anyone can view listing skill outputs (public data for property pages)
CREATE POLICY "Anyone can view listing skill outputs" ON listing_skill_outputs
  FOR SELECT
  USING (true);

-- Staff can insert/update listing skill outputs
CREATE POLICY "Staff can insert listing skill outputs" ON listing_skill_outputs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update listing skill outputs" ON listing_skill_outputs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = auth.uid()
    )
  );

-- Service role can do anything (for agents/workflows)
CREATE POLICY "Service role full access to listing skill outputs" ON listing_skill_outputs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at on listing_skill_outputs
CREATE OR REPLACE FUNCTION update_listing_skill_outputs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_skill_outputs_updated_at ON listing_skill_outputs;
CREATE TRIGGER listing_skill_outputs_updated_at
  BEFORE UPDATE ON listing_skill_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_skill_outputs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE skill_executions IS 'Tracks execution of AI skills (image, video, content generation)';
COMMENT ON TABLE listing_skill_outputs IS 'Stores generated skill outputs linked to listings';
COMMENT ON COLUMN skill_executions.skill_id IS 'Identifier of the skill (e.g., image-analyze, video-slideshow, listing-description)';
COMMENT ON COLUMN skill_executions.trigger_source IS 'How the skill was triggered: manual (UI), agent, workflow, cron, or webhook';
COMMENT ON COLUMN listing_skill_outputs.output_type IS 'Type of output (e.g., description_professional, caption_instagram, video_slideshow)';
