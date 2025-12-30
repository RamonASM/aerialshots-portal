import { createAdminClient } from '@/lib/supabase/admin'

export interface TravelFeeConfig {
  home_base_lat: number
  home_base_lng: number
  home_base_address: string
  free_radius_miles: number
  per_mile_rate_cents: number
  minimum_fee_cents: number
  maximum_fee_cents: number
  round_trip: boolean
}

export interface TravelFeeCalculation {
  distance_miles: number
  drive_time_minutes: number | null
  calculated_fee_cents: number
  applied_fee_cents: number
  is_within_free_radius: boolean
  is_round_trip: boolean
  breakdown: {
    one_way_miles: number
    billable_miles: number
    per_mile_rate_cents: number
    raw_fee_cents: number
    capped_at_maximum: boolean
  }
}

const DEFAULT_CONFIG: TravelFeeConfig = {
  home_base_lat: 28.5383,
  home_base_lng: -81.3792,
  home_base_address: 'Orlando, FL',
  free_radius_miles: 40, // Properties within 40 miles of home base are free
  per_mile_rate_cents: 75, // $0.75 per mile beyond free radius
  minimum_fee_cents: 0,
  maximum_fee_cents: 15000, // Max $150 travel fee
  round_trip: true,
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Get travel fee configuration from database
 */
export async function getTravelFeeConfig(): Promise<TravelFeeConfig> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('business_settings')
      .select('setting_value')
      .eq('setting_key', 'travel_fees')
      .single() as { data: { setting_value: Partial<TravelFeeConfig> } | null; error: Error | null }

    if (error || !data) {
      console.warn('[TravelFee] Using default config:', error?.message)
      return DEFAULT_CONFIG
    }

    return {
      ...DEFAULT_CONFIG,
      ...data.setting_value,
    }
  } catch (error) {
    console.error('[TravelFee] Error fetching config:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Calculate travel fee for a destination
 */
export async function calculateTravelFee(
  destinationLat: number,
  destinationLng: number,
  driveTimeMinutes?: number | null
): Promise<TravelFeeCalculation> {
  const config = await getTravelFeeConfig()

  // Calculate straight-line distance (one way)
  const oneWayMiles = calculateDistanceMiles(
    config.home_base_lat,
    config.home_base_lng,
    destinationLat,
    destinationLng
  )

  // Total distance (round trip if configured)
  const totalMiles = config.round_trip ? oneWayMiles * 2 : oneWayMiles

  // Calculate billable miles (beyond free radius)
  const freeRadiusMiles = config.round_trip
    ? config.free_radius_miles * 2
    : config.free_radius_miles
  const billableMiles = Math.max(0, totalMiles - freeRadiusMiles)

  // Calculate raw fee
  const rawFeeCents = Math.round(billableMiles * config.per_mile_rate_cents)

  // Apply minimum and maximum
  let appliedFeeCents = rawFeeCents
  if (appliedFeeCents < config.minimum_fee_cents) {
    appliedFeeCents = 0 // No fee if below minimum
  }
  const cappedAtMaximum = appliedFeeCents > config.maximum_fee_cents
  if (cappedAtMaximum) {
    appliedFeeCents = config.maximum_fee_cents
  }

  return {
    distance_miles: Math.round(totalMiles * 100) / 100,
    drive_time_minutes: driveTimeMinutes ?? null,
    calculated_fee_cents: rawFeeCents,
    applied_fee_cents: appliedFeeCents,
    is_within_free_radius: oneWayMiles <= config.free_radius_miles,
    is_round_trip: config.round_trip,
    breakdown: {
      one_way_miles: Math.round(oneWayMiles * 100) / 100,
      billable_miles: Math.round(billableMiles * 100) / 100,
      per_mile_rate_cents: config.per_mile_rate_cents,
      raw_fee_cents: rawFeeCents,
      capped_at_maximum: cappedAtMaximum,
    },
  }
}

/**
 * Save travel fee calculation to database
 */
export async function saveTravelFeeCalculation(
  orderId: string | null,
  listingId: string,
  calculation: TravelFeeCalculation,
  destinationLat: number,
  destinationLng: number,
  waived: boolean = false,
  waiveReason?: string
): Promise<{ id: string } | null> {
  try {
    const config = await getTravelFeeConfig()
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('travel_fee_calculations')
      .insert({
        order_id: orderId,
        listing_id: listingId,
        origin_lat: config.home_base_lat,
        origin_lng: config.home_base_lng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        distance_miles: calculation.distance_miles,
        drive_time_minutes: calculation.drive_time_minutes,
        calculated_fee_cents: calculation.calculated_fee_cents,
        applied_fee_cents: waived ? 0 : calculation.applied_fee_cents,
        is_round_trip: calculation.is_round_trip,
        waived,
        waive_reason: waiveReason,
      })
      .select('id')
      .single() as { data: { id: string } | null; error: Error | null }

    if (error) {
      console.error('[TravelFee] Error saving calculation:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[TravelFee] Error saving calculation:', error)
    return null
  }
}

/**
 * Format cents as currency string
 */
export function formatTravelFee(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Get human-readable distance description
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return 'Less than 1 mile'
  }
  return `${miles.toFixed(1)} miles`
}
