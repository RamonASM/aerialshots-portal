// Time to Magic Feature - Central Florida Unique
// Calculates total time from home to first ride at Disney/Universal theme parks

import { CENTRAL_FLORIDA_DESTINATIONS } from '../commute-score'

export interface ParkTiming {
  name: string
  slug: string
  driveMinutes: number
  driveMiles: number
  parkingToGateMinutes: number
  securityMinutes: number
  totalToFirstRide: number
  bestDepartureTime: string
  tips: string[]
}

export interface TimeToMagic {
  magicKingdom: ParkTiming
  epcot: ParkTiming
  hollywoodStudios: ParkTiming
  animalKingdom: ParkTiming
  universalStudios: ParkTiming
  islandsOfAdventure: ParkTiming
  epicUniverse: ParkTiming
  seaworld: ParkTiming
  nearestPark: ParkTiming
  averageTimeToMagic: number
}

// Park-specific constants (average times in minutes)
const PARK_TIMES = {
  magicKingdom: {
    name: 'Magic Kingdom',
    slug: 'magic-kingdom',
    parkingToGate: 20, // TTC + monorail/ferry
    security: 10,
    tips: [
      'Consider the ferry for a scenic experience',
      'Monorail is faster but can be crowded at park opening',
      'Preferred parking saves 10-15 minutes of walking',
    ],
  },
  epcot: {
    name: 'EPCOT',
    slug: 'epcot',
    parkingToGate: 10,
    security: 8,
    tips: [
      'Park near the International Gateway for World Showcase access',
      'Skyliner provides alternative transportation from select resorts',
    ],
  },
  hollywoodStudios: {
    name: 'Hollywood Studios',
    slug: 'hollywood-studios',
    parkingToGate: 8,
    security: 10, // Highest security due to popular attractions
    tips: [
      'Arrive 45+ minutes early for Rise of the Resistance boarding groups',
      'Skyliner connects to EPCOT and Caribbean Beach',
    ],
  },
  animalKingdom: {
    name: 'Animal Kingdom',
    slug: 'animal-kingdom',
    parkingToGate: 8,
    security: 8,
    tips: [
      'Arrive early for best wildlife viewing',
      "Flight of Passage has the longest waits - rope drop recommended",
    ],
  },
  universalStudios: {
    name: 'Universal Studios Florida',
    slug: 'universal-studios',
    parkingToGate: 12, // Parking garage + CityWalk walk
    security: 8,
    tips: [
      'Express Pass saves significant time on busy days',
      'Early Park Admission is worth it for Hagrid and Velocicoaster',
    ],
  },
  islandsOfAdventure: {
    name: 'Islands of Adventure',
    slug: 'islands-of-adventure',
    parkingToGate: 12,
    security: 8,
    tips: [
      'Same parking as Universal Studios',
      'Hogwarts Express connects to Universal Studios (requires park-to-park ticket)',
    ],
  },
  epicUniverse: {
    name: 'Epic Universe',
    slug: 'epic-universe',
    parkingToGate: 10, // New park, estimated
    security: 10,
    tips: [
      'Opening 2025 - Check Universal website for latest updates',
      "New location south of main Universal complex - separate parking",
    ],
  },
  seaworld: {
    name: 'SeaWorld Orlando',
    slug: 'seaworld',
    parkingToGate: 8,
    security: 6,
    tips: [
      'Quick Queue saves time on popular coasters',
      'Less crowded on weekdays',
    ],
  },
}

/**
 * Calculate distance between two coordinates in miles
 */
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

/**
 * Estimate drive time based on distance and typical Orlando traffic
 */
function estimateDriveMinutes(distanceMiles: number): number {
  // Average speed in Orlando area: ~35 mph normal, ~25 mph rush hour
  const avgSpeedMph = 32
  return Math.round((distanceMiles / avgSpeedMph) * 60)
}

/**
 * Get best departure time recommendation
 */
function getBestDepartureTime(totalMinutes: number, parkSlug: string): string {
  // Most parks open at 9am, some have early entry at 8:30am
  const parkOpenHour = parkSlug.includes('universal') ? 9 : 9 // Disney has EMH at 8:30
  const hasEarlyEntry = true // Assume guest has early entry access

  // Aim to arrive 30 min before opening
  const targetArrivalMinutes = hasEarlyEntry ? 30 : 0
  const targetArrivalTime = (parkOpenHour * 60) - targetArrivalMinutes

  // Calculate departure time
  const departureMinutes = targetArrivalTime - totalMinutes

  const hours = Math.floor(departureMinutes / 60)
  const mins = departureMinutes % 60

  return `${hours}:${mins.toString().padStart(2, '0')} AM`
}

/**
 * Calculate park timing details
 */
function calculateParkTiming(
  lat: number,
  lng: number,
  parkKey: keyof typeof PARK_TIMES,
  parkCoords: { lat: number; lng: number }
): ParkTiming {
  const park = PARK_TIMES[parkKey]
  const distanceMiles = calculateDistance(lat, lng, parkCoords.lat, parkCoords.lng)
  const driveMinutes = estimateDriveMinutes(distanceMiles)

  const totalToFirstRide =
    driveMinutes + park.parkingToGate + park.security

  return {
    name: park.name,
    slug: park.slug,
    driveMinutes,
    driveMiles: Math.round(distanceMiles * 10) / 10,
    parkingToGateMinutes: park.parkingToGate,
    securityMinutes: park.security,
    totalToFirstRide,
    bestDepartureTime: getBestDepartureTime(totalToFirstRide, park.slug),
    tips: park.tips,
  }
}

/**
 * Calculate Time to Magic for all major parks
 */
export function calculateTimeToMagic(lat: number, lng: number): TimeToMagic {
  const destinations = CENTRAL_FLORIDA_DESTINATIONS

  // Disney Parks
  const magicKingdom = calculateParkTiming(
    lat, lng,
    'magicKingdom',
    destinations.magicKingdom
  )

  // EPCOT coordinates (slightly different from MK)
  const epcotCoords = { lat: 28.3747, lng: -81.5494 }
  const epcot = calculateParkTiming(lat, lng, 'epcot', epcotCoords)

  // Hollywood Studios
  const hsCoords = { lat: 28.3575, lng: -81.5583 }
  const hollywoodStudios = calculateParkTiming(lat, lng, 'hollywoodStudios', hsCoords)

  // Animal Kingdom
  const akCoords = { lat: 28.3553, lng: -81.5901 }
  const animalKingdom = calculateParkTiming(lat, lng, 'animalKingdom', akCoords)

  // Universal Parks
  const universalStudios = calculateParkTiming(
    lat, lng,
    'universalStudios',
    destinations.universal
  )

  // Islands of Adventure (same location as Universal)
  const islandsOfAdventure = calculateParkTiming(
    lat, lng,
    'islandsOfAdventure',
    destinations.universal
  )

  // Epic Universe (new park location - south of Universal)
  const epicCoords = { lat: 28.4703, lng: -81.5156 }
  const epicUniverse = calculateParkTiming(lat, lng, 'epicUniverse', epicCoords)

  // SeaWorld
  const seaworld = calculateParkTiming(
    lat, lng,
    'seaworld',
    destinations.seaworld
  )

  // Find nearest park
  const allParks = [
    magicKingdom,
    epcot,
    hollywoodStudios,
    animalKingdom,
    universalStudios,
    islandsOfAdventure,
    seaworld,
  ]
  const nearestPark = allParks.reduce((prev, curr) =>
    curr.totalToFirstRide < prev.totalToFirstRide ? curr : prev
  )

  // Calculate average
  const averageTimeToMagic = Math.round(
    allParks.reduce((sum, p) => sum + p.totalToFirstRide, 0) / allParks.length
  )

  return {
    magicKingdom,
    epcot,
    hollywoodStudios,
    animalKingdom,
    universalStudios,
    islandsOfAdventure,
    epicUniverse,
    seaworld,
    nearestPark,
    averageTimeToMagic,
  }
}

/**
 * Get a summary description of Time to Magic
 */
export function getTimeToMagicSummary(ttm: TimeToMagic): string {
  const nearest = ttm.nearestPark
  const mk = ttm.magicKingdom

  if (mk.totalToFirstRide <= 30) {
    return `Premium Disney location! Magic Kingdom in just ${mk.totalToFirstRide} minutes from door to first ride.`
  } else if (mk.totalToFirstRide <= 45) {
    return `Great theme park access. Magic Kingdom is ${mk.totalToFirstRide} minutes away, with ${nearest.name} even closer at ${nearest.totalToFirstRide} minutes.`
  } else if (mk.totalToFirstRide <= 60) {
    return `Good theme park proximity. Your nearest park (${nearest.name}) is ${nearest.totalToFirstRide} minutes away.`
  } else {
    return `Theme parks are accessible within ${ttm.averageTimeToMagic} minutes on average. ${nearest.name} is closest at ${nearest.totalToFirstRide} minutes.`
  }
}

/**
 * Get Time to Magic rating (0-100)
 */
export function getTimeToMagicRating(ttm: TimeToMagic): number {
  const mk = ttm.magicKingdom.totalToFirstRide

  // Scale: 20 min = 100, 90 min = 0
  if (mk <= 20) return 100
  if (mk >= 90) return 0

  return Math.round(100 - ((mk - 20) / 70) * 100)
}
