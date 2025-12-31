// Life Here API - Scores Endpoint
// GET /api/v1/location/scores?lat=&lng=&profile=balanced
// Returns Life Here Score - our proprietary Central Florida-focused scoring system

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { calculateLifeHereScore, type LifestyleProfile } from '@/lib/scoring'
import { withLocationCache } from '@/lib/api/cache'
import { apiLogger, formatError } from '@/lib/logger'

const VALID_PROFILES: LifestyleProfile[] = ['balanced', 'family', 'professional', 'active', 'foodie']

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

  // Parse lifestyle profile
  const profileParam = url.searchParams.get('profile') || 'balanced'
  const profile: LifestyleProfile = VALID_PROFILES.includes(profileParam as LifestyleProfile)
    ? (profileParam as LifestyleProfile)
    : 'balanced'

  try {
    // Life Here Scores are calculated from live place data, cache for 30 minutes
    // Use 'scores' category for caching, profile-specific data is handled by the score calculation
    const cacheResult = await withLocationCache(lat, lng, 'scores', async () => {
      const lifeHereScore = await calculateLifeHereScore(lat, lng, profile)
      return lifeHereScore
    })

    if (!cacheResult.data) {
      const response = apiError('NO_DATA', 'Unable to calculate Life Here Score for this location.', 404, requestId)
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    const score = cacheResult.data

    const response = NextResponse.json({
      success: true,
      data: {
        // Overall Life Here Score
        lifeHereScore: {
          score: score.overall,
          label: score.label,
          profile: score.profile,
          description: getOverallDescription(score.overall),
        },
        // Individual category scores
        scores: {
          dining: {
            score: score.dining.score,
            label: score.dining.label,
            description: score.dining.details,
            highlights: {
              restaurantCount: score.dining.restaurantCount,
              topRated: score.dining.topRestaurants,
              cuisineTypes: score.dining.cuisineTypes,
            },
          },
          convenience: {
            score: score.convenience.score,
            label: score.convenience.label,
            description: score.convenience.details,
            highlights: {
              nearestGroceryMiles: score.convenience.nearestGroceryMiles,
              has24HourPharmacy: score.convenience.has24HourPharmacy,
            },
          },
          lifestyle: {
            score: score.lifestyle.score,
            label: score.lifestyle.label,
            description: score.lifestyle.details,
            highlights: {
              gymCount: score.lifestyle.gymCount,
              parkCount: score.lifestyle.parkCount,
              entertainmentVenues: score.lifestyle.entertainmentVenues,
            },
          },
          commute: {
            score: score.commute.score,
            label: score.commute.label,
            description: score.commute.details,
            highlights: {
              airportMinutes: score.commute.airportMinutes,
              beachMinutes: score.commute.beachMinutes,
              downtownMinutes: score.commute.downtownMinutes,
              themeParkMinutes: score.commute.themeParkMinutes,
            },
          },
        },
        // Profile descriptions
        profileInfo: getProfileInfo(profile),
        // Location
        location: { lat, lng },
      },
      meta: {
        requestId,
        cached: cacheResult.meta.cached,
        cachedAt: cacheResult.meta.cachedAt,
        responseTime: cacheResult.meta.responseTime,
        calculatedAt: score.calculatedAt,
        source: 'lifehere.api',
        availableProfiles: VALID_PROFILES,
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
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'Life Here Score API error')
    const response = apiError('INTERNAL_ERROR', 'Failed to calculate Life Here Score.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}

function getOverallDescription(score: number): string {
  if (score >= 90) return 'Exceptional lifestyle location with outstanding amenities and accessibility'
  if (score >= 70) return 'Excellent lifestyle location with great amenities and good accessibility'
  if (score >= 50) return 'Good lifestyle location with solid amenities and reasonable accessibility'
  if (score >= 30) return 'Moderate lifestyle location with basic amenities'
  return 'Limited amenities in this area - car-dependent lifestyle'
}

function getProfileInfo(profile: LifestyleProfile): {
  name: string
  description: string
  emphasis: string[]
} {
  const profiles = {
    balanced: {
      name: 'Balanced Lifestyle',
      description: 'Equal emphasis on convenience, dining, lifestyle, and commute factors',
      emphasis: ['Convenience', 'Commute', 'Dining', 'Lifestyle'],
    },
    family: {
      name: 'Family-Oriented',
      description: 'Prioritizes convenience and lifestyle for family living',
      emphasis: ['Convenience', 'Lifestyle', 'Commute', 'Dining'],
    },
    professional: {
      name: 'Career Professional',
      description: 'Heavy emphasis on commute times and work accessibility',
      emphasis: ['Commute', 'Convenience', 'Dining', 'Lifestyle'],
    },
    active: {
      name: 'Active Lifestyle',
      description: 'Prioritizes fitness, recreation, and outdoor activities',
      emphasis: ['Lifestyle', 'Commute', 'Convenience', 'Dining'],
    },
    foodie: {
      name: 'Food Enthusiast',
      description: 'Prioritizes dining options, variety, and quality restaurants',
      emphasis: ['Dining', 'Lifestyle', 'Convenience', 'Commute'],
    },
  }

  return profiles[profile]
}
