// Life Here API - Scores Endpoint
// GET /api/v1/location/scores?lat=&lng=
// Returns Walk Score, Transit Score, and Bike Score

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { getWalkScore } from '@/lib/integrations/walkscore/client'
import { withLocationCache } from '@/lib/api/cache'

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

  // Optional address for more accurate results
  const address = url.searchParams.get('address') || 'Property Location'

  try {
    // Scores are very stable, cache for 24 hours
    const cacheResult = await withLocationCache(lat, lng, 'scores', async () => {
      const walkScoreData = await getWalkScore(lat, lng, address)

      if (!walkScoreData) {
        return null
      }

      // Build detailed response
      const scores = {
        walkScore: {
          score: walkScoreData.walkScore,
          description: walkScoreData.walkScoreDescription,
          explanation: getScoreExplanation('walk', walkScoreData.walkScore),
        },
        transitScore: walkScoreData.transitScore
          ? {
              score: walkScoreData.transitScore,
              description: walkScoreData.transitScoreDescription,
              explanation: getScoreExplanation('transit', walkScoreData.transitScore),
            }
          : null,
        bikeScore: walkScoreData.bikeScore
          ? {
              score: walkScoreData.bikeScore,
              description: walkScoreData.bikeScoreDescription,
              explanation: getScoreExplanation('bike', walkScoreData.bikeScore),
            }
          : null,
      }

      // Calculate overall livability score (weighted average)
      const overallScore = calculateOverallScore(
        walkScoreData.walkScore,
        walkScoreData.transitScore,
        walkScoreData.bikeScore
      )

      return {
        scores,
        overall: {
          score: overallScore,
          description: getOverallDescription(overallScore),
        },
        location: { lat, lng, address },
      }
    })

    if (!cacheResult.data) {
      const response = apiError('NO_DATA', 'Walk Score data not available for this location.', 404, requestId)
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    const response = NextResponse.json({
      success: true,
      data: cacheResult.data,
      meta: {
        requestId,
        cached: cacheResult.meta.cached,
        cachedAt: cacheResult.meta.cachedAt,
        responseTime: cacheResult.meta.responseTime,
        source: 'walkscore.com',
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
    console.error('Scores API error:', error)
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch scores data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}

function getScoreExplanation(type: 'walk' | 'transit' | 'bike', score: number): string {
  if (type === 'walk') {
    if (score >= 90) return "Daily errands do not require a car - a Walker's Paradise"
    if (score >= 70) return 'Most errands can be accomplished on foot - Very Walkable'
    if (score >= 50) return 'Some errands can be accomplished on foot - Somewhat Walkable'
    if (score >= 25) return 'Most errands require a car - Car-Dependent'
    return 'Almost all errands require a car - Car-Dependent'
  }

  if (type === 'transit') {
    if (score >= 90) return 'Convenient for most trips - Excellent Transit'
    if (score >= 70) return 'Many nearby public transportation options - Excellent Transit'
    if (score >= 50) return 'Many nearby public transportation options - Good Transit'
    if (score >= 25) return 'A few public transportation options - Some Transit'
    return 'Minimal transit options - Minimal Transit'
  }

  // bike
  if (score >= 90) return "Biking is convenient for most trips - Biker's Paradise"
  if (score >= 70) return 'Biking is convenient for most trips - Very Bikeable'
  if (score >= 50) return 'Biking is convenient for some trips - Bikeable'
  return 'Minimal bike infrastructure - Somewhat Bikeable'
}

function calculateOverallScore(
  walkScore: number,
  transitScore?: number,
  bikeScore?: number
): number {
  // Weighted average: Walk 50%, Transit 30%, Bike 20%
  let total = walkScore * 0.5
  let weight = 0.5

  if (transitScore !== undefined) {
    total += transitScore * 0.3
    weight += 0.3
  }

  if (bikeScore !== undefined) {
    total += bikeScore * 0.2
    weight += 0.2
  }

  return Math.round(total / weight)
}

function getOverallDescription(score: number): string {
  if (score >= 90) return 'Excellent Livability'
  if (score >= 70) return 'Very Good Livability'
  if (score >= 50) return 'Good Livability'
  if (score >= 25) return 'Moderate Livability'
  return 'Car-Dependent Area'
}
