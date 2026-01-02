import { NextRequest, NextResponse } from 'next/server'
import { checkAirspace, type AirspaceCheckRequest } from '@/lib/integrations/faa/client'
import { createClient } from '@/lib/supabase/server'

// Cache check results for 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AirspaceCheckRequest

    // Validate required fields
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (body.latitude < -90 || body.latitude > 90) {
      return NextResponse.json(
        { error: 'latitude must be between -90 and 90' },
        { status: 400 }
      )
    }

    if (body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json(
        { error: 'longitude must be between -180 and 180' },
        { status: 400 }
      )
    }

    // Check if we have a cached result
    const supabase = await createClient()

    // Round coordinates to 4 decimal places (~11 meters precision)
    const roundedLat = Math.round(body.latitude * 10000) / 10000
    const roundedLng = Math.round(body.longitude * 10000) / 10000

    // Try to get cached result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cached } = await (supabase as any)
      .from('airspace_checks')
      .select('*')
      .eq('lat', roundedLat)
      .eq('lng', roundedLng)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      })
    }

    // Perform airspace check
    const result = await checkAirspace({
      latitude: body.latitude,
      longitude: body.longitude,
      address: body.address,
      altitude: body.altitude,
    })

    // Cache the result
    try {
      const cacheData = {
        lat: roundedLat,
        lng: roundedLng,
        address: body.address || null,
        can_fly: result.canFly,
        status: result.status as 'clear' | 'caution' | 'restricted' | 'prohibited',
        airspace_class: result.airspaceClass as 'A' | 'B' | 'C' | 'D' | 'E' | 'G',
        max_altitude: result.maxAltitude,
        nearby_airports: JSON.stringify(result.nearbyAirports),
        restrictions: JSON.stringify(result.restrictions),
        advisories: JSON.stringify(result.advisories),
        authorization_required: result.authorization.required,
        authorization_type: result.authorization.type || null,
        authorization_instructions: result.authorization.instructions || null,
        checked_at: result.checkedAt,
        expires_at: result.expiresAt,
      }
      // Use insert with conflict handling as upsert may have type issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('airspace_checks').insert(cacheData)
    } catch (cacheError) {
      // Don't fail the request if caching fails (might be duplicate key)
      console.warn('Cache insert skipped:', cacheError)
    }

    return NextResponse.json({
      ...result,
      cached: false,
    })
  } catch (error) {
    console.error('Airspace check error:', error)
    return NextResponse.json(
      { error: 'Failed to check airspace' },
      { status: 500 }
    )
  }
}

// GET endpoint for simple checks via query params
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const address = searchParams.get('address')

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'lat and lng query parameters are required' },
      { status: 400 }
    )
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 }
    )
  }

  // Reuse POST handler logic
  const result = await checkAirspace({
    latitude,
    longitude,
    address: address || undefined,
  })

  return NextResponse.json(result)
}
