// Life Here API - Lifestyle Endpoint
// GET /api/v1/location/lifestyle?lat=&lng=
// Returns fitness, parks, recreation, and sports venues

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { validateApiKey, apiError } from '@/lib/api/middleware/api-key'
import { checkRateLimit, addRateLimitHeaders } from '@/lib/api/middleware/rate-limit'
import { addCorsHeaders, handleCorsPrelight } from '@/lib/api/middleware/cors'
import { searchNearbyPlaces, getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
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
  const category = url.searchParams.get('category') // 'fitness', 'parks', 'recreation', 'sports'
  const radiusMeters = parseInt(url.searchParams.get('radius') || '8000') // Default 8km (~5 miles)

  try {
    if (category) {
      // Single category mode
      let places

      switch (category) {
        case 'fitness':
          places = await searchNearbyPlaces(lat, lng, 'fitness', Math.min(radiusMeters, 16000))
          break
        case 'parks':
          // Search for parks using Google Places text search
          places = await searchNearbyPlaces(lat, lng, 'entertainment', Math.min(radiusMeters, 16000))
          // Filter to parks
          if (places) {
            places = places.filter(
              (p) =>
                p.type.includes('park') ||
                p.name.toLowerCase().includes('park') ||
                p.name.toLowerCase().includes('trail') ||
                p.name.toLowerCase().includes('preserve')
            )
          }
          break
        case 'recreation':
          places = await searchNearbyPlaces(lat, lng, 'entertainment', Math.min(radiusMeters, 16000))
          break
        case 'sports':
          // Filter entertainment for sports facilities
          places = await searchNearbyPlaces(lat, lng, 'entertainment', Math.min(radiusMeters, 16000))
          if (places) {
            places = places.filter(
              (p) =>
                p.type.includes('stadium') ||
                p.type.includes('bowling') ||
                p.type.includes('golf') ||
                p.name.toLowerCase().includes('sports') ||
                p.name.toLowerCase().includes('arena') ||
                p.name.toLowerCase().includes('field')
            )
          }
          break
        default:
          places = await searchNearbyPlaces(lat, lng, 'fitness', Math.min(radiusMeters, 16000))
      }

      const formatted = (places || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category,
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
        isOpen: p.isOpen,
      }))

      const responseTime = Date.now() - startTime
      const response = NextResponse.json({
        success: true,
        data: {
          category,
          places: formatted,
          count: formatted.length,
        },
        meta: {
          requestId,
          cached: false,
          responseTime,
        },
      })
      return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
    }

    // Full lifestyle data (default)
    const placesData = await getAllNearbyPlaces(lat, lng)

    // Transform to lifestyle categories
    const fitness = (placesData?.fitness || []).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      category: 'fitness',
      rating: p.rating || undefined,
      reviewCount: p.reviewCount,
      distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
      address: p.address,
      photoUrl: p.photoUrl,
      isOpen: p.isOpen,
    }))

    const entertainment = placesData?.entertainment || []

    // Filter entertainment into subcategories
    const parks = entertainment
      .filter(
        (p) =>
          p.type.includes('park') ||
          p.name.toLowerCase().includes('park') ||
          p.name.toLowerCase().includes('trail')
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'parks',
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
      }))

    const recreation = entertainment
      .filter(
        (p) =>
          !p.type.includes('park') &&
          !p.name.toLowerCase().includes('park') &&
          !p.type.includes('stadium')
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'recreation',
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
      }))

    const sports = entertainment
      .filter(
        (p) =>
          p.type.includes('stadium') ||
          p.type.includes('bowling') ||
          p.type.includes('golf') ||
          p.name.toLowerCase().includes('sports')
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'sports',
        rating: p.rating || undefined,
        reviewCount: p.reviewCount,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        photoUrl: p.photoUrl,
      }))

    const responseTime = Date.now() - startTime

    const response = NextResponse.json({
      success: true,
      data: {
        fitness,
        parks,
        recreation,
        sports,
        summary: {
          totalFitness: fitness.length,
          totalParks: parks.length,
          totalRecreation: recreation.length,
          totalSports: sports.length,
          averageRating:
            fitness.length > 0
              ? Math.round(
                  (fitness.reduce((sum, p) => sum + (p.rating || 0), 0) / fitness.length) * 10
                ) / 10
              : null,
        },
      },
      meta: {
        requestId,
        cached: false,
        responseTime,
      },
    })

    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  } catch (error) {
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'Lifestyle API error')
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch lifestyle data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
