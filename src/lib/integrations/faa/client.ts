// FAA Airspace Check Client
// Checks drone flight eligibility using FAA data sources
// For production: integrate with FAA B4UFLY API or AirMap

import type {
  AirspaceCheckResult,
  AirspaceCheckRequest,
  Airport,
  Restriction,
  NOTAM,
  AirspaceClass,
  FlightStatus,
} from './types'

// Re-export types
export * from './types'

// OpenSky Network API for airport data (free, no key required)
const OPENSKY_API = 'https://opensky-network.org/api'

// Major Florida airports with controlled airspace
const FLORIDA_AIRPORTS: Airport[] = [
  { id: 'MCO', name: 'Orlando International Airport', icao: 'KMCO', iata: 'MCO', latitude: 28.4294, longitude: -81.3089, distance: 0, airspaceClass: 'B', hasTower: true, runways: 4 },
  { id: 'TPA', name: 'Tampa International Airport', icao: 'KTPA', iata: 'TPA', latitude: 27.9755, longitude: -82.5332, distance: 0, airspaceClass: 'B', hasTower: true, runways: 3 },
  { id: 'JAX', name: 'Jacksonville International Airport', icao: 'KJAX', iata: 'JAX', latitude: 30.4941, longitude: -81.6879, distance: 0, airspaceClass: 'C', hasTower: true, runways: 2 },
  { id: 'FLL', name: 'Fort Lauderdale-Hollywood International', icao: 'KFLL', iata: 'FLL', latitude: 26.0726, longitude: -80.1527, distance: 0, airspaceClass: 'B', hasTower: true, runways: 2 },
  { id: 'MIA', name: 'Miami International Airport', icao: 'KMIA', iata: 'MIA', latitude: 25.7959, longitude: -80.2870, distance: 0, airspaceClass: 'B', hasTower: true, runways: 4 },
  { id: 'PBI', name: 'Palm Beach International Airport', icao: 'KPBI', iata: 'PBI', latitude: 26.6832, longitude: -80.0956, distance: 0, airspaceClass: 'C', hasTower: true, runways: 2 },
  { id: 'SFB', name: 'Orlando Sanford International', icao: 'KSFB', iata: 'SFB', latitude: 28.7776, longitude: -81.2375, distance: 0, airspaceClass: 'D', hasTower: true, runways: 2 },
  { id: 'ORL', name: 'Orlando Executive Airport', icao: 'KORL', iata: 'ORL', latitude: 28.5455, longitude: -81.3329, distance: 0, airspaceClass: 'D', hasTower: true, runways: 3 },
  { id: 'DAB', name: 'Daytona Beach International', icao: 'KDAB', iata: 'DAB', latitude: 29.1799, longitude: -81.0581, distance: 0, airspaceClass: 'D', hasTower: true, runways: 2 },
  { id: 'MLB', name: 'Melbourne Orlando International', icao: 'KMLB', iata: 'MLB', latitude: 28.1028, longitude: -80.6453, distance: 0, airspaceClass: 'D', hasTower: true, runways: 2 },
  { id: 'PIE', name: 'St. Pete-Clearwater International', icao: 'KPIE', iata: 'PIE', latitude: 27.9102, longitude: -82.6874, distance: 0, airspaceClass: 'C', hasTower: true, runways: 2 },
  { id: 'RSW', name: 'Southwest Florida International', icao: 'KRSW', iata: 'RSW', latitude: 26.5362, longitude: -81.7552, distance: 0, airspaceClass: 'C', hasTower: true, runways: 2 },
  { id: 'SRQ', name: 'Sarasota-Bradenton International', icao: 'KSRQ', iata: 'SRQ', latitude: 27.3954, longitude: -82.5544, distance: 0, airspaceClass: 'C', hasTower: true, runways: 2 },
]

// Known restricted areas in Florida
const FLORIDA_RESTRICTIONS: Restriction[] = [
  { id: 'WDW', type: 'no_fly_zone', name: 'Walt Disney World', description: 'No-fly zone over Disney theme parks', latitude: 28.3852, longitude: -81.5639, radius: 3, altitudeFloor: 0, altitudeCeiling: 3000 },
  { id: 'USO', type: 'no_fly_zone', name: 'Universal Orlando Resort', description: 'No-fly zone over Universal Studios', latitude: 28.4722, longitude: -81.4686, radius: 3, altitudeFloor: 0, altitudeCeiling: 3000 },
  { id: 'KSC', type: 'military_airspace', name: 'Kennedy Space Center', description: 'Restricted airspace - NASA/Space Force operations', latitude: 28.5731, longitude: -80.6490, radius: 30, altitudeFloor: 0, altitudeCeiling: 60000 },
  { id: 'PAN', type: 'military_airspace', name: 'Patrick Space Force Base', description: 'Military installation restricted airspace', latitude: 28.2347, longitude: -80.6101, radius: 5, altitudeFloor: 0, altitudeCeiling: 10000 },
  { id: 'MAC', type: 'military_airspace', name: 'MacDill Air Force Base', description: 'Military installation restricted airspace', latitude: 27.8493, longitude: -82.5213, radius: 5, altitudeFloor: 0, altitudeCeiling: 10000 },
  { id: 'NAS', type: 'military_airspace', name: 'NAS Jacksonville', description: 'Naval Air Station restricted airspace', latitude: 30.2358, longitude: -81.6761, radius: 5, altitudeFloor: 0, altitudeCeiling: 10000 },
  { id: 'EVG', type: 'national_park', name: 'Everglades National Park', description: 'National Park - drone restrictions apply', latitude: 25.2866, longitude: -80.8987, radius: 15, altitudeFloor: 0, altitudeCeiling: 2000 },
]

// Calculate distance between two coordinates in miles
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate distance in nautical miles
function calculateDistanceNM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return calculateDistance(lat1, lng1, lat2, lng2) * 0.868976
}

// Get nearby airports from local database + optional API
async function getNearbyAirports(
  latitude: number,
  longitude: number,
  radiusMiles: number = 30
): Promise<Airport[]> {
  const nearby: Airport[] = []

  // Check against known airports
  for (const airport of FLORIDA_AIRPORTS) {
    const distance = calculateDistance(
      latitude,
      longitude,
      airport.latitude,
      airport.longitude
    )
    if (distance <= radiusMiles) {
      nearby.push({
        ...airport,
        distance: Math.round(distance * 10) / 10,
      })
    }
  }

  // Sort by distance
  return nearby.sort((a, b) => a.distance - b.distance)
}

// Check for restrictions in the area
function getRestrictions(
  latitude: number,
  longitude: number
): Restriction[] {
  const restrictions: Restriction[] = []

  for (const restriction of FLORIDA_RESTRICTIONS) {
    if (restriction.latitude && restriction.longitude && restriction.radius) {
      const distanceNM = calculateDistanceNM(
        latitude,
        longitude,
        restriction.latitude,
        restriction.longitude
      )
      if (distanceNM <= restriction.radius) {
        restrictions.push(restriction)
      }
    }
  }

  return restrictions
}

// Determine airspace class based on nearby airports
function determineAirspaceClass(airports: Airport[]): AirspaceClass {
  if (airports.length === 0) return 'G' // Uncontrolled

  const closest = airports[0]

  // Class B airspace typically extends to 30nm from major airports
  if (closest.airspaceClass === 'B' && closest.distance <= 30) {
    return 'B'
  }

  // Class C typically extends to 10nm
  if (closest.airspaceClass === 'C' && closest.distance <= 10) {
    return 'C'
  }

  // Class D typically extends to 4nm
  if (closest.airspaceClass === 'D' && closest.distance <= 5) {
    return 'D'
  }

  // Class E starts at surface at some airports, otherwise at 700/1200ft AGL
  if (closest.distance <= 10) {
    return 'E'
  }

  return 'G'
}

// Determine flight status based on all factors
function determineFlightStatus(
  airspaceClass: AirspaceClass,
  airports: Airport[],
  restrictions: Restriction[]
): FlightStatus {
  // Check for absolute no-fly zones
  const noFlyRestrictions = restrictions.filter(
    r => r.type === 'no_fly_zone' || r.type === 'military_airspace'
  )
  if (noFlyRestrictions.length > 0) {
    return 'prohibited'
  }

  // Check for national parks or other restricted areas
  const restrictedAreas = restrictions.filter(
    r => r.type === 'national_park' || r.type === 'temporary_flight_restriction'
  )
  if (restrictedAreas.length > 0) {
    return 'restricted'
  }

  // Check airport proximity
  const closestAirport = airports[0]
  if (closestAirport) {
    // Within 5 miles of airport with Class B/C airspace
    if (
      closestAirport.distance <= 5 &&
      (closestAirport.airspaceClass === 'B' || closestAirport.airspaceClass === 'C')
    ) {
      return 'restricted'
    }
    // Within controlled airspace
    if (airspaceClass !== 'G') {
      return 'caution'
    }
  }

  return 'clear'
}

// Generate advisories based on conditions
function generateAdvisories(
  airspaceClass: AirspaceClass,
  airports: Airport[],
  restrictions: Restriction[]
): string[] {
  const advisories: string[] = []

  // Airspace advisories
  if (airspaceClass === 'B') {
    advisories.push('Class B airspace - LAANC authorization required before flight')
  } else if (airspaceClass === 'C') {
    advisories.push('Class C airspace - LAANC authorization required before flight')
  } else if (airspaceClass === 'D') {
    advisories.push('Class D airspace - LAANC or ATC authorization required')
  } else if (airspaceClass === 'E') {
    advisories.push('Class E airspace - LAANC authorization may be required above certain altitudes')
  }

  // Airport proximity
  const closestAirport = airports[0]
  if (closestAirport && closestAirport.distance <= 5) {
    advisories.push(
      `${closestAirport.name} is ${closestAirport.distance} miles away - maintain visual awareness of aircraft`
    )
  }

  // Restriction advisories
  for (const restriction of restrictions) {
    if (restriction.type === 'no_fly_zone') {
      advisories.push(`NO FLY ZONE: ${restriction.name} - ${restriction.description}`)
    } else if (restriction.type === 'military_airspace') {
      advisories.push(`MILITARY AIRSPACE: ${restriction.name} - Flying prohibited`)
    } else if (restriction.type === 'national_park') {
      advisories.push(`NATIONAL PARK: ${restriction.name} - Special permit may be required`)
    } else if (restriction.type === 'stadium') {
      advisories.push(`STADIUM TFR: No drone flights within 3nm during events`)
    }
  }

  // General advisories
  advisories.push('Maximum altitude: 400ft AGL unless within 400ft of a structure')
  advisories.push('Maintain visual line of sight at all times')
  advisories.push('Yield right of way to all manned aircraft')

  return advisories
}

// Determine authorization requirements
function getAuthorizationRequirements(
  airspaceClass: AirspaceClass,
  restrictions: Restriction[]
): AirspaceCheckResult['authorization'] {
  const noFlyRestrictions = restrictions.filter(
    r => r.type === 'no_fly_zone' || r.type === 'military_airspace'
  )

  if (noFlyRestrictions.length > 0) {
    return {
      required: true,
      type: 'waiver',
      instructions: 'Flight not permitted in this area. Special waiver from FAA required.',
    }
  }

  if (airspaceClass === 'B' || airspaceClass === 'C' || airspaceClass === 'D') {
    return {
      required: true,
      type: 'LAANC',
      instructions: 'Use LAANC (Low Altitude Authorization and Notification Capability) via apps like Aloft, AirMap, or DJI Fly to request authorization before flight.',
    }
  }

  if (airspaceClass === 'E') {
    return {
      required: false,
      instructions: 'Class E airspace - authorization not typically required below 400ft AGL, but check for any temporary restrictions.',
    }
  }

  return {
    required: false,
    instructions: 'Class G airspace - no authorization required. Follow all Part 107 rules.',
  }
}

// Main airspace check function
export async function checkAirspace(
  request: AirspaceCheckRequest
): Promise<AirspaceCheckResult> {
  const { latitude, longitude, address, altitude = 400 } = request

  // Get nearby airports
  const nearbyAirports = await getNearbyAirports(latitude, longitude)

  // Get restrictions
  const restrictions = getRestrictions(latitude, longitude)

  // Determine airspace class
  const airspaceClass = determineAirspaceClass(nearbyAirports)

  // Determine flight status
  const status = determineFlightStatus(airspaceClass, nearbyAirports, restrictions)

  // Generate advisories
  const advisories = generateAdvisories(airspaceClass, nearbyAirports, restrictions)

  // Get authorization requirements
  const authorization = getAuthorizationRequirements(airspaceClass, restrictions)

  // Can we fly?
  const canFly = status === 'clear' || status === 'caution'

  // Calculate max altitude based on airspace
  let maxAltitude = 400 // Default Part 107 limit
  if (airspaceClass === 'B') {
    maxAltitude = 0 // Requires LAANC approval for any altitude
  } else if (airspaceClass === 'C' && nearbyAirports[0]?.distance <= 5) {
    maxAltitude = 0 // Requires LAANC
  } else if (airspaceClass === 'D' && nearbyAirports[0]?.distance <= 4) {
    maxAltitude = 0 // Requires LAANC
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  return {
    canFly,
    status,
    airspaceClass,
    maxAltitude,
    nearbyAirports: nearbyAirports.slice(0, 5), // Top 5 closest
    restrictions,
    notams: [], // Would come from FAA NOTAM API
    advisories,
    authorization,
    checkedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    coordinates: { latitude, longitude },
    address,
  }
}

// Helper to get a simple yes/no answer
export async function canFlyDrone(
  latitude: number,
  longitude: number
): Promise<{ canFly: boolean; reason: string }> {
  const result = await checkAirspace({ latitude, longitude })

  if (result.canFly) {
    if (result.authorization.required) {
      return {
        canFly: true,
        reason: `Drone flight possible with ${result.authorization.type} authorization`,
      }
    }
    return {
      canFly: true,
      reason: 'Clear to fly - follow Part 107 rules',
    }
  }

  const mainRestriction = result.restrictions[0]
  return {
    canFly: false,
    reason: mainRestriction
      ? `Restricted: ${mainRestriction.name}`
      : 'Flight not permitted in this airspace',
  }
}
