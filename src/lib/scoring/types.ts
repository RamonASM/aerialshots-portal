// Life Here Score System Types
// A proprietary scoring system for location lifestyle quality

/**
 * Score labels based on value ranges
 */
export type ScoreLabel = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Limited'

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 90) return 'Exceptional'
  if (score >= 70) return 'Excellent'
  if (score >= 50) return 'Good'
  if (score >= 30) return 'Fair'
  return 'Limited'
}

/**
 * Individual score with breakdown
 */
export interface ScoreBreakdown {
  score: number // 0-100
  label: ScoreLabel
  components: Record<string, number> // Component contributions
  details?: string // Human-readable explanation
}

/**
 * Dining Score (0-100)
 * Based on restaurant quantity, quality, variety, and accessibility
 */
export interface DiningScoreInput {
  totalRestaurants: number // Count within radius
  avgRating: number // Average rating (1-5)
  highlyRatedCount: number // Restaurants >= 4.0 rating
  cuisineVariety: number // Unique cuisine types
  withinHalfMile: number // Walkable options
}

export interface DiningScore extends ScoreBreakdown {
  restaurantCount: number
  topRestaurants: number
  cuisineTypes: number
}

/**
 * Convenience Score (0-100)
 * Based on essential services proximity
 */
export interface ConvenienceScoreInput {
  grocery: {
    count: number
    nearestMiles: number
    hasPublix?: boolean
    hasWholeFoods?: boolean
    hasTraderJoes?: boolean
  }
  pharmacy: {
    count: number
    nearestMiles: number
    has24Hour?: boolean
  }
  banking: {
    count: number
    nearestMiles: number
  }
  gas: {
    count: number
    nearestMiles: number
  }
}

export interface ConvenienceScore extends ScoreBreakdown {
  nearestGroceryMiles: number
  nearestPharmacyMiles: number
  has24HourPharmacy: boolean
}

/**
 * Lifestyle Score (0-100)
 * Based on fitness, entertainment, and recreational options
 */
export interface LifestyleScoreInput {
  fitness: {
    gymCount: number
    parkCount: number
    hasRecCenter?: boolean
    hasYogaStudio?: boolean
  }
  entertainment: {
    theaterCount: number
    nightlifeCount: number
    bowlingCount?: number
  }
  sports: {
    golfCount: number
    tennisCount?: number
    poolCount?: number
  }
}

export interface LifestyleScore extends ScoreBreakdown {
  gymCount: number
  parkCount: number
  entertainmentVenues: number
}

/**
 * Commute Score (0-100) - Central Florida Focused
 * Based on travel times to key destinations
 */
export interface CommuteScoreInput {
  downtownOrlandoMinutes: number
  mcoMinutes: number // Orlando International Airport
  sfbMinutes?: number // Sanford Airport
  nearestBeachMinutes: number
  magicKingdomMinutes?: number
  universalMinutes?: number
  highwayAccessMiles: number
  employmentCenterMinutes?: number
}

export interface CommuteScore extends ScoreBreakdown {
  airportMinutes: number
  beachMinutes: number
  downtownMinutes: number
  themeParkMinutes?: number
}

/**
 * Lifestyle Preference Profiles
 * Different weighting for different buyer types
 */
export type LifestyleProfile = 'balanced' | 'family' | 'professional' | 'active' | 'foodie'

export interface ProfileWeights {
  dining: number
  convenience: number
  lifestyle: number
  commute: number
}

export const PROFILE_WEIGHTS: Record<LifestyleProfile, ProfileWeights> = {
  balanced: { dining: 0.20, convenience: 0.30, lifestyle: 0.20, commute: 0.30 },
  family: { dining: 0.15, convenience: 0.35, lifestyle: 0.25, commute: 0.25 },
  professional: { dining: 0.15, convenience: 0.25, lifestyle: 0.15, commute: 0.45 },
  active: { dining: 0.15, convenience: 0.20, lifestyle: 0.40, commute: 0.25 },
  foodie: { dining: 0.40, convenience: 0.20, lifestyle: 0.20, commute: 0.20 },
}

/**
 * Complete Life Here Score
 */
export interface LifeHereScore {
  overall: number // 0-100 composite score
  label: ScoreLabel
  profile: LifestyleProfile
  dining: DiningScore
  convenience: ConvenienceScore
  lifestyle: LifestyleScore
  commute: CommuteScore
  calculatedAt: string // ISO timestamp
}

/**
 * API Response format for scores endpoint
 */
export interface LifeHereScoreResponse {
  success: boolean
  data: LifeHereScore
  meta: {
    location: { lat: number; lng: number }
    profile: LifestyleProfile
    cached: boolean
    cachedAt?: string
  }
}
