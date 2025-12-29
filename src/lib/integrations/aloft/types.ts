/**
 * Aloft Airspace API Types
 *
 * Type definitions for drone airspace authorization and checks.
 * Aloft is the #1 FAA-approved LAANC UAS Service Supplier.
 *
 * Note: The actual Aloft API requires enterprise access.
 * This integration provides airspace data for booking qualification.
 */

export interface AloftConfig {
  apiKey: string
  environment: 'staging' | 'production'
  timeout?: number
}

/**
 * Airspace classification
 */
export type AirspaceClass =
  | 'G'    // Uncontrolled - generally flyable up to 400ft
  | 'B'    // Busy airports (e.g., major hubs) - requires authorization
  | 'C'    // Medium airports - requires authorization
  | 'D'    // Smaller towered airports - requires authorization
  | 'E'    // Surface area - may require authorization
  | 'SUA'  // Special Use Airspace (MOAs, Restricted, etc.)

/**
 * Airspace authorization status
 */
export type AuthorizationStatus =
  | 'not_required'       // Class G, can fly freely
  | 'laanc_available'    // LAANC near-real-time approval available
  | 'further_coord'      // Requires further coordination (72+ hours)
  | 'prohibited'         // No-fly zone (TFR, restricted, etc.)
  | 'unknown'            // Unable to determine

/**
 * Location coordinates
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Airspace check request
 */
export interface AirspaceCheckRequest {
  location: Coordinates
  altitude_ft?: number // Default 400ft
  radius_ft?: number   // Check radius, default 400ft
  date?: string        // ISO date for TFR checks
}

/**
 * Airspace check result
 */
export interface AirspaceCheckResult {
  location: Coordinates
  airspace_class: AirspaceClass
  authorization_status: AuthorizationStatus
  max_altitude_ft: number // Maximum authorized altitude without special approval
  ceiling_ft: number      // UAS Facility Map ceiling (0 if prohibited)
  restrictions: AirspaceRestriction[]
  nearby_airports: NearbyAirport[]
  tfrs: TemporaryFlightRestriction[]
  can_fly: boolean
  needs_authorization: boolean
  laanc_available: boolean
  warnings: string[]
  checked_at: string
}

/**
 * Airspace restriction
 */
export interface AirspaceRestriction {
  type: 'airport' | 'tfr' | 'sua' | 'notam' | 'national_park' | 'stadium' | 'other'
  name: string
  description?: string
  distance_ft?: number
  affects_operation: boolean
}

/**
 * Nearby airport info
 */
export interface NearbyAirport {
  icao_code: string
  name: string
  type: 'large_hub' | 'medium' | 'small' | 'heliport' | 'private'
  distance_nm: number
  airspace_class: AirspaceClass
  laanc_enabled: boolean
  facility_map_ceiling_ft: number
}

/**
 * Temporary Flight Restriction
 */
export interface TemporaryFlightRestriction {
  notam_id: string
  type: 'vip' | 'fire' | 'security' | 'hazard' | 'special_event' | 'other'
  description: string
  effective_start: string
  effective_end: string
  altitude_floor_ft: number
  altitude_ceiling_ft: number
  radius_nm: number
  center: Coordinates
}

/**
 * LAANC authorization request
 */
export interface LANCRequest {
  pilot_name: string
  pilot_certificate_number?: string // Part 107 certificate
  remote_id: string                 // Drone registration number
  operation_type: 'commercial' | 'recreational'
  location: Coordinates
  altitude_ft: number
  radius_ft: number
  start_time: string
  end_time: string
  purpose: string
  contact_phone: string
  contact_email: string
}

/**
 * LAANC authorization response
 */
export interface LANCResponse {
  authorization_id: string
  status: 'approved' | 'pending' | 'denied' | 'expired'
  valid_from: string
  valid_until: string
  max_altitude_ft: number
  conditions: string[]
  denial_reason?: string
}

/**
 * Booking airspace qualification result
 */
export interface BookingAirspaceQualification {
  listing_id: string
  address: string
  coordinates: Coordinates
  qualified: boolean
  requires_authorization: boolean
  laanc_available: boolean
  estimated_approval_time: string // 'instant' | '24-72 hours' | 'not_available'
  airspace_summary: string
  warnings: string[]
  restrictions: AirspaceRestriction[]
  checked_at: string
}
