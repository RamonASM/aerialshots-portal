import { NextResponse } from 'next/server'
import {
  cacheLocationData,
  generateCacheKey,
  getCached,
  setCached,
  checkCacheHealth,
  recordCacheHit,
  recordCacheMiss,
  type CacheCategory,
  type CacheResult,
} from './redis'

/**
 * API response with cache metadata
 */
export interface CachedApiResponse<T> {
  data: T
  meta: {
    cached: boolean
    cachedAt?: string
    expiresAt?: string
    responseTime: number
  }
}

/**
 * Options for cached API response
 */
export interface CachedResponseOptions {
  category: CacheCategory
  requestId?: string
}

/**
 * Wrap an API handler with caching for location-based queries
 */
export async function withLocationCache<T>(
  lat: number,
  lng: number,
  category: CacheCategory,
  fetchFn: () => Promise<T>
): Promise<CachedApiResponse<T>> {
  const startTime = Date.now()

  const result = await cacheLocationData<T>(lat, lng, category, fetchFn)

  const responseTime = Date.now() - startTime

  // Track cache hit/miss
  if (result.cached) {
    await recordCacheHit()
  } else {
    await recordCacheMiss()
  }

  return {
    data: result.data,
    meta: {
      cached: result.cached,
      cachedAt: result.cachedAt,
      expiresAt: result.expiresAt,
      responseTime,
    },
  }
}

/**
 * Wrap an API handler with caching for generic queries
 */
export async function withCache<T>(
  cacheKey: string,
  category: CacheCategory,
  fetchFn: () => Promise<T>
): Promise<CachedApiResponse<T>> {
  const startTime = Date.now()

  // Check cache first
  const cached = await getCached<T>(cacheKey)

  if (cached) {
    await recordCacheHit()
    return {
      data: cached.data,
      meta: {
        cached: true,
        cachedAt: cached.cachedAt,
        expiresAt: cached.expiresAt,
        responseTime: Date.now() - startTime,
      },
    }
  }

  // Fetch fresh data
  await recordCacheMiss()
  const data = await fetchFn()

  // Cache the result
  await setCached(cacheKey, data, { category })

  return {
    data,
    meta: {
      cached: false,
      responseTime: Date.now() - startTime,
    },
  }
}

/**
 * Create cache key for API request
 */
export function createApiCacheKey(
  endpoint: string,
  params: {
    lat?: number
    lng?: number
    radius?: number
    limit?: number
    category?: string
    query?: string
    [key: string]: string | number | boolean | undefined
  }
): string {
  return generateCacheKey(endpoint, params)
}

/**
 * Add cache headers to NextResponse
 */
export function addCacheHeaders(
  response: NextResponse,
  cacheResult: CachedApiResponse<unknown>
): NextResponse {
  // Add cache status header
  response.headers.set('X-Cache', cacheResult.meta.cached ? 'HIT' : 'MISS')

  // Add timing header
  response.headers.set('X-Response-Time', `${cacheResult.meta.responseTime}ms`)

  // Add cache timestamp if cached
  if (cacheResult.meta.cachedAt) {
    response.headers.set('X-Cache-Time', cacheResult.meta.cachedAt)
  }

  // Add cache expiration if available
  if (cacheResult.meta.expiresAt) {
    response.headers.set('X-Cache-Expires', cacheResult.meta.expiresAt)
  }

  return response
}

/**
 * Create a cached JSON response for API endpoints
 */
export function cachedJsonResponse<T>(
  data: T,
  cacheResult: CachedApiResponse<T>,
  options: CachedResponseOptions & { requestId?: string } = { category: 'overview' }
): NextResponse {
  const response = NextResponse.json({
    success: true,
    data,
    meta: {
      requestId: options.requestId || crypto.randomUUID(),
      cached: cacheResult.meta.cached,
      cachedAt: cacheResult.meta.cachedAt,
      responseTime: cacheResult.meta.responseTime,
    },
  })

  return addCacheHeaders(response, cacheResult)
}

/**
 * Health check for cache system
 */
export async function getCacheHealthStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  cache: {
    connected: boolean
    latencyMs?: number
    error?: string
  }
}> {
  const health = await checkCacheHealth()

  let status: 'healthy' | 'degraded' | 'unhealthy'

  if (!health.connected) {
    status = 'degraded' // API still works without cache
  } else if (health.latencyMs && health.latencyMs > 100) {
    status = 'degraded' // High latency
  } else {
    status = 'healthy'
  }

  return {
    status,
    cache: health,
  }
}

/**
 * Decorator for caching entire API route handlers
 * Usage:
 *   export const GET = cachedRoute('dining', async (request) => { ... })
 */
export function cachedRoute<T>(
  category: CacheCategory,
  handler: (
    request: Request,
    params?: { lat: number; lng: number; [key: string]: unknown }
  ) => Promise<T>,
  keyGenerator?: (request: Request) => string
) {
  return async (request: Request): Promise<NextResponse> => {
    const startTime = Date.now()
    const url = new URL(request.url)

    // Extract location params
    const lat = parseFloat(url.searchParams.get('lat') || '0')
    const lng = parseFloat(url.searchParams.get('lng') || '0')

    // Generate cache key
    const cacheKey =
      keyGenerator?.(request) ||
      createApiCacheKey(url.pathname, {
        lat,
        lng,
        ...Object.fromEntries(url.searchParams.entries()),
      })

    // Check cache
    const cached = await getCached<T>(cacheKey)

    if (cached) {
      await recordCacheHit()

      const response = NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          requestId: crypto.randomUUID(),
          cached: true,
          cachedAt: cached.cachedAt,
          responseTime: Date.now() - startTime,
        },
      })

      response.headers.set('X-Cache', 'HIT')
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      if (cached.cachedAt) response.headers.set('X-Cache-Time', cached.cachedAt)

      return response
    }

    // Execute handler
    await recordCacheMiss()
    const data = await handler(request, { lat, lng })

    // Cache result
    await setCached(cacheKey, data, { category })

    const response = NextResponse.json({
      success: true,
      data,
      meta: {
        requestId: crypto.randomUUID(),
        cached: false,
        responseTime: Date.now() - startTime,
      },
    })

    response.headers.set('X-Cache', 'MISS')
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

    return response
  }
}
