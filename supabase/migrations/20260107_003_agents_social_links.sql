-- Add social_links JSONB column to agents table
-- Version: 1.0.0
-- Date: 2026-01-07
-- Purpose: Enable agents to store social media links for their portal footers

-- =====================================================
-- 1. ADD SOCIAL_LINKS COLUMN
-- =====================================================

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- =====================================================
-- 2. ADD INDEX FOR JSONB QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_agents_social_links ON agents USING GIN(social_links);

-- =====================================================
-- 3. COMMENT
-- =====================================================

COMMENT ON COLUMN agents.social_links IS 'Social media links: {instagram?, facebook?, linkedin?, twitter?, youtube?, tiktok?, website?}';
