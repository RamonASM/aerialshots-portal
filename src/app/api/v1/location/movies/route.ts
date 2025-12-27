// Life Here API - Movies Endpoint
// GET /api/v1/location/movies?lat=&lng=
// Returns now playing movies and nearby theaters

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import {
  getMoviesData,
  getNowPlaying,
  getUpcoming,
  getPopular,
  getTopRated,
  searchMovies,
  getNearbyTheaters,
} from '@/lib/integrations/movies/client'

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
  const filter = url.searchParams.get('filter') // 'now_playing', 'upcoming', 'popular', 'top_rated'
  const theatersOnly = url.searchParams.get('theaters_only') === 'true'
  const limit = parseInt(url.searchParams.get('limit') || '12')

  try {
    // Theaters only mode
    if (theatersOnly) {
      const theaters = await getNearbyTheaters(lat, lng, Math.min(limit, 20))

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: { theaters },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Search mode
    if (search) {
      const movies = await searchMovies(search, Math.min(limit, 20))

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: {
          search: { query: search, results: movies },
        },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Filter mode
    if (filter) {
      let movies
      switch (filter) {
        case 'now_playing':
          movies = await getNowPlaying(Math.min(limit, 20))
          break
        case 'upcoming':
          movies = await getUpcoming(Math.min(limit, 20))
          break
        case 'popular':
          movies = await getPopular(Math.min(limit, 20))
          break
        case 'top_rated':
          movies = await getTopRated(Math.min(limit, 20))
          break
        default:
          movies = await getNowPlaying(Math.min(limit, 20))
      }

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: { filter, movies },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Full movies data (default)
    const data = await getMoviesData(lat, lng)
    const responseTime = Date.now() - startTime

    const response = NextResponse.json({
      success: true,
      data,
      meta: {
        requestId,
        cached: false,
        responseTime,
      },
    })

    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  } catch (error) {
    console.error('Movies API error:', error)
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch movies data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
