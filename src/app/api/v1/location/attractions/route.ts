// Life Here API - Attractions Endpoint
// GET /api/v1/location/attractions?lat=&lng=
// Returns theme parks, airports, beaches, and museums near a location

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { getNearbyThemeParks } from '@/lib/integrations/themeparks/client'
import { getAirportProximity, getBeachProximity } from '@/lib/integrations/distance/client'
import { searchNearbyPlaces } from '@/lib/integrations/google-places/client'
import type { AttractionsData, NearbyAttraction } from '@/lib/api/types'
import { withLocationCache } from '@/lib/api/cache'
import { apiLogger, formatError } from '@/lib/logger'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPrelight(request)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = nanoid()

  // Handle CORS
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

  // Parse query parameters
  const lat = parseFloat(url.searchParams.get('lat') || '')
  const lng = parseFloat(url.searchParams.get('lng') || '')

  if (isNaN(lat) || isNaN(lng)) {
    const response = apiError(
      'INVALID_COORDINATES',
      'Valid lat and lng query parameters are required.',
      400,
      requestId
    )
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const response = apiError(
      'INVALID_COORDINATES',
      'Coordinates out of range. lat: -90 to 90, lng: -180 to 180.',
      400,
      requestId
    )
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }

  try {
    // Use cache for attractions data
    const cacheResult = await withLocationCache(lat, lng, 'attractions', async () => {
      // Fetch all attraction data in parallel
      const [themeparks, airports, beaches, museumsPlaces] = await Promise.all([
        getNearbyThemeParks(lat, lng, 75), // 75 mile radius for theme parks
        getAirportProximity(lat, lng),
        getBeachProximity(lat, lng, 100), // 100 mile radius for beaches
        searchNearbyPlaces(lat, lng, 'entertainment', 10000), // 10km for museums/attractions
      ])

      // Transform Google Places museums to our format
      const museums: NearbyAttraction[] = (museumsPlaces || [])
        .filter((place) =>
          place.type.includes('museum') ||
          place.type.includes('zoo') ||
          place.type.includes('aquarium') ||
          place.type.includes('amusement')
        )
        .slice(0, 10)
        .map((place) => ({
          id: place.id,
          name: place.name,
          type: place.type,
          rating: place.rating,
          reviewCount: place.reviewCount,
          distanceMiles: place.distance ? Math.round(place.distance * 10) / 10 : 0,
          address: place.address,
          photoUrl: place.photoUrl,
        }))

      const attractionsData: AttractionsData = {
        themeparks,
        airports,
        beaches,
        museums,
      }

      return attractionsData
    })

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
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'Attractions API error')

    const response = apiError(
      'INTERNAL_ERROR',
      'Failed to fetch attractions data. Please try again.',
      500,
      requestId
    )
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
