// Life Here API - Commute Endpoint
// GET /api/v1/location/commute?lat=&lng=
// Returns travel times to key Central Florida destinations

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import {
  getCommuteTimes,
  getCommuteSummary,
  getAirportProximity,
  getBeachProximity,
  getDistanceMatrix,
} from '@/lib/integrations/distance/client'
import { CENTRAL_FL_DESTINATIONS } from '@/lib/api/types'
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
  const destination = url.searchParams.get('destination') // specific destination key
  const category = url.searchParams.get('category') // 'airports', 'beaches', 'themeparks', 'downtown'

  try {
    // Single destination mode
    if (destination) {
      // Find the destination in our list
      let destInfo: { lat: number; lng: number; name: string } | null = null

      // Search all categories
      for (const [, destinations] of Object.entries(CENTRAL_FL_DESTINATIONS)) {
        if (destination in destinations) {
          destInfo = destinations[destination as keyof typeof destinations] as {
            lat: number
            lng: number
            name: string
          }
          break
        }
      }

      if (!destInfo) {
        const response = apiError(
          'INVALID_DESTINATION',
          `Unknown destination: ${destination}. Valid destinations include: magicKingdom, mco, cocoaBeach, downtownOrlando, etc.`,
          400,
          requestId
        )
        return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
      }

      const matrixResult = await getDistanceMatrix(lat, lng, [
        { lat: destInfo.lat, lng: destInfo.lng, name: destInfo.name }
      ])
      const travelTime = matrixResult.get(destInfo.name)

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: {
          destination: {
            key: destination,
            name: destInfo.name,
            lat: destInfo.lat,
            lng: destInfo.lng,
          },
          from: { lat, lng },
          distance: travelTime ? `${travelTime.distanceMiles} mi` : 'Unknown',
          duration: travelTime ? `${travelTime.durationMinutes} min` : 'Unknown',
          durationInTraffic: travelTime?.durationWithTraffic ? `${travelTime.durationWithTraffic} min` : undefined,
        },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Category mode
    if (category) {
      let data
      switch (category) {
        case 'airports':
          data = await getAirportProximity(lat, lng)
          break
        case 'beaches':
          data = await getBeachProximity(lat, lng, 100)
          break
        default: {
          // Calculate for all destinations in category
          const dests = CENTRAL_FL_DESTINATIONS[category as keyof typeof CENTRAL_FL_DESTINATIONS]
          if (!dests) {
            const response = apiError(
              'INVALID_CATEGORY',
              `Unknown category: ${category}. Valid categories: airports, beaches, themeparks, downtown`,
              400,
              requestId
            )
            return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
          }

          // Get all destinations for this category
          const destList = Object.entries(dests).map(([key, dest]) => {
            const d = dest as { lat: number; lng: number; name: string }
            return { key, lat: d.lat, lng: d.lng, name: d.name }
          })

          // Fetch all distances in one API call
          const matrixResult = await getDistanceMatrix(
            lat,
            lng,
            destList.map(d => ({ lat: d.lat, lng: d.lng, name: d.name }))
          )

          const results = destList.map(d => {
            const travelTime = matrixResult.get(d.name)
            return {
              key: d.key,
              name: d.name,
              distance: travelTime ? `${travelTime.distanceMiles} mi` : 'Unknown',
              duration: travelTime ? `${travelTime.durationMinutes} min` : 'Unknown',
              durationInTraffic: travelTime?.durationWithTraffic ? `${travelTime.durationWithTraffic} min` : undefined,
            }
          })

          data = results
        }
      }

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: { category, destinations: data },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Full commute data (default) - use cache
    const cacheResult = await withLocationCache(lat, lng, 'commute', async () => {
      const [destinations, summary, airports, beaches] = await Promise.all([
        getCommuteTimes(lat, lng),
        getCommuteSummary(lat, lng),
        getAirportProximity(lat, lng),
        getBeachProximity(lat, lng, 100),
      ])

      return {
        destinations,
        summary,
        airports,
        beaches,
        availableDestinations: Object.keys(CENTRAL_FL_DESTINATIONS).reduce(
          (acc, category) => {
            acc[category] = Object.keys(
              CENTRAL_FL_DESTINATIONS[category as keyof typeof CENTRAL_FL_DESTINATIONS]
            )
            return acc
          },
          {} as Record<string, string[]>
        ),
      }
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
    console.error('Commute API error:', error)
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch commute data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
