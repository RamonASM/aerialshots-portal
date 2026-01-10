import { NextRequest, NextResponse } from 'next/server'
import { getAloftClient } from '@/lib/integrations/aloft/client'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/booking/airspace-qualify
 * Qualify a location for drone operations during booking
 *
 * Request body:
 * - lat: Latitude
 * - lng: Longitude
 * - address: Property address
 * - listingId: (optional) Listing ID if known
 * - hasDroneServices: Whether drone services are selected
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng, address, listingId, hasDroneServices } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'lat and lng are required and must be numbers' },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      )
    }

    // Check cache first
    const supabase = createAdminClient()
    const roundedLat = Math.round(lat * 10000) / 10000
    const roundedLng = Math.round(lng * 10000) / 10000

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cached, error: cacheError } = await (supabase as any)
      .from('airspace_checks')
      .select('*')
      .eq('lat', roundedLat)
      .eq('lng', roundedLng)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cacheError) {
      console.warn('[Airspace Qualify] Cache lookup error:', cacheError)
    }

    if (cached) {
      // Transform cached data to booking qualification format
      const advisories = typeof cached.advisories === 'string'
        ? JSON.parse(cached.advisories)
        : cached.advisories || []
      const restrictions = typeof cached.restrictions === 'string'
        ? JSON.parse(cached.restrictions)
        : cached.restrictions || []

      // Update listing with cached airspace status if listingId was provided
      if (listingId && listingId !== 'booking-check') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('listings')
            .update({
              airspace_status: cached.status || 'unknown',
              airspace_checked_at: cached.checked_at,
            })
            .eq('id', listingId)
        } catch (listingError) {
          console.warn('[Airspace Qualify] Failed to update listing from cache:', listingError)
        }
      }

      return NextResponse.json({
        success: true,
        cached: true,
        qualification: {
          qualified: cached.can_fly,
          requires_authorization: cached.authorization_required,
          laanc_available: cached.authorization_type === 'LAANC',
          airspace_class: cached.airspace_class,
          max_altitude_ft: cached.max_altitude,
          warnings: advisories,
          restrictions: restrictions,
          checked_at: cached.checked_at,
        },
        recommendation: getRecommendation(
          cached.can_fly ?? false,
          cached.authorization_required ?? false,
          hasDroneServices
        ),
      })
    }

    // Perform fresh airspace check
    const aloftClient = getAloftClient()
    const qualification = await aloftClient.qualifyBookingLocation(
      listingId || 'booking-check',
      address || `${lat}, ${lng}`,
      { latitude: lat, longitude: lng }
    )

    // Cache the result
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('airspace_checks').upsert(
        {
          lat: roundedLat,
          lng: roundedLng,
          address: address || null,
          can_fly: qualification.qualified,
          status: qualification.qualified ? 'clear' : 'restricted',
          airspace_class: 'G', // Default, would come from full check
          max_altitude: 400, // Default for uncontrolled
          nearby_airports: '[]',
          restrictions: JSON.stringify(qualification.restrictions),
          advisories: JSON.stringify(qualification.warnings),
          authorization_required: qualification.requires_authorization,
          authorization_type: qualification.laanc_available ? 'LAANC' : null,
          authorization_instructions: qualification.requires_authorization
            ? 'Authorization required before drone operations'
            : null,
          checked_at: qualification.checked_at,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'lat,lng' }
      )
    } catch (cacheError) {
      console.warn('[Airspace Qualify] Cache error:', cacheError)
    }

    // Update listing with airspace status if listingId was provided
    if (listingId && listingId !== 'booking-check') {
      try {
        // Map qualification to status
        const airspaceStatus = qualification.qualified
          ? 'clear'
          : qualification.requires_authorization
            ? 'caution'
            : 'restricted'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('listings')
          .update({
            airspace_status: airspaceStatus,
            airspace_checked_at: qualification.checked_at,
          })
          .eq('id', listingId)
      } catch (listingError) {
        console.warn('[Airspace Qualify] Failed to update listing:', listingError)
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      qualification: {
        qualified: qualification.qualified,
        requires_authorization: qualification.requires_authorization,
        laanc_available: qualification.laanc_available,
        estimated_approval_time: qualification.estimated_approval_time,
        airspace_summary: qualification.airspace_summary,
        warnings: qualification.warnings,
        restrictions: qualification.restrictions,
        checked_at: qualification.checked_at,
      },
      recommendation: getRecommendation(
        qualification.qualified,
        qualification.requires_authorization,
        hasDroneServices
      ),
    })
  } catch (error) {
    console.error('[Airspace Qualify API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to qualify airspace' },
      { status: 500 }
    )
  }
}

/**
 * Get booking recommendation based on airspace status
 */
function getRecommendation(
  qualified: boolean,
  requiresAuth: boolean,
  hasDroneServices: boolean
): {
  action: 'proceed' | 'warning' | 'remove_drone' | 'contact_us'
  message: string
  severity: 'success' | 'warning' | 'error'
} {
  if (!hasDroneServices) {
    return {
      action: 'proceed',
      message: 'No drone services selected - no airspace restrictions apply.',
      severity: 'success',
    }
  }

  if (!qualified) {
    return {
      action: 'remove_drone',
      message:
        'This location is in restricted airspace. Drone photography may not be available. Consider removing drone services or contact us for alternatives.',
      severity: 'error',
    }
  }

  if (requiresAuth) {
    return {
      action: 'warning',
      message:
        'This location requires FAA authorization. We can handle this for you, but it may add time to scheduling. LAANC authorization is typically instant.',
      severity: 'warning',
    }
  }

  return {
    action: 'proceed',
    message:
      'Clear to fly! This location has no airspace restrictions for drone photography.',
    severity: 'success',
  }
}

// GET endpoint for simple qualification check
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const address = searchParams.get('address')
  const hasDrone = searchParams.get('drone') === 'true'

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

  // Create a mock request body and use POST logic
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      lat: latitude,
      lng: longitude,
      address,
      hasDroneServices: hasDrone,
    }),
  })

  return POST(mockRequest)
}
