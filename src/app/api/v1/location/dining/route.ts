// Life Here API - Dining Endpoint
// GET /api/v1/location/dining?lat=&lng=
// Returns restaurant and dining data for a location

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { getDiningData, searchDining } from '@/lib/integrations/yelp/client'
import { withLocationCache, createApiCacheKey, withCache } from '@/lib/api/cache'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPrelight(request)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = nanoid()
  const url = new URL(request.url)

  // Validate API key
  const validation = await validateApiKey(request)
  if (!validation.valid) {
    const response = NextResponse.json(validation.error, { status: 401 })
    return addCorsHeaders(response, request)
  }

  // Check rate limits
  const rateLimitResult = checkRateLimit(validation.keyData)
  if (!rateLimitResult.allowed && rateLimitResult.error) {
    const response = NextResponse.json(rateLimitResult.error, { status: 429 })
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }

  // Parse coordinates
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lng = parseFloat(url.searchParams.get('lng') || '')

  if (isNaN(lat) || isNaN(lng)) {
    const response = apiError('INVALID_COORDINATES', 'Valid lat and lng are required.', 400, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const response = apiError('INVALID_COORDINATES', 'Coordinates out of range.', 400, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }

  // Optional parameters
  const search = url.searchParams.get('search')
  const category = url.searchParams.get('category')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  try {
    let cacheResult

    if (search) {
      // Search mode - cache by search query
      const cacheKey = createApiCacheKey('dining/search', { lat, lng, search, limit })
      cacheResult = await withCache(cacheKey, 'dining', async () => {
        const restaurants = await searchDining(lat, lng, search, { limit: Math.min(limit, 50) })
        return { search: { query: search, results: restaurants } }
      })
    } else if (category) {
      // Category mode - use search with category as keyword
      const cacheKey = createApiCacheKey('dining/category', { lat, lng, category, limit })
      cacheResult = await withCache(cacheKey, 'dining', async () => {
        const restaurants = await searchDining(lat, lng, category, { limit: Math.min(limit, 50) })
        return { category: { name: category, results: restaurants } }
      })
    } else {
      // Full dining data - cache by location
      cacheResult = await withLocationCache(lat, lng, 'dining', async () => {
        return await getDiningData(lat, lng)
      })
    }

    const response = NextResponse.json({
      success: true,
      data: cacheResult.data,
      meta: {
        requestId,
        cached: cacheResult.meta.cached,
        cachedAt: cacheResult.meta.cachedAt,
        responseTime: cacheResult.meta.responseTime,
      },
    })

    // Add cache headers
    response.headers.set('X-Cache', cacheResult.meta.cached ? 'HIT' : 'MISS')
    response.headers.set('X-Response-Time', `${cacheResult.meta.responseTime}ms`)
    if (cacheResult.meta.cachedAt) {
      response.headers.set('X-Cache-Time', cacheResult.meta.cachedAt)
    }

    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  } catch (error) {
    console.error('Dining API error:', error)
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch dining data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
