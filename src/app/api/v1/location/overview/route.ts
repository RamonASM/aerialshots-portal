// Life Here API - Overview Endpoint (Master Endpoint)
// GET /api/v1/location/overview?lat=&lng=
// Returns all location data in one call

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'

// Integrations
import { getNearbyThemeParks } from '@/lib/integrations/themeparks/client'
import { getAirportProximity, getBeachProximity, getCommuteTimes, getCommuteSummary } from '@/lib/integrations/distance/client'
import { getDiningData } from '@/lib/integrations/yelp/client'
import { getCommunityEvents } from '@/lib/integrations/eventbrite/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getMoviesData } from '@/lib/integrations/movies/client'
import { getNewsData } from '@/lib/integrations/news/client'
import { getAllNearbyPlaces, searchNearbyPlaces } from '@/lib/integrations/google-places/client'
import { getWalkScore } from '@/lib/integrations/walkscore/client'

import type { LocationOverview, AttractionsData, EventsData, LifestyleData, EssentialsData } from '@/lib/api/types'
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

  try {
    // Use cache for the overview data
    const cacheResult = await withLocationCache(lat, lng, 'overview', async () => {
      // Fetch ALL data in parallel for maximum performance
      const [
        // Attractions
        themeparks,
        airports,
        beaches,
        // Dining (Yelp)
        diningData,
        // Events (Ticketmaster + Eventbrite)
        ticketmasterEvents,
        eventbriteData,
        // Movies
        moviesData,
        // News
        newsData,
        // Lifestyle (Google Places)
        placesData,
        // Commute
        commuteTimes,
        commuteSummary,
        // Scores
        walkScoreData,
      ] = await Promise.all([
        getNearbyThemeParks(lat, lng, 75),
        getAirportProximity(lat, lng),
        getBeachProximity(lat, lng, 100),
        getDiningData(lat, lng),
        searchLocalEvents(lat, lng, 25, 60),
        getCommunityEvents(lat, lng),
        getMoviesData(lat, lng),
        getNewsData(lat, lng),
        getAllNearbyPlaces(lat, lng),
        getCommuteTimes(lat, lng),
        getCommuteSummary(lat, lng),
        getWalkScore(lat, lng, 'Property Location'),
      ])

    // Build attractions data
    const attractionsData: AttractionsData = {
      themeparks,
      airports,
      beaches,
      museums: [], // From placesData.entertainment filtered
    }

    // Merge events from both sources
    const allEvents = [
      ...ticketmasterEvents.map((e) => ({ ...e, source: 'ticketmaster' as const })),
      ...eventbriteData.upcoming,
    ]

    // Sort by date
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Build events data
    const eventsData: EventsData = {
      upcoming: allEvents.slice(0, 20),
      thisWeek: allEvents.filter((e) => {
        const eventDate = new Date(e.date)
        const weekFromNow = new Date()
        weekFromNow.setDate(weekFromNow.getDate() + 7)
        return eventDate <= weekFromNow
      }),
      thisWeekend: eventbriteData.weekend,
      family: eventbriteData.family,
      free: eventbriteData.free,
      byCategory: {},
    }

    // Build lifestyle data from Google Places
    const lifestyleData: LifestyleData = {
      fitness: (placesData?.fitness || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'fitness',
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
      })),
      parks: [], // Would need separate query
      recreation: (placesData?.entertainment || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'recreation',
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
      })),
      sports: [],
    }

    // Build essentials data
    const essentialsData: EssentialsData = {
      grocery: (placesData?.shopping || [])
        .filter((p) => p.type.includes('grocery') || p.type.includes('supermarket'))
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category: 'grocery',
          distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
          address: p.address,
          isOpen: p.isOpen || false,
        })),
      pharmacy: (placesData?.services || [])
        .filter((p) => p.type.includes('pharmacy'))
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category: 'pharmacy',
          distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
          address: p.address,
          isOpen: p.isOpen || false,
        })),
      banks: (placesData?.services || [])
        .filter((p) => p.type.includes('bank'))
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category: 'bank',
          distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
          address: p.address,
          isOpen: p.isOpen || false,
        })),
      gas: [],
    }

      // Build complete overview
      const overview: LocationOverview = {
        location: {
          lat,
          lng,
        },
        attractions: attractionsData,
        dining: diningData || { trending: [], newOpenings: [], topRated: [], byCategory: {} },
        events: eventsData,
        movies: moviesData,
        news: newsData,
        commute: {
          destinations: commuteTimes,
          summary: commuteSummary,
        },
        lifestyle: lifestyleData,
        essentials: essentialsData,
        scores: {
          walkScore: walkScoreData?.walkScore || 0,
          walkScoreDescription: walkScoreData?.walkScoreDescription || 'Unknown',
          transitScore: walkScoreData?.transitScore,
          transitScoreDescription: walkScoreData?.transitScoreDescription,
          bikeScore: walkScoreData?.bikeScore,
          bikeScoreDescription: walkScoreData?.bikeScoreDescription,
        },
      }

      return overview
    }) // End of withLocationCache

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
    console.error('Overview API error:', error)
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch location data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
