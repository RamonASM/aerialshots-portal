-- Performance Optimization Indexes
-- Created: 2024-12-21
-- Purpose: Add indexes to improve query performance across the application

-- ============================================================================
-- LISTINGS TABLE INDEXES
-- ============================================================================

-- Index for agent portfolio queries
-- Improves: SELECT * FROM listings WHERE agent_id = ?
CREATE INDEX IF NOT EXISTS idx_listings_agent_id
ON listings(agent_id);

-- Composite index for agent listings with ordering
-- Improves: SELECT * FROM listings WHERE agent_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_agent_created
ON listings(agent_id, created_at DESC);

-- Index for Aryeo listing ID lookups
-- Improves: SELECT * FROM listings WHERE aryeo_listing_id = ?
CREATE INDEX IF NOT EXISTS idx_listings_aryeo_id
ON listings(aryeo_listing_id);

-- Index for status filtering (active/sold listings)
-- Improves: SELECT * FROM listings WHERE status = ?
CREATE INDEX IF NOT EXISTS idx_listings_status
ON listings(status);

-- Composite index for agent + status queries
-- Improves: SELECT * FROM listings WHERE agent_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_listings_agent_status
ON listings(agent_id, status);

-- ============================================================================
-- MEDIA_ASSETS TABLE INDEXES
-- ============================================================================

-- Index for listing media lookups
-- Improves: SELECT * FROM media_assets WHERE listing_id IN (...)
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_id
ON media_assets(listing_id);

-- Composite index for type filtering and sorting
-- Improves: SELECT * FROM media_assets WHERE listing_id = ? AND type = 'photo' ORDER BY sort_order
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_type_sort
ON media_assets(listing_id, type, sort_order);

-- Index for category filtering
-- Improves: SELECT * FROM media_assets WHERE listing_id = ? AND category = ?
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_category
ON media_assets(listing_id, category);

-- ============================================================================
-- AGENTS TABLE INDEXES
-- ============================================================================

-- Index for slug lookups (agent portfolio pages)
-- Improves: SELECT * FROM agents WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_agents_slug
ON agents(slug);

-- Index for email lookups (authentication)
-- Improves: SELECT * FROM agents WHERE email = ?
CREATE INDEX IF NOT EXISTS idx_agents_email
ON agents(email);

-- ============================================================================
-- AI_AGENTS TABLE INDEXES
-- ============================================================================

-- Index for slug lookups
-- Improves: SELECT * FROM ai_agents WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug
ON ai_agents(slug);

-- Index for category filtering
-- Improves: SELECT * FROM ai_agents WHERE category = ?
CREATE INDEX IF NOT EXISTS idx_ai_agents_category
ON ai_agents(category);

-- Partial index for active agents (most common query)
-- Improves: SELECT * FROM ai_agents WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_ai_agents_active
ON ai_agents(is_active)
WHERE is_active = true;

-- Composite index for category + ordering
-- Improves: SELECT * FROM ai_agents ORDER BY category, name
CREATE INDEX IF NOT EXISTS idx_ai_agents_category_name
ON ai_agents(category, name);

-- ============================================================================
-- AI_AGENT_EXECUTIONS TABLE INDEXES
-- ============================================================================

-- Composite index for agent execution history
-- Improves: SELECT * FROM ai_agent_executions WHERE agent_slug = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_slug_created
ON ai_agent_executions(agent_slug, created_at DESC);

-- Index for recent executions dashboard query
-- Improves: SELECT * FROM ai_agent_executions WHERE created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_created
ON ai_agent_executions(created_at DESC);

-- Composite index for status filtering
-- Improves: SELECT * FROM ai_agent_executions WHERE agent_slug = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_slug_status
ON ai_agent_executions(agent_slug, status);

-- Index for metrics calculation (last 24 hours)
-- Improves: SELECT agent_slug, status, duration_ms, tokens_used FROM ai_agent_executions WHERE created_at >= ?
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_metrics
ON ai_agent_executions(created_at, agent_slug, status)
INCLUDE (duration_ms, tokens_used);

-- ============================================================================
-- INSTAGRAM_SCHEDULED_POSTS TABLE INDEXES
-- ============================================================================

-- Composite index for agent's published posts
-- Improves: SELECT * FROM instagram_scheduled_posts WHERE agent_id = ? AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_instagram_posts_agent_status
ON instagram_scheduled_posts(agent_id, status);

-- Partial index for published posts with ordering
-- Improves: SELECT * FROM instagram_scheduled_posts WHERE status = 'published' ORDER BY published_at DESC
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published
ON instagram_scheduled_posts(status, published_at DESC)
WHERE status = 'published';

-- Index for listing-based queries
-- Improves: SELECT * FROM instagram_scheduled_posts WHERE listing_id = ?
CREATE INDEX IF NOT EXISTS idx_instagram_posts_listing
ON instagram_scheduled_posts(listing_id);

-- ============================================================================
-- CURATED_ITEMS TABLE INDEXES
-- ============================================================================

-- Composite index for location-based queries
-- Improves: SELECT * FROM curated_items WHERE lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?
CREATE INDEX IF NOT EXISTS idx_curated_items_location
ON curated_items(lat, lng);

-- Index for expiration filtering
-- Improves: SELECT * FROM curated_items WHERE expires_at IS NULL OR expires_at >= NOW()
CREATE INDEX IF NOT EXISTS idx_curated_items_expires
ON curated_items(expires_at);

-- Composite index for location + active items
-- Improves location queries filtered by expiration
CREATE INDEX IF NOT EXISTS idx_curated_items_location_active
ON curated_items(lat, lng, expires_at)
WHERE expires_at IS NULL OR expires_at >= NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- You can verify index usage with EXPLAIN ANALYZE:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM listings
-- WHERE agent_id = 'some-uuid'
-- ORDER BY created_at DESC;
--
-- Look for "Index Scan using idx_listings_agent_created" in the output
-- instead of "Seq Scan" which indicates a full table scan.

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. All indexes use IF NOT EXISTS to allow safe re-running
-- 2. Composite indexes are ordered with the most selective column first
-- 3. Partial indexes (WHERE clauses) are used for common filtering patterns
-- 4. INCLUDE clause (PostgreSQL 11+) adds columns to index without sorting
-- 5. Monitor index usage with: SELECT * FROM pg_stat_user_indexes;
-- 6. Check for unused indexes periodically and remove if not needed
