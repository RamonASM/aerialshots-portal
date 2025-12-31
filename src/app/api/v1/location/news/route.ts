// Life Here API - News Endpoint
// GET /api/v1/location/news?lat=&lng=
// Returns local news, Reddit discussions, and curated updates

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import {
  getNewsData,
  getLocalNews,
  getRedditDiscussions,
  getCuratedUpdates,
  getRealEstateNews,
  getBusinessNews,
} from '@/lib/integrations/news/client'
import { apiLogger, formatError } from '@/lib/logger'

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
  const source = url.searchParams.get('source') // 'news', 'reddit', 'curated', 'real_estate', 'business'
  const limit = parseInt(url.searchParams.get('limit') || '15')

  try {
    // Single source mode
    if (source) {
      let data
      switch (source) {
        case 'news':
          data = { articles: await getLocalNews(lat, lng, Math.min(limit, 30)) }
          break
        case 'reddit':
          data = { discussions: await getRedditDiscussions(lat, lng, Math.min(limit, 20)) }
          break
        case 'curated':
          data = { curatedUpdates: await getCuratedUpdates(lat, lng, Math.min(limit, 20)) }
          break
        case 'real_estate':
          data = { realEstateNews: await getRealEstateNews(Math.min(limit, 20)) }
          break
        case 'business':
          data = { businessNews: await getBusinessNews(lat, lng, Math.min(limit, 20)) }
          break
        default:
          data = { articles: await getLocalNews(lat, lng, Math.min(limit, 30)) }
      }

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: { source, ...data },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Full news data (default)
    const [newsData, realEstateNews, businessNews] = await Promise.all([
      getNewsData(lat, lng),
      getRealEstateNews(10),
      getBusinessNews(lat, lng, 10),
    ])

    const responseTime = Date.now() - startTime

    const response = NextResponse.json({
      success: true,
      data: {
        ...newsData,
        realEstateNews,
        businessNews,
      },
      meta: {
        requestId,
        cached: false,
        responseTime,
      },
    })

    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  } catch (error) {
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'News API error')
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch news data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
