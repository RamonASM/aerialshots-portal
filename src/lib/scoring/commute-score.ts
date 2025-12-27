// Commute Score Calculation (0-100)
// Central Florida focused - airports, beaches, theme parks, downtown

import type { CommuteScore, CommuteScoreInput } from './types'
import { getScoreLabel } from './types'

/**
 * Scoring weights for commute score components
 * Total: 100 points
 * Central Florida specific weighting
 */
const WEIGHTS = {
  highway: 15, // Quick highway access
  downtown: 15, // Downtown Orlando access
  airport: 20, // MCO + SFB access
  beach: 25, // Unique to Florida - both coasts!
  themePark: 15, // The differentiator - Disney/Universal
  employment: 10, // General employment centers
}

/**
 * Time scoring curve
 * Returns 0-1 based on drive time in minutes
 * Shorter = higher score
 */
function timeScore(minutes: number, optimalMinutes: number, maxMinutes: number): number {
  if (minutes <= optimalMinutes) return 1
  if (minutes >= maxMinutes) return 0
  return 1 - (minutes - optimalMinutes) / (maxMinutes - optimalMinutes)
}

/**
 * Calculate highway access component (0-15 points)
 */
function calculateHighwayScore(highwayAccessMiles: number): number {
  // Optimal: within 1 mile, Max: 5 miles
  if (highwayAccessMiles <= 1) return WEIGHTS.highway
  if (highwayAccessMiles >= 5) return 0
  const ratio = 1 - (highwayAccessMiles - 1) / 4
  return Math.round(ratio * WEIGHTS.highway)
}

/**
 * Calculate downtown Orlando component (0-15 points)
 */
function calculateDowntownScore(downtownOrlandoMinutes: number): number {
  // Optimal: 20 min or less, Max: 60 min
  const score = timeScore(downtownOrlandoMinutes, 20, 60)
  return Math.round(score * WEIGHTS.downtown)
}

/**
 * Calculate airport component (0-20 points)
 * MCO is primary, SFB is secondary
 */
function calculateAirportScore(mcoMinutes: number, sfbMinutes?: number): number {
  // MCO score (0-15 points) - primary airport
  // Optimal: 25 min, Max: 60 min
  const mcoScore = timeScore(mcoMinutes, 25, 60) * 15

  // SFB bonus (0-5 points) - if closer than MCO
  let sfbBonus = 0
  if (sfbMinutes && sfbMinutes < mcoMinutes) {
    sfbBonus = timeScore(sfbMinutes, 20, 45) * 5
  }

  return Math.round(mcoScore + sfbBonus)
}

/**
 * Calculate beach access component (0-25 points)
 * THE Florida differentiator - access to both coasts is premium
 */
function calculateBeachScore(nearestBeachMinutes: number): number {
  // Optimal: 45 min or less, Max: 120 min (2 hours)
  const score = timeScore(nearestBeachMinutes, 45, 120)
  return Math.round(score * WEIGHTS.beach)
}

/**
 * Calculate theme park component (0-15 points)
 * Unique to Central Florida - Magic Kingdom & Universal
 */
function calculateThemeParkScore(
  magicKingdomMinutes?: number,
  universalMinutes?: number
): number {
  if (!magicKingdomMinutes && !universalMinutes) return 0

  // Use the closer park
  const closerParkMinutes = Math.min(
    magicKingdomMinutes ?? Infinity,
    universalMinutes ?? Infinity
  )

  // Optimal: 25 min, Max: 60 min
  const score = timeScore(closerParkMinutes, 25, 60)
  return Math.round(score * WEIGHTS.themePark)
}

/**
 * Calculate employment center component (0-10 points)
 */
function calculateEmploymentScore(employmentCenterMinutes?: number): number {
  if (!employmentCenterMinutes) {
    // Default to a moderate score if not provided
    return Math.round(WEIGHTS.employment * 0.5)
  }
  // Optimal: 20 min, Max: 45 min
  const score = timeScore(employmentCenterMinutes, 20, 45)
  return Math.round(score * WEIGHTS.employment)
}

/**
 * Generate a human-readable description of the commute score
 */
function generateDetails(score: number, input: CommuteScoreInput): string {
  const highlights: string[] = []

  // Airport access
  if (input.mcoMinutes <= 25) {
    highlights.push(`MCO airport ${input.mcoMinutes} min away`)
  } else if (input.mcoMinutes <= 40) {
    highlights.push(`MCO ${input.mcoMinutes} min`)
  }

  // Beach access
  if (input.nearestBeachMinutes <= 45) {
    highlights.push(`beach in ${input.nearestBeachMinutes} min`)
  } else if (input.nearestBeachMinutes <= 60) {
    highlights.push(`beach ~1 hour`)
  }

  // Theme parks
  if (input.magicKingdomMinutes && input.magicKingdomMinutes <= 30) {
    highlights.push(`Disney ${input.magicKingdomMinutes} min`)
  }
  if (input.universalMinutes && input.universalMinutes <= 30) {
    highlights.push(`Universal ${input.universalMinutes} min`)
  }

  // Downtown
  if (input.downtownOrlandoMinutes <= 20) {
    highlights.push('quick downtown access')
  }

  // Build description
  let prefix = ''
  if (score >= 85) {
    prefix = 'Outstanding commute options: '
  } else if (score >= 70) {
    prefix = 'Excellent accessibility: '
  } else if (score >= 50) {
    prefix = 'Good transportation access: '
  } else {
    prefix = 'Moderate commute times: '
  }

  if (highlights.length === 0) {
    return prefix + 'suburban location with highway access'
  }

  return prefix + highlights.slice(0, 3).join(', ')
}

/**
 * Calculate the complete commute score
 */
export function calculateCommuteScore(input: CommuteScoreInput): CommuteScore {
  const highwayScore = calculateHighwayScore(input.highwayAccessMiles)
  const downtownScore = calculateDowntownScore(input.downtownOrlandoMinutes)
  const airportScore = calculateAirportScore(input.mcoMinutes, input.sfbMinutes)
  const beachScore = calculateBeachScore(input.nearestBeachMinutes)
  const themeParkScore = calculateThemeParkScore(
    input.magicKingdomMinutes,
    input.universalMinutes
  )
  const employmentScore = calculateEmploymentScore(input.employmentCenterMinutes)

  const totalScore =
    highwayScore + downtownScore + airportScore + beachScore + themeParkScore + employmentScore

  return {
    score: totalScore,
    label: getScoreLabel(totalScore),
    components: {
      highway: highwayScore,
      downtown: downtownScore,
      airport: airportScore,
      beach: beachScore,
      themePark: themeParkScore,
      employment: employmentScore,
    },
    details: generateDetails(totalScore, input),
    airportMinutes: input.mcoMinutes,
    beachMinutes: input.nearestBeachMinutes,
    downtownMinutes: input.downtownOrlandoMinutes,
    themeParkMinutes: input.magicKingdomMinutes ?? input.universalMinutes,
  }
}

/**
 * Central Florida key destinations with coordinates
 * For use with Google Distance Matrix API
 */
export const CENTRAL_FLORIDA_DESTINATIONS = {
  // Airports
  mco: { lat: 28.4312, lng: -81.3081, name: 'Orlando International Airport (MCO)' },
  sfb: { lat: 28.7775, lng: -81.2375, name: 'Orlando Sanford Airport (SFB)' },

  // Downtown
  downtownOrlando: { lat: 28.5383, lng: -81.3792, name: 'Downtown Orlando' },

  // Theme Parks
  magicKingdom: { lat: 28.4177, lng: -81.5812, name: 'Magic Kingdom' },
  universal: { lat: 28.4722, lng: -81.4686, name: 'Universal Studios' },
  seaworld: { lat: 28.4111, lng: -81.4612, name: 'SeaWorld Orlando' },

  // Beaches (nearest points)
  cocoaBeach: { lat: 28.3200, lng: -80.6076, name: 'Cocoa Beach' },
  daytonaBeach: { lat: 29.2108, lng: -81.0228, name: 'Daytona Beach' },
  newSmyrnaBeach: { lat: 29.0258, lng: -80.9270, name: 'New Smyrna Beach' },
  clearwaterBeach: { lat: 27.9659, lng: -82.8265, name: 'Clearwater Beach' },

  // Employment Centers
  lakeMaryHeathrow: { lat: 28.7589, lng: -81.3178, name: 'Lake Mary/Heathrow' },
  internationalDrive: { lat: 28.4533, lng: -81.4701, name: 'International Drive' },
  researchParkway: { lat: 28.5987, lng: -81.1995, name: 'Research Park' },
} as const

export type DestinationKey = keyof typeof CENTRAL_FLORIDA_DESTINATIONS
