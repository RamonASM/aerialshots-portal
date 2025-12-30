import { NextRequest, NextResponse } from 'next/server'
import {
  calculateTravelFee,
  getTravelFeeConfig,
  formatTravelFee,
  formatDistance,
} from '@/lib/scheduling/travel-fee'

export const dynamic = 'force-dynamic'

/**
 * GET /api/booking/travel-fee
 * Calculate travel fee for a destination
 *
 * Query params:
 * - lat: Destination latitude
 * - lng: Destination longitude
 * - address: (optional) Address for display
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const address = searchParams.get('address')

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing lat or lng parameters' },
        { status: 400 }
      )
    }

    const destinationLat = parseFloat(lat)
    const destinationLng = parseFloat(lng)

    if (isNaN(destinationLat) || isNaN(destinationLng)) {
      return NextResponse.json(
        { error: 'Invalid lat or lng values' },
        { status: 400 }
      )
    }

    // Validate coordinates are reasonable
    if (
      destinationLat < -90 ||
      destinationLat > 90 ||
      destinationLng < -180 ||
      destinationLng > 180
    ) {
      return NextResponse.json(
        { error: 'Coordinates out of range' },
        { status: 400 }
      )
    }

    // Get config for display
    const config = await getTravelFeeConfig()

    // Calculate travel fee
    const calculation = await calculateTravelFee(destinationLat, destinationLng)

    return NextResponse.json({
      success: true,
      destination: {
        lat: destinationLat,
        lng: destinationLng,
        address: address || null,
      },
      origin: {
        lat: config.home_base_lat,
        lng: config.home_base_lng,
        address: config.home_base_address,
      },
      calculation: {
        distance_miles: calculation.distance_miles,
        drive_time_minutes: calculation.drive_time_minutes,
        fee_cents: calculation.applied_fee_cents,
        fee_formatted: formatTravelFee(calculation.applied_fee_cents),
        distance_formatted: formatDistance(calculation.distance_miles),
        is_within_free_radius: calculation.is_within_free_radius,
        is_round_trip: calculation.is_round_trip,
      },
      config: {
        free_radius_miles: config.free_radius_miles,
        per_mile_rate: `$${(config.per_mile_rate_cents / 100).toFixed(2)}/mile`,
        maximum_fee: formatTravelFee(config.maximum_fee_cents),
      },
      breakdown: calculation.breakdown,
    })
  } catch (error) {
    console.error('[TravelFee API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate travel fee' },
      { status: 500 }
    )
  }
}
