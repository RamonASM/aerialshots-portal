/**
 * Caching utilities for Next.js application
 * Provides standardized cache key generation and helper functions
 * for using unstable_cache across the application
 */

import { unstable_cache } from 'next/cache'

// Cache revalidation times (in seconds)
export const CACHE_REVALIDATION = {
  LISTING: 60, // 1 minute - listings change frequently
  AGENT: 300, // 5 minutes - agent data is relatively static
  AGENT_METRICS: 60, // 1 minute - metrics need to be fresh
  MEDIA_ASSETS: 120, // 2 minutes - media assets don't change often
  CURATED_ITEMS: 180, // 3 minutes - curated items are semi-static
  AI_AGENT: 300, // 5 minutes - AI agent config is relatively static
  AI_AGENT_EXECUTIONS: 30, // 30 seconds - execution data should be fresh
} as const

// Cache tags for targeted revalidation
export const CACHE_TAGS = {
  LISTINGS: 'listings',
  AGENTS: 'agents',
  MEDIA_ASSETS: 'media_assets',
  CURATED_ITEMS: 'curated_items',
  AI_AGENTS: 'ai_agents',
  AI_AGENT_EXECUTIONS: 'ai_agent_executions',
} as const

/**
 * Generate a cache key for a listing
 */
export function getListingCacheKey(id: string): string {
  return `listing:${id}`
}

/**
 * Generate a cache key for a listing by Aryeo ID
 */
export function getListingByAryeoCacheKey(aryeoId: string): string {
  return `listing:aryeo:${aryeoId}`
}

/**
 * Generate a cache key for agent listings
 */
export function getAgentListingsCacheKey(agentId: string): string {
  return `agent:${agentId}:listings`
}

/**
 * Generate a cache key for an agent
 */
export function getAgentCacheKey(identifier: string): string {
  return `agent:${identifier}`
}

/**
 * Generate a cache key for all agents
 */
export function getAllAgentsCacheKey(category?: string, activeOnly?: boolean): string {
  const parts = ['agents', 'all']
  if (category) parts.push(`cat:${category}`)
  if (activeOnly) parts.push('active')
  return parts.join(':')
}

/**
 * Generate a cache key for agent metrics
 */
export function getAgentMetricsCacheKey(slug?: string): string {
  return slug ? `agent:${slug}:metrics` : 'agents:metrics:all'
}

/**
 * Generate a cache key for recent agent executions
 */
export function getRecentExecutionsCacheKey(agentSlug: string, limit: number): string {
  return `agent:${agentSlug}:executions:${limit}`
}

/**
 * Generate a cache key for agents grouped by category
 */
export function getAgentsByCategoryCacheKey(): string {
  return 'agents:by-category'
}

/**
 * Generate a cache key for curated items near a location
 */
export function getCuratedItemsCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 3 decimal places to group nearby queries
  const roundedLat = Math.round(lat * 1000) / 1000
  const roundedLng = Math.round(lng * 1000) / 1000
  return `curated:${roundedLat}:${roundedLng}:${radius}`
}

/**
 * Generate a cache key for AI agent dashboard data
 */
export function getAIAgentDashboardCacheKey(): string {
  return 'ai-agents:dashboard'
}

/**
 * Create a cached function with standard options
 *
 * @example
 * const getCachedListing = createCachedFunction(
 *   async (id: string) => fetchListing(id),
 *   {
 *     keyPrefix: 'listing',
 *     revalidate: CACHE_REVALIDATION.LISTING,
 *     tags: [CACHE_TAGS.LISTINGS]
 *   }
 * )
 */
export function createCachedFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    keyPrefix: string
    revalidate: number
    tags: string[]
  }
) {
  return unstable_cache(
    fn,
    [options.keyPrefix],
    {
      revalidate: options.revalidate,
      tags: options.tags,
    }
  )
}

/**
 * Helper to invalidate cache by tag
 * Note: This requires using revalidateTag from next/cache in server actions
 */
export function getCacheInvalidationTags(type: keyof typeof CACHE_TAGS): string[] {
  return [CACHE_TAGS[type]]
}
