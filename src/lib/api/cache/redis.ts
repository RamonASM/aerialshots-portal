import { Redis } from '@upstash/redis'

// Cache configuration
export const CACHE_CONFIG = {
  // Default TTL in seconds for different data types
  ttl: {
    attractions: 5 * 60, // 5 minutes - wait times change frequently
    dining: 30 * 60, // 30 minutes - restaurant data is fairly stable
    events: 60 * 60, // 1 hour - events don't change often
    movies: 60 * 60, // 1 hour - movie listings are stable
    news: 15 * 60, // 15 minutes - news updates more frequently
    commute: 10 * 60, // 10 minutes - traffic changes
    scores: 24 * 60 * 60, // 24 hours - walk scores rarely change
    lifestyle: 60 * 60, // 1 hour - gyms, parks, etc.
    overview: 15 * 60, // 15 minutes - aggregated data
    community: 60 * 60, // 1 hour - community profiles
  },
  // Key prefixes for organization
  prefix: {
    api: 'api:v1:',
    location: 'loc:',
  },
} as const

export type CacheCategory = keyof typeof CACHE_CONFIG.ttl

export interface CacheOptions {
  ttl?: number // Override default TTL in seconds
  category?: CacheCategory // Use predefined TTL for category
}

export interface CacheResult<T> {
  data: T
  cached: boolean
  cachedAt?: string
  expiresAt?: string
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
}

// Singleton Redis client
let redisClient: Redis | null = null

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('[Cache] Upstash Redis not configured - caching disabled')
    return null
  }

  redisClient = new Redis({
    url,
    token,
  })

  return redisClient
}

/**
 * Generate a cache key from components
 */
export function generateCacheKey(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `${CACHE_CONFIG.prefix.api}${endpoint}:${sortedParams}`
}

/**
 * Generate a location-based cache key
 */
export function generateLocationKey(
  lat: number,
  lng: number,
  category: CacheCategory,
  precision: number = 3
): string {
  // Round coordinates to reduce cache fragmentation
  const roundedLat = lat.toFixed(precision)
  const roundedLng = lng.toFixed(precision)

  return `${CACHE_CONFIG.prefix.location}${category}:${roundedLat},${roundedLng}`
}

/**
 * Get cached data
 */
export async function getCached<T>(key: string): Promise<CacheResult<T> | null> {
  const redis = getRedisClient()
  if (!redis) {
    return null
  }

  try {
    const cached = await redis.get<{ data: T; cachedAt: string; expiresAt: string }>(key)
    if (!cached) {
      return null
    }

    return {
      data: cached.data,
      cached: true,
      cachedAt: cached.cachedAt,
      expiresAt: cached.expiresAt,
    }
  } catch (error) {
    console.error('[Cache] Get error:', error)
    return null
  }
}

/**
 * Set cached data
 */
export async function setCached<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  try {
    const ttl = options.ttl ?? (options.category ? CACHE_CONFIG.ttl[options.category] : 300)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl * 1000)

    const cacheValue = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }

    await redis.set(key, cacheValue, { ex: ttl })
    return true
  } catch (error) {
    console.error('[Cache] Set error:', error)
    return false
  }
}

/**
 * Delete cached data
 */
export async function deleteCached(key: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) {
    return false
  }

  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error('[Cache] Delete error:', error)
    return false
  }
}

/**
 * Delete all cached data matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const redis = getRedisClient()
  if (!redis) {
    return 0
  }

  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    return keys.length
  } catch (error) {
    console.error('[Cache] Invalidate pattern error:', error)
    return 0
  }
}

/**
 * Invalidate all cache for a location
 */
export async function invalidateLocation(lat: number, lng: number): Promise<number> {
  const pattern = `${CACHE_CONFIG.prefix.location}*:${lat.toFixed(3)},${lng.toFixed(3)}`
  return invalidatePattern(pattern)
}

/**
 * Invalidate all cache for a category
 */
export async function invalidateCategory(category: CacheCategory): Promise<number> {
  const pattern = `${CACHE_CONFIG.prefix.location}${category}:*`
  return invalidatePattern(pattern)
}

/**
 * Cache-through helper: get from cache or execute function and cache result
 */
export async function cacheThrough<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<CacheResult<T>> {
  // Try to get from cache first
  const cached = await getCached<T>(key)
  if (cached) {
    return cached
  }

  // Fetch fresh data
  const data = await fetchFn()

  // Cache the result
  await setCached(key, data, options)

  return {
    data,
    cached: false,
  }
}

/**
 * Location-based cache-through helper
 */
export async function cacheLocationData<T>(
  lat: number,
  lng: number,
  category: CacheCategory,
  fetchFn: () => Promise<T>
): Promise<CacheResult<T>> {
  const key = generateLocationKey(lat, lng, category)
  return cacheThrough(key, fetchFn, { category })
}

/**
 * Check if Redis is connected and healthy
 */
export async function checkCacheHealth(): Promise<{
  connected: boolean
  latencyMs?: number
  error?: string
}> {
  const redis = getRedisClient()
  if (!redis) {
    return { connected: false, error: 'Redis not configured' }
  }

  try {
    const start = Date.now()
    await redis.ping()
    const latencyMs = Date.now() - start

    return { connected: true, latencyMs }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get cache statistics (requires Redis to track hits/misses)
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  const redis = getRedisClient()
  if (!redis) {
    return null
  }

  try {
    const [hits, misses] = await Promise.all([
      redis.get<number>('cache:stats:hits') ?? 0,
      redis.get<number>('cache:stats:misses') ?? 0,
    ])

    const hitsNum = hits ?? 0
    const missesNum = misses ?? 0
    const total = hitsNum + missesNum

    return {
      hits: hitsNum,
      misses: missesNum,
      hitRate: total > 0 ? hitsNum / total : 0,
    }
  } catch (error) {
    console.error('[Cache] Stats error:', error)
    return null
  }
}

/**
 * Increment cache hit counter
 */
export async function recordCacheHit(): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.incr('cache:stats:hits')
  } catch (error) {
    // Silently fail for stats
  }
}

/**
 * Increment cache miss counter
 */
export async function recordCacheMiss(): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.incr('cache:stats:misses')
  } catch (error) {
    // Silently fail for stats
  }
}

/**
 * Reset Redis client (for testing)
 */
export function resetRedisClient(): void {
  redisClient = null
}
