# Performance Optimization Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [x] All TypeScript files compile without errors
- [x] All optimizations tested locally
- [x] Cache utility created and imported correctly
- [x] All query functions wrapped with unstable_cache
- [x] Parallel queries implemented with Promise.all
- [x] Column selection added to queries

### 2. Files to Deploy
```
Modified Files:
✓ src/lib/queries/listings.ts
✓ src/lib/agents/registry.ts
✓ src/app/agents/[agentSlug]/page.tsx
✓ src/app/admin/agents/page.tsx

New Files:
✓ src/lib/utils/cache.ts
✓ supabase/migrations/20241221_006_performance_indexes.sql
✓ DATABASE_OPTIMIZATION.md
✓ PERFORMANCE_SUMMARY.md
✓ DEPLOYMENT_CHECKLIST.md (this file)
```

### 3. Build Verification
```bash
npm run build
# ✓ Should complete without TypeScript errors
# ✓ All pages should generate successfully
```

## Deployment Steps

### Step 1: Deploy Code to Staging
```bash
# Push code to staging branch
git add .
git commit -m "Add performance optimizations with caching and database indexes"
git push origin staging

# Verify staging deployment
# Test key pages:
# - /agents/[slug] (agent portfolio)
# - /delivery/[id] (listing detail)
# - /admin/agents (admin dashboard)
```

### Step 2: Apply Database Indexes (Staging)
```bash
# Option A: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/20241221_006_performance_indexes.sql
# 3. Run the migration

# Option B: Via Supabase CLI
cd /path/to/project
supabase db push
```

### Step 3: Test in Staging
Test these critical flows:

#### Agent Portfolio Pages
- [ ] Navigate to /agents/[slug]
- [ ] Verify page loads in <500ms (after cache warm-up)
- [ ] Check that listings display correctly
- [ ] Verify media assets load
- [ ] Test with multiple agents

#### Listing Detail Pages
- [ ] Navigate to /delivery/[listingId]
- [ ] Verify page loads in <500ms (after cache warm-up)
- [ ] Check all media categories display
- [ ] Test download functionality

#### Admin Dashboard
- [ ] Navigate to /admin/agents
- [ ] Verify dashboard loads in <1000ms (after cache warm-up)
- [ ] Check agent metrics display correctly
- [ ] Verify recent executions show

#### Cache Behavior
- [ ] First load (cache miss) - should be slower
- [ ] Second load (cache hit) - should be 60-80% faster
- [ ] Wait for cache expiration and verify refresh

### Step 4: Monitor Staging Performance
```bash
# Check Supabase Dashboard:
# - Database > Query Performance
# - Verify indexes are being used (Index Scan vs Seq Scan)
# - Monitor query execution times

# Check Application Logs:
# - Look for cache hits/misses
# - Verify no caching errors
# - Monitor database connection pool
```

### Step 5: Production Deployment
```bash
# If staging tests pass, deploy to production
git checkout main
git merge staging
git push origin main

# Or via your deployment platform
# - Vercel: Automatic deployment on push to main
# - Other: Follow your deployment process
```

### Step 6: Apply Database Indexes (Production)
```bash
# IMPORTANT: Apply indexes during low-traffic period
# Indexes can lock tables briefly during creation

# Option A: Via Supabase Dashboard (Recommended for Production)
# 1. Go to SQL Editor
# 2. Copy migration: supabase/migrations/20241221_006_performance_indexes.sql
# 3. Review all indexes carefully
# 4. Run migration during low-traffic window

# Option B: Via Supabase CLI
supabase db push --db-url "your-production-db-url"
```

### Step 7: Monitor Production (First 24 Hours)

#### Immediate (First Hour)
- [ ] Check deployment succeeded
- [ ] Verify no 500 errors in logs
- [ ] Test key pages manually
- [ ] Check error tracking (Sentry, etc.)

#### First 6 Hours
- [ ] Monitor cache hit rates
- [ ] Check database query performance
- [ ] Verify page load times improved
- [ ] Monitor database CPU/memory usage

#### First 24 Hours
- [ ] Review application logs for anomalies
- [ ] Check database slow query log
- [ ] Verify cache revalidation working correctly
- [ ] Monitor user-reported issues

### Step 8: Performance Validation

#### Database Metrics to Monitor
```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check for unused indexes (after 1 week)
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE 'pg_%';

-- Monitor slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### Application Metrics
- Average page load time: Target <500ms (cached)
- Cache hit rate: Target >80%
- Database query count: Target 70% reduction
- Error rate: Should remain stable or decrease

## Post-Deployment

### Week 1: Active Monitoring
- [ ] Daily review of performance metrics
- [ ] Check cache hit rates
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Check for any caching issues

### Week 2-4: Optimization Tuning
- [ ] Adjust cache revalidation times if needed
- [ ] Identify and remove unused indexes
- [ ] Fine-tune query patterns
- [ ] Document any issues and solutions

### Monthly: Performance Review
- [ ] Review performance trends
- [ ] Identify new optimization opportunities
- [ ] Check for database growth impacts
- [ ] Plan future optimizations

## Rollback Plan

### If Critical Issues Arise

#### Quick Rollback (Code Only)
```bash
# Revert to previous deployment
git revert HEAD
git push origin main
# Or use platform rollback feature
```

#### Remove Indexes (If Causing Issues)
```sql
-- Only if indexes are causing problems
-- Run these one at a time and test

DROP INDEX IF EXISTS idx_listings_agent_created;
DROP INDEX IF EXISTS idx_media_assets_listing_id;
-- etc.
```

#### Disable Caching (Emergency)
```typescript
// Temporarily set all revalidate to 0
// In src/lib/utils/cache.ts
export const CACHE_REVALIDATION = {
  LISTING: 0,
  AGENT: 0,
  // etc.
}
```

## Success Criteria

### Performance Targets
- ✓ Listing pages: <500ms (after cache warm-up)
- ✓ Agent portfolio: <500ms (after cache warm-up)
- ✓ Admin dashboard: <1000ms (after cache warm-up)
- ✓ Cache hit rate: >80%
- ✓ Database queries: 70% reduction
- ✓ No increase in error rates

### User Experience
- ✓ Pages load noticeably faster
- ✓ No caching-related bugs
- ✓ All functionality works as before
- ✓ No increase in user-reported issues

## Troubleshooting

### Issue: Cache Not Invalidating
**Solution**: Check cache tags and revalidation times
```typescript
// Force revalidation
import { revalidateTag } from 'next/cache'
revalidateTag('listings')
```

### Issue: Stale Data Showing
**Solution**: Reduce cache revalidation time
```typescript
// In cache.ts, reduce time temporarily
LISTING: 30, // Was 60
```

### Issue: Database Queries Still Slow
**Solution**: Verify indexes are being used
```sql
EXPLAIN ANALYZE
SELECT * FROM listings WHERE agent_id = 'uuid'
ORDER BY created_at DESC;
-- Look for "Index Scan using idx_listings_agent_created"
```

### Issue: High Database CPU
**Solution**: Check for missing indexes or slow queries
```sql
-- Find slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

## Contact & Support

For issues or questions:
1. Check DATABASE_OPTIMIZATION.md
2. Review PERFORMANCE_SUMMARY.md
3. Check application logs
4. Review Supabase dashboard metrics

## Sign-Off

- [ ] Code changes reviewed and approved
- [ ] Build passes all tests
- [ ] Staging deployment successful
- [ ] Staging tests passed
- [ ] Production deployment successful
- [ ] Database indexes applied
- [ ] Performance metrics improved
- [ ] No critical issues detected

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________

---

**Status**: Ready for Deployment
**Last Updated**: December 21, 2024
