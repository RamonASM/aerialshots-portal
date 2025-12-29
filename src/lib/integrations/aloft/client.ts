/**
 * Aloft Airspace Client
 *
 * API client for drone airspace authorization and checks.
 * Provides airspace qualification for real estate drone photography bookings.
 *
 * Note: Full LAANC authorization requires Aloft enterprise API access.
 * This client provides airspace awareness checks using available data.
 */

import { apiLogger, formatError } from '@/lib/logger'
import type {
  AloftConfig,
  Coordinates,
  AirspaceCheckRequest,
  AirspaceCheckResult,
  AirspaceClass,
  AuthorizationStatus,
  AirspaceRestriction,
  NearbyAirport,
  BookingAirspaceQualification,
} from './types'

// FAA UAS Facility Map API (public data)
const FAA_FACILITY_MAP_URL = 'https://uas-faa.opendata.arcgis.com/api'

// Default check altitude for real estate photography
const DEFAULT_ALTITUDE_FT = 400
const DEFAULT_RADIUS_FT = 400

export class AloftClient {
  private config: AloftConfig

  constructor(config?: Partial<AloftConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.ALOFT_API_KEY || '',
      environment: config?.environment || 'production',
      timeout: config?.timeout || 10000,
    }
  }

  /**
   * Check if Aloft API is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey
  }

  /**
   * Check airspace at a location
   */
  async checkAirspace(request: AirspaceCheckRequest): Promise<AirspaceCheckResult> {
    const { location, altitude_ft = DEFAULT_ALTITUDE_FT } = request

    try {
      // For now, use basic airspace classification logic
      // In production, this would call the Aloft API or FAA data sources
      const result = await this.getBasicAirspaceInfo(location, altitude_ft)
      return result
    } catch (error) {
      apiLogger.error({
        error: formatError(error),
        location,
      }, 'Airspace check failed')

      // Return safe default (assume needs review)
      return {
        location,
        airspace_class: 'G',
        authorization_status: 'unknown',
        max_altitude_ft: 0,
        ceiling_ft: 0,
        restrictions: [],
        nearby_airports: [],
        tfrs: [],
        can_fly: false,
        needs_authorization: true,
        laanc_available: false,
        warnings: ['Unable to verify airspace - manual review required'],
        checked_at: new Date().toISOString(),
      }
    }
  }

  /**
   * Get basic airspace information using coordinates
   * This is a simplified version - production would use Aloft's full API
   */
  private async getBasicAirspaceInfo(
    location: Coordinates,
    altitude_ft: number
  ): Promise<AirspaceCheckResult> {
    // In a real implementation, this would:
    // 1. Query FAA UAS Facility Maps for ceiling data
    // 2. Check for nearby airports and their controlled airspace
    // 3. Check for active TFRs
    // 4. Determine LAANC availability

    // For now, use a simplified heuristic based on location
    // Most residential areas are Class G (uncontrolled) up to 400ft

    const warnings: string[] = []
    const restrictions: AirspaceRestriction[] = []
    let airspaceClass: AirspaceClass = 'G'
    let authStatus: AuthorizationStatus = 'not_required'
    let maxAltitude = 400
    let laancAvailable = false

    // Check if near known major airports (simplified - would use real data)
    const nearMajorAirport = this.isNearMajorAirport(location)

    if (nearMajorAirport) {
      airspaceClass = nearMajorAirport.airspaceClass
      maxAltitude = nearMajorAirport.maxAltitude
      laancAvailable = nearMajorAirport.laancEnabled

      if (altitude_ft > maxAltitude) {
        authStatus = laancAvailable ? 'laanc_available' : 'further_coord'
        warnings.push(`Operating above ${maxAltitude}ft requires authorization`)
      }

      restrictions.push({
        type: 'airport',
        name: nearMajorAirport.name,
        distance_ft: nearMajorAirport.distance,
        affects_operation: altitude_ft > maxAltitude,
      })
    }

    // Check for known no-fly areas (national parks, stadiums, etc.)
    const noFlyZone = this.checkNoFlyZones(location)
    if (noFlyZone) {
      authStatus = 'prohibited'
      maxAltitude = 0
      restrictions.push(noFlyZone)
      warnings.push(`This location is in a no-fly zone: ${noFlyZone.name}`)
    }

    const canFly = authStatus !== 'prohibited' && maxAltitude > 0
    const needsAuth = authStatus !== 'not_required' && authStatus !== 'prohibited'

    return {
      location,
      airspace_class: airspaceClass,
      authorization_status: authStatus,
      max_altitude_ft: maxAltitude,
      ceiling_ft: maxAltitude,
      restrictions,
      nearby_airports: nearMajorAirport ? [{
        icao_code: nearMajorAirport.icao,
        name: nearMajorAirport.name,
        type: nearMajorAirport.type,
        distance_nm: nearMajorAirport.distance / 6076, // ft to nm
        airspace_class: nearMajorAirport.airspaceClass,
        laanc_enabled: nearMajorAirport.laancEnabled,
        facility_map_ceiling_ft: nearMajorAirport.maxAltitude,
      }] : [],
      tfrs: [],
      can_fly: canFly,
      needs_authorization: needsAuth,
      laanc_available: laancAvailable,
      warnings,
      checked_at: new Date().toISOString(),
    }
  }

  /**
   * Check if location is near a major airport
   * Simplified version - would use real FAA data in production
   */
  private isNearMajorAirport(location: Coordinates): {
    name: string
    icao: string
    type: 'large_hub' | 'medium' | 'small'
    airspaceClass: AirspaceClass
    distance: number
    maxAltitude: number
    laancEnabled: boolean
  } | null {
    // Major Florida airports (would be comprehensive in production)
    const majorAirports = [
      { icao: 'KMCO', name: 'Orlando International', lat: 28.4294, lon: -81.3089, class: 'B' as AirspaceClass, radius: 30 },
      { icao: 'KMIA', name: 'Miami International', lat: 25.7959, lon: -80.2870, class: 'B' as AirspaceClass, radius: 30 },
      { icao: 'KTPA', name: 'Tampa International', lat: 27.9755, lon: -82.5332, class: 'B' as AirspaceClass, radius: 30 },
      { icao: 'KFLL', name: 'Fort Lauderdale-Hollywood', lat: 26.0726, lon: -80.1527, class: 'B' as AirspaceClass, radius: 20 },
      { icao: 'KJAX', name: 'Jacksonville International', lat: 30.4941, lon: -81.6879, class: 'C' as AirspaceClass, radius: 10 },
      { icao: 'KPBI', name: 'Palm Beach International', lat: 26.6832, lon: -80.0956, class: 'C' as AirspaceClass, radius: 10 },
    ]

    for (const airport of majorAirports) {
      const distance = this.haversineDistance(
        location.latitude,
        location.longitude,
        airport.lat,
        airport.lon
      )

      // Convert to nautical miles
      const distanceNm = distance / 1.852

      if (distanceNm <= airport.radius) {
        // Determine ceiling based on distance
        let maxAltitude = 400
        if (distanceNm < 5) {
          maxAltitude = airport.class === 'B' ? 0 : 100
        } else if (distanceNm < 10) {
          maxAltitude = airport.class === 'B' ? 100 : 200
        } else if (distanceNm < 15) {
          maxAltitude = 200
        }

        return {
          name: airport.name,
          icao: airport.icao,
          type: airport.class === 'B' ? 'large_hub' : 'medium',
          airspaceClass: airport.class,
          distance: distance * 3280.84, // km to ft
          maxAltitude,
          laancEnabled: true, // Most major airports support LAANC
        }
      }
    }

    return null
  }

  /**
   * Check for known no-fly zones
   */
  private checkNoFlyZones(location: Coordinates): AirspaceRestriction | null {
    // Known permanent no-fly zones (simplified list)
    const noFlyZones = [
      { name: 'Walt Disney World', lat: 28.3852, lon: -81.5639, radius: 3 },
      { name: 'Kennedy Space Center', lat: 28.5728, lon: -80.6490, radius: 5 },
      { name: 'MacDill AFB', lat: 27.8494, lon: -82.5213, radius: 3 },
    ]

    for (const zone of noFlyZones) {
      const distance = this.haversineDistance(
        location.latitude,
        location.longitude,
        zone.lat,
        zone.lon
      )

      if (distance <= zone.radius) {
        return {
          type: 'sua',
          name: zone.name,
          description: 'Permanent no-fly zone',
          distance_ft: distance * 3280.84,
          affects_operation: true,
        }
      }
    }

    return null
  }

  /**
   * Calculate distance between two points in km
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  /**
   * Qualify a booking location for drone operations
   */
  async qualifyBookingLocation(
    listingId: string,
    address: string,
    coordinates: Coordinates
  ): Promise<BookingAirspaceQualification> {
    const airspaceResult = await this.checkAirspace({
      location: coordinates,
      altitude_ft: DEFAULT_ALTITUDE_FT,
    })

    let estimatedApprovalTime = 'instant'
    if (!airspaceResult.can_fly) {
      estimatedApprovalTime = 'not_available'
    } else if (airspaceResult.needs_authorization) {
      estimatedApprovalTime = airspaceResult.laanc_available ? 'instant' : '24-72 hours'
    }

    let airspaceSummary = `Class ${airspaceResult.airspace_class} airspace`
    if (airspaceResult.max_altitude_ft > 0) {
      airspaceSummary += ` - Clear to fly up to ${airspaceResult.max_altitude_ft}ft`
    }
    if (airspaceResult.needs_authorization) {
      airspaceSummary += ' (authorization required)'
    }

    return {
      listing_id: listingId,
      address,
      coordinates,
      qualified: airspaceResult.can_fly,
      requires_authorization: airspaceResult.needs_authorization,
      laanc_available: airspaceResult.laanc_available,
      estimated_approval_time: estimatedApprovalTime,
      airspace_summary: airspaceSummary,
      warnings: airspaceResult.warnings,
      restrictions: airspaceResult.restrictions,
      checked_at: airspaceResult.checked_at,
    }
  }
}

// Singleton instance
let aloftClient: AloftClient | null = null

/**
 * Get the singleton Aloft client instance
 */
export function getAloftClient(): AloftClient {
  if (!aloftClient) {
    aloftClient = new AloftClient()
  }
  return aloftClient
}

/**
 * Create a new Aloft client with custom configuration
 */
export function createAloftClient(config: Partial<AloftConfig>): AloftClient {
  return new AloftClient(config)
}
