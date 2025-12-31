// Life Here API - Events Endpoint
// GET /api/v1/location/events?lat=&lng=
// Returns local events from Ticketmaster and Eventbrite

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { getCommunityEvents, getEventsByCategory } from '@/lib/integrations/eventbrite/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import type { LocalEvent } from '@/lib/api/types'
import { withLocationCache, createApiCacheKey, withCache } from '@/lib/api/cache'
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
  const category = url.searchParams.get('category') as LocalEvent['category'] | null
  const filter = url.searchParams.get('filter') // 'free', 'family', 'weekend', 'thisWeek'
  const radiusMiles = parseInt(url.searchParams.get('radius') || '25')

  try {
    let cacheResult

    if (category) {
      // Filter by category - cache by category
      const cacheKey = createApiCacheKey('events/category', { lat, lng, category })
      cacheResult = await withCache(cacheKey, 'events', async () => {
        const events = await getEventsByCategory(lat, lng, category, 30)
        return { category, events, count: events.length }
      })
    } else {
      // Full events data - cache by location
      cacheResult = await withLocationCache(lat, lng, 'events', async () => {
        // Fetch from both sources
        const [ticketmasterEvents, eventbriteData] = await Promise.all([
          searchLocalEvents(lat, lng, radiusMiles, 60),
          getCommunityEvents(lat, lng),
        ])

        // Merge and deduplicate
        const allEvents = [
          ...ticketmasterEvents.map((e) => ({ ...e, source: 'ticketmaster' as const })),
          ...eventbriteData.upcoming,
        ]

        // Sort by date
        allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Categorize events
        const byCategory: Record<string, LocalEvent[]> = {}
        for (const event of allEvents) {
          const cat = event.category || 'other'
          if (!byCategory[cat]) byCategory[cat] = []
          byCategory[cat].push(event)
        }

        return {
          upcoming: allEvents.slice(0, 30),
          thisWeek: allEvents.filter((e) => {
            const eventDate = new Date(e.date)
            const weekFromNow = new Date()
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            return eventDate <= weekFromNow
          }),
          thisWeekend: eventbriteData.weekend,
          family: eventbriteData.family,
          free: eventbriteData.free,
          byCategory,
          sources: {
            ticketmaster: ticketmasterEvents.length,
            eventbrite: eventbriteData.upcoming.length,
          },
        }
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
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'Events API error')
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch events data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
