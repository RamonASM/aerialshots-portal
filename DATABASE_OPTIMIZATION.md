# Database Optimization Guide

This document contains performance optimization recommendations for the Aerial Shots Media Portal database.

## Overview

Performance optimizations implemented:
1. Query result caching with `unstable_cache`
2. Batch queries to eliminate N+1 problems
3. Column selection to fetch only needed data
4. Parallel query execution with `Promise.all`
5. Database index recommendations

## Recommended Database Indexes

### Critical Indexes (High Priority)

```sql
-- listings table: Agent portfolio queries
-- Improves query: SELECT * FROM listings WHERE agent_id = ?
CREATE INDEX IF NOT EXISTS idx_listings_agent_id
ON listings(agent_id);

-- listings table: Composite index for agent listings with ordering
-- Improves: SELECT * FROM listings WHERE agent_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_agent_created
ON listings(agent_id, created_at DESC);

-- media_assets table: Listing media lookups
-- Improves: SELECT * FROM media_assets WHERE listing_id IN (...)
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_id
ON media_assets(listing_id);

-- media_assets table: Cover image lookups (type filter)
-- Improves: SELECT * FROM media_assets WHERE listing_id = ? AND type = 'photo'
CREATE INDEX IF NOT EXISTS idx_media_assets_listing_type
ON media_assets(listing_id, type);

-- agents table: Slug lookups for portfolio pages
-- Improves: SELECT * FROM agents WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_agents_slug
ON agents(slug);
```

### AI Agent System Indexes (High Priority)

```sql
-- ai_agents table: Slug lookups
-- Improves: SELECT * FROM ai_agents WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug
ON ai_agents(slug);

-- ai_agents table: Category filtering
-- Improves: SELECT * FROM ai_agents WHERE category = ?
CREATE INDEX IF NOT EXISTS idx_ai_agents_category
ON ai_agents(category);

-- ai_agents table: Active agents query
-- Improves: SELECT * FROM ai_agents WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_ai_agents_active
ON ai_agents(is_active) WHERE is_active = true;

-- ai_agent_executions table: Agent execution history
-- Improves: SELECT * FROM ai_agent_executions WHERE agent_slug = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_slug_created
ON ai_agent_executions(agent_slug, created_at DESC);

-- ai_agent_executions table: Recent executions for dashboard
-- Improves: SELECT * FROM ai_agent_executions WHERE created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_created
ON ai_agent_executions(created_at DESC);

-- ai_agent_executions table: Status filtering for metrics
-- Improves: SELECT * FROM ai_agent_executions WHERE agent_slug = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_ai_agent_executions_slug_status
ON ai_agent_executions(agent_slug, status);
```

### Instagram Integration Indexes (Medium Priority)

```sql
-- instagram_scheduled_posts table: Agent's published posts
-- Improves: SELECT * FROM instagram_scheduled_posts WHERE agent_id = ? AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_instagram_posts_agent_status
ON instagram_scheduled_posts(agent_id, status);

-- instagram_scheduled_posts table: Published posts ordering
-- Improves: ... WHERE status = 'published' ORDER BY published_at DESC
CREATE INDEX IF NOT EXISTS idx_instagram_posts_published
ON instagram_scheduled_posts(status, published_at DESC)
WHERE status = 'published';
```

### Curated Items Indexes (Medium Priority)

```sql
-- curated_items table: Location-based queries
-- Improves: SELECT * FROM curated_items WHERE lat >= ? AND lat <= ? AND lng >= ? AND lng <= ?
CREATE INDEX IF NOT EXISTS idx_curated_items_location
ON curated_items(lat, lng);

-- curated_items table: Active items (not expired)
-- Improves: ... WHERE expires_at IS NULL OR expires_at >= NOW()
CREATE INDEX IF NOT EXISTS idx_curated_items_expires
ON curated_items(expires_at);
```

## Query Optimization Patterns

### 1. Column Selection
Always select only the columns you need instead of using `SELECT *`:

```typescript
// Bad - fetches all columns
const { data } = await supabase.from('listings').select('*')

// Good - fetches only needed columns
const { data } = await supabase.from('listings')
  .select('id, address, price, status')
```

### 2. Batch Queries
Eliminate N+1 queries by using `.in()` for batch lookups:

```typescript
// Bad - N+1 queries
for (const listing of listings) {
  const { data: media } = await supabase
    .from('media_assets')
    .select('*')
    .eq('listing_id', listing.id)
}

// Good - Single batch query
const listingIds = listings.map(l => l.id)
const { data: allMedia } = await supabase
  .from('media_assets')
  .select('*')
  .in('listing_id', listingIds)
```

### 3. Parallel Queries
Use `Promise.all` for independent queries:

```typescript
// Bad - Sequential queries (slow)
const agents = await fetchAgents()
const executions = await fetchExecutions()

// Good - Parallel queries (fast)
const [agents, executions] = await Promise.all([
  fetchAgents(),
  fetchExecutions()
])
```

### 4. Use maybeSingle() Instead of single()
When a record might not exist, use `maybeSingle()` to avoid error handling:

```typescript
// Bad - throws error if not found
const { data, error } = await supabase
  .from('agents')
  .select('*')
  .eq('slug', slug)
  .single()

if (error) { /* handle error */ }

// Good - returns null if not found
const { data } = await supabase
  .from('agents')
  .select('*')
  .eq('slug', slug)
  .maybeSingle()

if (!data) { /* handle not found */ }
```

## Cache Strategy

### Cache Revalidation Times

- **Listings**: 60 seconds (frequently updated)
- **Agents**: 300 seconds (5 minutes, relatively static)
- **Agent Metrics**: 60 seconds (needs to be fresh)
- **Media Assets**: 120 seconds (2 minutes, semi-static)
- **AI Agents**: 300 seconds (5 minutes, configuration changes are rare)
- **AI Agent Executions**: 30 seconds (execution data should be fresh)

### Cache Tags

Use cache tags for targeted invalidation:

```typescript
import { revalidateTag } from 'next/cache'

// After updating a listing
revalidateTag('listings')

// After updating an agent
revalidateTag('agents')

// After an AI agent execution
revalidateTag('ai_agent_executions')
```

## Performance Monitoring

### Key Metrics to Track

1. **Database Query Time**: Monitor slow queries (>100ms)
2. **Cache Hit Rate**: Aim for >80% cache hit rate on frequently accessed data
3. **Page Load Time**:
   - Listing detail pages: <500ms
   - Agent portfolio pages: <500ms
   - Admin dashboard: <1000ms
4. **Database Connection Pool**: Monitor active connections

### Using Supabase Dashboard

1. Navigate to Database → Query Performance
2. Look for queries with high execution count and duration
3. Verify indexes are being used with `EXPLAIN ANALYZE`

### Example Query Analysis

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM listings
WHERE agent_id = 'some-uuid'
ORDER BY created_at DESC;

-- Look for "Index Scan" instead of "Seq Scan"
```

## Implementation Checklist

- [x] Create cache utility with standardized keys and revalidation times
- [x] Add `unstable_cache` to listing queries
- [x] Optimize agent registry with batched queries and caching
- [x] Fix N+1 query issues in agent portfolio pages
- [x] Add column selection to all queries
- [x] Implement parallel query execution where applicable
- [ ] Add recommended database indexes (run SQL migrations)
- [ ] Set up performance monitoring
- [ ] Configure cache invalidation triggers
- [ ] Test cache hit rates in production

## Expected Performance Improvements

Based on the optimizations implemented:

1. **Agent Portfolio Pages**:
   - Before: 4-5 queries (N+1 problem), no caching
   - After: 3 queries (batched), cached for 5 minutes
   - Expected improvement: 60-80% faster on cache hit

2. **Listing Detail Pages**:
   - Before: 3 separate queries, no caching
   - After: 1 query with joins, cached for 60 seconds
   - Expected improvement: 50-70% faster

3. **Admin Dashboard**:
   - Before: Multiple sequential queries, no caching
   - After: Parallel batched queries, cached for 60 seconds
   - Expected improvement: 40-60% faster

4. **Database Load**:
   - Expected reduction: 70-80% fewer database queries due to caching
   - Lower connection pool usage
   - Reduced database CPU utilization

## Next Steps

1. **Deploy and Monitor**: Deploy changes and monitor performance metrics
2. **Add Indexes**: Run the SQL index creation statements on production database
3. **Cache Invalidation**: Set up revalidation triggers when data changes
4. **Load Testing**: Test with production-level traffic to verify improvements
5. **Tune Cache Times**: Adjust revalidation times based on actual usage patterns
