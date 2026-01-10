-- Made idempotent: 2026-01-07
-- Fix render_cache RLS to scope visibility properly
-- Migration: 20250103_002_fix_render_cache_rls.sql

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Cache accessible to authenticated" ON render_cache;

-- Create new policy scoping cache to agent's own templates
-- Agents can only see their own rendered templates
DROP POLICY IF EXISTS "Agents can view own render cache" ON render_cache;
CREATE POLICY "Agents can view own render cache" ON render_cache
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agent_carousel_templates
    WHERE agent_carousel_templates.id = render_cache.template_id
    AND agent_carousel_templates.agent_id = auth.uid()
  )
);

-- Staff (admin, photographer, videographer, qc) can see all cache
DROP POLICY IF EXISTS "Staff can view all render cache" ON render_cache;
CREATE POLICY "Staff can view all render cache" ON render_cache
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.role IN ('admin', 'photographer', 'videographer', 'qc')
  )
);

-- Agents can insert cache for their own templates
DROP POLICY IF EXISTS "Agents can insert own render cache" ON render_cache;
CREATE POLICY "Agents can insert own render cache" ON render_cache
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agent_carousel_templates
    WHERE agent_carousel_templates.id = template_id
    AND agent_carousel_templates.agent_id = auth.uid()
  )
);

-- Staff can insert cache for any template
DROP POLICY IF EXISTS "Staff can insert all render cache" ON render_cache;
CREATE POLICY "Staff can insert all render cache" ON render_cache
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.role IN ('admin', 'photographer', 'videographer', 'qc')
  )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to render cache" ON render_cache;
CREATE POLICY "Service role full access to render cache" ON render_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
