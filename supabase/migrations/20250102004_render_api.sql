-- Made idempotent: 2026-01-07
-- Render API Tables
-- Version: 1.0.0
-- Date: 2025-01-02
-- Purpose: Text-to-image rendering system (Bannerbear replacement)

-- =====================
-- 1. RENDER TEMPLATES
-- Core template definitions for image rendering
-- =====================
CREATE TABLE IF NOT EXISTS render_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  name TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'story_archetype', 'listing_marketing', 'carousel_slide',
    'social_post', 'agent_branding', 'market_update'
  )),
  subcategory TEXT,

  -- Inheritance (for template composition)
  extends_slug TEXT REFERENCES render_templates(slug) ON DELETE SET NULL,

  -- Template content (JSON)
  canvas JSONB NOT NULL DEFAULT '{"width": 1080, "height": 1350}',
  layers JSONB NOT NULL DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  animations JSONB DEFAULT '[]',
  brand_kit_bindings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Resolved template (cached after inheritance resolution)
  resolved_template JSONB,
  resolved_at TIMESTAMPTZ,

  -- Ownership (NULL = system template)
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_system BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,

  -- Audit
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_templates_slug ON render_templates(slug);
CREATE INDEX IF NOT EXISTS idx_render_templates_category ON render_templates(category);
CREATE INDEX IF NOT EXISTS idx_render_templates_status ON render_templates(status);
CREATE INDEX IF NOT EXISTS idx_render_templates_extends ON render_templates(extends_slug);
CREATE INDEX IF NOT EXISTS idx_render_templates_agent ON render_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_render_templates_public ON render_templates(is_public) WHERE is_public = TRUE;

-- =====================
-- 2. TEMPLATE VERSIONS
-- Version history for templates
-- =====================
CREATE TABLE IF NOT EXISTS render_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES render_templates(id) ON DELETE CASCADE,
  version TEXT NOT NULL,

  -- Snapshot of template at this version
  template_snapshot JSONB NOT NULL,

  -- Change tracking
  change_summary TEXT,
  changed_by UUID REFERENCES staff(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_render_template_versions_template ON render_template_versions(template_id);

-- =====================
-- 3. TEMPLATE SETS
-- Groups of templates for carousels/campaigns
-- =====================
CREATE TABLE IF NOT EXISTS render_template_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Set configuration
  set_type TEXT NOT NULL CHECK (set_type IN (
    'carousel', 'campaign', 'story', 'marketing_kit'
  )),

  -- Story archetype (for story carousels)
  story_archetype TEXT,

  -- Shared configuration
  shared_variables JSONB DEFAULT '{}',
  shared_brand_bindings JSONB DEFAULT '{}',

  -- Ownership
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_system BOOLEAN DEFAULT FALSE,

  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_template_sets_slug ON render_template_sets(slug);
CREATE INDEX IF NOT EXISTS idx_render_template_sets_type ON render_template_sets(set_type);
CREATE INDEX IF NOT EXISTS idx_render_template_sets_archetype ON render_template_sets(story_archetype);

-- =====================
-- 4. TEMPLATE SET ITEMS
-- Junction table for set -> template relationship
-- =====================
CREATE TABLE IF NOT EXISTS render_template_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES render_template_sets(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES render_templates(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,
  slide_type TEXT,

  -- Per-slot overrides
  variable_overrides JSONB DEFAULT '{}',

  UNIQUE(set_id, position)
);

CREATE INDEX IF NOT EXISTS idx_render_template_set_items_set ON render_template_set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_render_template_set_items_template ON render_template_set_items(template_id);

-- =====================
-- 5. RENDER JOBS
-- Async job tracking for rendering
-- =====================
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job type
  job_type TEXT NOT NULL CHECK (job_type IN ('single', 'carousel', 'batch')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'partial', 'failed', 'cancelled'
  )),

  -- Source reference
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES listing_campaigns(id) ON DELETE SET NULL,
  carousel_id UUID REFERENCES listing_carousels(id) ON DELETE SET NULL,

  -- Template reference
  template_id UUID REFERENCES render_templates(id) ON DELETE SET NULL,
  template_set_id UUID REFERENCES render_template_sets(id) ON DELETE SET NULL,

  -- Input data
  input_data JSONB NOT NULL DEFAULT '{}',
  modifications JSONB,
  brand_kit JSONB,

  -- Output
  output_urls TEXT[],
  output_storage_keys TEXT[],

  -- Rendering details
  render_engine TEXT CHECK (render_engine IN ('satori_sharp', 'puppeteer_chrome')),
  render_path TEXT CHECK (render_path IN ('fast', 'standard', 'premium')),
  output_format TEXT DEFAULT 'png' CHECK (output_format IN ('png', 'jpg', 'webp')),

  -- Webhook
  webhook_url TEXT,
  webhook_fired_at TIMESTAMPTZ,
  webhook_response_status INTEGER,

  -- Timing
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  render_time_ms INTEGER,

  -- Cost
  credits_cost INTEGER DEFAULT 0,
  credits_charged BOOLEAN DEFAULT FALSE,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_agent ON render_jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_listing ON render_jobs(listing_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_campaign ON render_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_carousel ON render_jobs(carousel_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_template ON render_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_created ON render_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_render_jobs_queued ON render_jobs(queued_at) WHERE status = 'pending';

-- =====================
-- 6. RENDER JOB SLIDES
-- Individual slide tracking for carousel jobs
-- =====================
CREATE TABLE IF NOT EXISTS render_job_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES render_jobs(id) ON DELETE CASCADE,

  -- Slide info
  position INTEGER NOT NULL,
  slide_type TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),

  -- Input
  slide_data JSONB NOT NULL DEFAULT '{}',
  modifications JSONB,

  -- Output
  output_url TEXT,
  output_storage_key TEXT,
  thumbnail_url TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  render_time_ms INTEGER,

  -- Error
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_job_slides_job ON render_job_slides(job_id);
CREATE INDEX IF NOT EXISTS idx_render_job_slides_status ON render_job_slides(status);
CREATE INDEX IF NOT EXISTS idx_render_job_slides_position ON render_job_slides(job_id, position);

-- =====================
-- 7. RENDER FONTS
-- Custom fonts per agent
-- =====================
CREATE TABLE IF NOT EXISTS render_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Font identity
  family TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 400,
  style TEXT DEFAULT 'normal' CHECK (style IN ('normal', 'italic')),

  -- Storage
  storage_key TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'render-assets',
  format TEXT NOT NULL CHECK (format IN ('woff2', 'woff', 'ttf', 'otf')),
  file_size_bytes INTEGER,

  -- Metadata
  display_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_render_fonts_unique ON render_fonts(agent_id, family, weight, style);
CREATE INDEX IF NOT EXISTS idx_render_fonts_agent ON render_fonts(agent_id);
CREATE INDEX IF NOT EXISTS idx_render_fonts_family ON render_fonts(family);

-- =====================
-- 8. RENDER CACHE
-- Cache of rendered template images
-- =====================
CREATE TABLE IF NOT EXISTS render_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES render_templates(id) ON DELETE CASCADE,
  template_version TEXT NOT NULL,

  -- Cache key (hash of input variables)
  cache_key TEXT NOT NULL,
  variables_snapshot JSONB NOT NULL,
  brand_kit_id UUID,

  -- Render output
  render_status TEXT DEFAULT 'completed' CHECK (render_status IN (
    'pending', 'rendering', 'completed', 'failed'
  )),
  rendered_url TEXT,
  thumbnail_url TEXT,
  storage_key TEXT,

  -- Performance
  render_time_ms INTEGER,
  file_size_bytes INTEGER,

  -- Cache control
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_render_cache_template ON render_cache(template_id);
CREATE INDEX IF NOT EXISTS idx_render_cache_key ON render_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_render_cache_expires ON render_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_render_cache_status ON render_cache(render_status);

-- =====================
-- 9. TEMPLATE ANALYTICS
-- Track template usage and performance
-- =====================
CREATE TABLE IF NOT EXISTS render_template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES render_templates(id) ON DELETE CASCADE,

  -- Usage type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'preview', 'render', 'publish', 'share', 'engagement'
  )),

  -- Context
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  job_id UUID REFERENCES render_jobs(id) ON DELETE SET NULL,

  -- Engagement data (for published content)
  engagement_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_template_analytics_template ON render_template_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_render_template_analytics_event ON render_template_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_render_template_analytics_created ON render_template_analytics(created_at);

-- =====================
-- 10. TRIGGERS
-- =====================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_render_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Invalidate resolved template when layers or canvas change
  IF OLD.layers IS DISTINCT FROM NEW.layers
     OR OLD.canvas IS DISTINCT FROM NEW.canvas
     OR OLD.variables IS DISTINCT FROM NEW.variables THEN
    NEW.resolved_template = NULL;
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS render_templates_updated ON render_templates;
CREATE TRIGGER render_templates_updated
  BEFORE UPDATE ON render_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_render_template_timestamp();

DROP TRIGGER IF EXISTS render_template_sets_updated ON render_template_sets;
CREATE TRIGGER render_template_sets_updated
  BEFORE UPDATE ON render_template_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Invalidate child templates when parent changes
CREATE OR REPLACE FUNCTION invalidate_child_templates()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE render_templates
  SET resolved_template = NULL, resolved_at = NULL, updated_at = NOW()
  WHERE extends_slug = OLD.slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS render_templates_invalidate_children ON render_templates;
CREATE TRIGGER render_templates_invalidate_children
  AFTER UPDATE ON render_templates
  FOR EACH ROW
  WHEN (OLD.layers IS DISTINCT FROM NEW.layers
    OR OLD.canvas IS DISTINCT FROM NEW.canvas
    OR OLD.variables IS DISTINCT FROM NEW.variables)
  EXECUTE FUNCTION invalidate_child_templates();

-- Update render cache hit count
CREATE OR REPLACE FUNCTION update_cache_hit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE render_cache
  SET hit_count = hit_count + 1,
      last_hit_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 11. ROW LEVEL SECURITY
-- =====================
ALTER TABLE render_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_template_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_template_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_job_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_template_analytics ENABLE ROW LEVEL SECURITY;

-- Templates: Published/public templates viewable by all authenticated users
DROP POLICY IF EXISTS "Published templates viewable by authenticated" ON render_templates;
CREATE POLICY "Published templates viewable by authenticated" ON render_templates FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (is_public = TRUE OR is_system = TRUE)
  );

-- Templates: Agents can view their own templates
DROP POLICY IF EXISTS "Agents can view own templates" ON render_templates;
CREATE POLICY "Agents can view own templates" ON render_templates FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
  );

-- Templates: Staff can manage all templates
DROP POLICY IF EXISTS "Staff can manage templates" ON render_templates;
CREATE POLICY "Staff can manage templates" ON render_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Template sets: Similar policies
DROP POLICY IF EXISTS "Published template sets viewable" ON render_template_sets;
CREATE POLICY "Published template sets viewable" ON render_template_sets FOR SELECT
  TO authenticated
  USING (status = 'published' OR is_system = TRUE);

DROP POLICY IF EXISTS "Staff can manage template sets" ON render_template_sets;
CREATE POLICY "Staff can manage template sets" ON render_template_sets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Render jobs: Agents can view their own jobs
DROP POLICY IF EXISTS "Agents can view own render jobs" ON render_jobs;
CREATE POLICY "Agents can view own render jobs" ON render_jobs FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Render jobs: Staff can manage all
DROP POLICY IF EXISTS "Staff can manage render jobs" ON render_jobs;
CREATE POLICY "Staff can manage render jobs" ON render_jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Render job slides: Same as jobs
DROP POLICY IF EXISTS "View render job slides" ON render_job_slides;
CREATE POLICY "View render job slides" ON render_job_slides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM render_jobs rj
      WHERE rj.id = render_job_slides.job_id
      AND (
        rj.agent_id IN (SELECT id FROM agents WHERE auth_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Staff can manage render job slides" ON render_job_slides;
CREATE POLICY "Staff can manage render job slides" ON render_job_slides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Fonts: Agents can manage their own
DROP POLICY IF EXISTS "Agents can manage own fonts" ON render_fonts;
CREATE POLICY "Agents can manage own fonts" ON render_fonts FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Cache: Service role access
DROP POLICY IF EXISTS "Cache accessible to authenticated" ON render_cache;
CREATE POLICY "Cache accessible to authenticated" ON render_cache FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage cache" ON render_cache;
CREATE POLICY "Staff can manage cache" ON render_cache FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Analytics: Staff only
DROP POLICY IF EXISTS "Staff can view analytics" ON render_template_analytics;
CREATE POLICY "Staff can view analytics" ON render_template_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert analytics" ON render_template_analytics;
CREATE POLICY "Staff can insert analytics" ON render_template_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Template versions: Read access for authenticated, write for staff
DROP POLICY IF EXISTS "View template versions" ON render_template_versions;
CREATE POLICY "View template versions" ON render_template_versions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage template versions" ON render_template_versions;
CREATE POLICY "Staff can manage template versions" ON render_template_versions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Template set items: Read access
DROP POLICY IF EXISTS "View template set items" ON render_template_set_items;
CREATE POLICY "View template set items" ON render_template_set_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage template set items" ON render_template_set_items;
CREATE POLICY "Staff can manage template set items" ON render_template_set_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- =====================
-- 12. STORAGE BUCKETS
-- =====================
-- Create storage bucket for render assets (fonts, backgrounds, logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'render-assets',
  'render-assets',
  false,
  52428800, -- 50MB
  ARRAY['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for rendered outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'render-output',
  'render-output',
  true, -- Public for CDN access
  10485760, -- 10MB per image
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for render-assets
DROP POLICY IF EXISTS "Authenticated users can read render assets" ON storage;
CREATE POLICY "Authenticated users can read render assets" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'render-assets');

DROP POLICY IF EXISTS "Staff can upload render assets" ON storage;
CREATE POLICY "Staff can upload render assets" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'render-assets'
    AND EXISTS (
      SELECT 1 FROM staff WHERE auth_user_id = auth.uid()
    )
  );

-- Storage policies for render-output (public read)
DROP POLICY IF EXISTS "Anyone can read render output" ON storage;
CREATE POLICY "Anyone can read render output" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'render-output');

DROP POLICY IF EXISTS "Service role can upload render output" ON storage;
CREATE POLICY "Service role can upload render output" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'render-output');

-- =====================
-- 13. HELPER FUNCTIONS
-- =====================

-- Get resolved template (with inheritance)
CREATE OR REPLACE FUNCTION get_resolved_template(p_template_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_parent JSONB;
  v_result JSONB;
BEGIN
  SELECT * INTO v_template
  FROM render_templates
  WHERE slug = p_template_slug AND status = 'published';

  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if already resolved and fresh
  IF v_template.resolved_template IS NOT NULL
     AND v_template.resolved_at > v_template.updated_at THEN
    RETURN v_template.resolved_template;
  END IF;

  -- If no parent, build result from template
  IF v_template.extends_slug IS NULL THEN
    v_result := jsonb_build_object(
      'id', v_template.id,
      'slug', v_template.slug,
      'version', v_template.version,
      'name', v_template.name,
      'category', v_template.category,
      'canvas', v_template.canvas,
      'layers', v_template.layers,
      'variables', v_template.variables,
      'animations', v_template.animations,
      'brandKitBindings', v_template.brand_kit_bindings,
      'metadata', v_template.metadata
    );
  ELSE
    -- Get parent resolved template
    v_parent := get_resolved_template(v_template.extends_slug);

    IF v_parent IS NULL THEN
      RAISE EXCEPTION 'Parent template not found: %', v_template.extends_slug;
    END IF;

    -- Merge parent with child (simplified - full merge in application code)
    v_result := v_parent || jsonb_build_object(
      'id', v_template.id,
      'slug', v_template.slug,
      'version', v_template.version,
      'name', v_template.name,
      'canvas', COALESCE(v_parent->'canvas', '{}'::jsonb) || COALESCE(v_template.canvas, '{}'::jsonb),
      'layers', v_template.layers,
      'variables', COALESCE(v_parent->'variables', '[]'::jsonb) || COALESCE(v_template.variables, '[]'::jsonb),
      'brandKitBindings', COALESCE(v_parent->'brandKitBindings', '{}'::jsonb) || COALESCE(v_template.brand_kit_bindings, '{}'::jsonb)
    );
  END IF;

  -- Cache the result
  UPDATE render_templates
  SET resolved_template = v_result, resolved_at = NOW()
  WHERE id = v_template.id;

  RETURN v_result;
END;
$$;

-- Clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_render_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM render_cache
    -- REMOVED: partial index with NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Enable realtime for render jobs
ALTER PUBLICATION supabase_realtime ADD TABLE render_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE render_job_slides;

COMMENT ON TABLE render_templates IS 'Template definitions for text-to-image rendering';
COMMENT ON TABLE render_template_sets IS 'Groups of templates for carousels and campaigns';
COMMENT ON TABLE render_jobs IS 'Async rendering job tracking';
COMMENT ON TABLE render_job_slides IS 'Individual slide tracking for carousel jobs';
COMMENT ON TABLE render_fonts IS 'Custom fonts uploaded by agents';
COMMENT ON TABLE render_cache IS 'Cache of rendered images for fast retrieval';
