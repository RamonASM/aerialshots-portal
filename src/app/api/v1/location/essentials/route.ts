// Life Here API - Essentials Endpoint
// GET /api/v1/location/essentials?lat=&lng=
// Returns grocery stores, pharmacies, banks, and gas stations

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
  const category = url.searchParams.get('category') // 'grocery', 'pharmacy', 'banks', 'gas'
  const openNow = url.searchParams.get('open_now') === 'true'
  const radiusMeters = parseInt(url.searchParams.get('radius') || '5000') // Default 5km (~3 miles)

  try {
    if (category) {
      // Single category mode
      let places
      let filterFn: (p: { type: string; name: string }) => boolean

      switch (category) {
        case 'grocery':
          places = await searchNearbyPlaces(lat, lng, 'shopping', Math.min(radiusMeters, 16000))
          filterFn = (p) =>
            p.type.includes('grocery') ||
            p.type.includes('supermarket') ||
            p.name.toLowerCase().includes('publix') ||
            p.name.toLowerCase().includes('whole foods') ||
            p.name.toLowerCase().includes('trader joe') ||
            p.name.toLowerCase().includes('aldi') ||
            p.name.toLowerCase().includes('walmart') ||
            p.name.toLowerCase().includes('target')
          break
        case 'pharmacy':
          places = await searchNearbyPlaces(lat, lng, 'services', Math.min(radiusMeters, 16000))
          filterFn = (p) =>
            p.type.includes('pharmacy') ||
            p.name.toLowerCase().includes('cvs') ||
            p.name.toLowerCase().includes('walgreens') ||
            p.name.toLowerCase().includes('pharmacy')
          break
        case 'banks':
          places = await searchNearbyPlaces(lat, lng, 'services', Math.min(radiusMeters, 16000))
          filterFn = (p) =>
            p.type.includes('bank') ||
            p.name.toLowerCase().includes('bank') ||
            p.name.toLowerCase().includes('chase') ||
            p.name.toLowerCase().includes('wells fargo') ||
            p.name.toLowerCase().includes('credit union')
          break
        case 'gas':
          places = await searchNearbyPlaces(lat, lng, 'services', Math.min(radiusMeters, 16000))
          filterFn = (p) =>
            p.type.includes('gas_station') ||
            p.name.toLowerCase().includes('shell') ||
            p.name.toLowerCase().includes('chevron') ||
            p.name.toLowerCase().includes('exxon') ||
            p.name.toLowerCase().includes('wawa') ||
            p.name.toLowerCase().includes('racetrac')
          break
        default:
          places = await searchNearbyPlaces(lat, lng, 'shopping', Math.min(radiusMeters, 16000))
          filterFn = () => true
      }

      let filtered = (places || []).filter(filterFn)

      if (openNow) {
        filtered = filtered.filter((p) => p.isOpen)
      }

      const formatted = filtered.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category,
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        isOpen: p.isOpen || false,
        rating: p.rating,
        photoUrl: p.photoUrl,
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

    // Full essentials data (default)
    const placesData = await getAllNearbyPlaces(lat, lng)

    const shopping = placesData?.shopping || []
    const services = placesData?.services || []

    // Filter into categories
    const grocery = shopping
      .filter(
        (p) =>
          p.type.includes('grocery') ||
          p.type.includes('supermarket') ||
          p.name.toLowerCase().includes('publix') ||
          p.name.toLowerCase().includes('whole foods')
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'grocery',
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        isOpen: p.isOpen || false,
      }))

    const pharmacy = services
      .filter((p) => p.type.includes('pharmacy') || p.name.toLowerCase().includes('pharmacy'))
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'pharmacy',
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        isOpen: p.isOpen || false,
      }))

    const banks = services
      .filter((p) => p.type.includes('bank') || p.name.toLowerCase().includes('bank'))
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'bank',
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        isOpen: p.isOpen || false,
      }))

    const gas = services
      .filter(
        (p) =>
          p.type.includes('gas_station') ||
          p.name.toLowerCase().includes('shell') ||
          p.name.toLowerCase().includes('wawa')
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: 'gas',
        distanceMiles: p.distance ? Math.round(p.distance * 10) / 10 : 0,
        address: p.address,
        isOpen: p.isOpen || false,
      }))

    // Find closest of each type
    const closest = {
      grocery: grocery[0] || null,
      pharmacy: pharmacy[0] || null,
      bank: banks[0] || null,
      gas: gas[0] || null,
    }

    const responseTime = Date.now() - startTime

    const response = NextResponse.json({
      success: true,
      data: {
        grocery,
        pharmacy,
        banks,
        gas,
        closest,
        summary: {
          totalGrocery: grocery.length,
          totalPharmacy: pharmacy.length,
          totalBanks: banks.length,
          totalGas: gas.length,
          nearestGroceryMiles: grocery[0]?.distanceMiles || null,
          nearestPharmacyMiles: pharmacy[0]?.distanceMiles || null,
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
    apiLogger.error({ requestId, lat, lng, ...formatError(error) }, 'Essentials API error')
    const response = apiError('INTERNAL_ERROR', 'Failed to fetch essentials data.', 500, requestId)
    return addRateLimitHeaders(addCorsHeaders(response, request), validation.keyData, rateLimitResult)
  }
}
