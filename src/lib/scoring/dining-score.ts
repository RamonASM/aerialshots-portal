// Dining Score Calculation (0-100)
// Evaluates restaurant quantity, quality, variety, and accessibility

import type { DiningScore, DiningScoreInput } from './types'
import { getScoreLabel } from './types'

/**
 * Scoring weights for dining score components
 * Total: 100 points
 */
const WEIGHTS = {
  quantity: 30, // Having enough restaurants nearby
  quality: 30, // High ratings and highly-rated options
  variety: 20, // Diversity of cuisine types
  accessibility: 20, // Walkable options
}

/**
 * Calculate the quantity component (0-30 points)
 * 50+ restaurants = max score
 */
function calculateQuantityScore(totalRestaurants: number): number {
  const maxRestaurants = 50
  const ratio = Math.min(totalRestaurants / maxRestaurants, 1)
  return Math.round(ratio * WEIGHTS.quantity)
}

/**
 * Calculate the quality component (0-30 points)
 * Based on average rating and count of highly-rated restaurants
 */
function calculateQualityScore(avgRating: number, highlyRatedCount: number): number {
  // Average rating contribution (0-20 points)
  // Rating of 4.5+ = max, 3.0 = min
  const ratingMin = 3.0
  const ratingMax = 4.5
  const normalizedRating = Math.max(0, Math.min((avgRating - ratingMin) / (ratingMax - ratingMin), 1))
  const ratingScore = normalizedRating * 20

  // Highly rated bonus (0-10 points)
  // 10+ highly rated restaurants = max
  const maxHighlyRated = 10
  const highlyRatedRatio = Math.min(highlyRatedCount / maxHighlyRated, 1)
  const highlyRatedScore = highlyRatedRatio * 10

  return Math.round(ratingScore + highlyRatedScore)
}

/**
 * Calculate the variety component (0-20 points)
 * 15+ cuisine types = max score
 */
function calculateVarietyScore(cuisineVariety: number): number {
  const maxCuisines = 15
  const ratio = Math.min(cuisineVariety / maxCuisines, 1)
  return Math.round(ratio * WEIGHTS.variety)
}

/**
 * Calculate the accessibility component (0-20 points)
 * Based on walkable options within 0.5 miles
 */
function calculateAccessibilityScore(withinHalfMile: number): number {
  // 15+ walkable restaurants = max score
  const maxWalkable = 15
  const ratio = Math.min(withinHalfMile / maxWalkable, 1)
  return Math.round(ratio * WEIGHTS.accessibility)
}

/**
 * Generate a human-readable description of the dining score
 */
function generateDetails(score: number, input: DiningScoreInput): string {
  const parts: string[] = []

  if (input.totalRestaurants >= 40) {
    parts.push('excellent variety of restaurants')
  } else if (input.totalRestaurants >= 20) {
    parts.push('good selection of restaurants')
  } else if (input.totalRestaurants >= 10) {
    parts.push('moderate dining options')
  } else {
    parts.push('limited restaurant options')
  }

  if (input.avgRating >= 4.2) {
    parts.push('with highly-rated establishments')
  } else if (input.avgRating >= 3.8) {
    parts.push('with good quality options')
  }

  if (input.cuisineVariety >= 10) {
    parts.push(`and ${input.cuisineVariety} different cuisines`)
  }

  if (input.withinHalfMile >= 10) {
    parts.push('many within walking distance')
  }

  return parts.join(', ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * Calculate the complete dining score
 */
export function calculateDiningScore(input: DiningScoreInput): DiningScore {
  const quantityScore = calculateQuantityScore(input.totalRestaurants)
  const qualityScore = calculateQualityScore(input.avgRating, input.highlyRatedCount)
  const varietyScore = calculateVarietyScore(input.cuisineVariety)
  const accessibilityScore = calculateAccessibilityScore(input.withinHalfMile)

  const totalScore = quantityScore + qualityScore + varietyScore + accessibilityScore

  return {
    score: totalScore,
    label: getScoreLabel(totalScore),
    components: {
      quantity: quantityScore,
      quality: qualityScore,
      variety: varietyScore,
      accessibility: accessibilityScore,
    },
    details: generateDetails(totalScore, input),
    restaurantCount: input.totalRestaurants,
    topRestaurants: input.highlyRatedCount,
    cuisineTypes: input.cuisineVariety,
  }
}

/**
 * Estimate cuisine variety from Google Places types
 */
export function estimateCuisineVariety(placeTypes: string[]): number {
  const cuisineTypes = new Set<string>()

  // Common Google Places restaurant types that indicate cuisine variety
  const cuisineKeywords = [
    'american', 'italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian',
    'korean', 'vietnamese', 'greek', 'mediterranean', 'french', 'spanish',
    'brazilian', 'peruvian', 'cuban', 'caribbean', 'middle_eastern', 'african',
    'sushi', 'pizza', 'burger', 'seafood', 'steakhouse', 'barbecue', 'vegetarian',
    'vegan', 'bakery', 'cafe', 'coffee', 'dessert', 'ice_cream', 'brunch',
  ]

  for (const type of placeTypes) {
    const lowerType = type.toLowerCase()
    for (const cuisine of cuisineKeywords) {
      if (lowerType.includes(cuisine)) {
        cuisineTypes.add(cuisine)
      }
    }
    // Also count the type itself if it's specific enough
    if (lowerType.includes('restaurant') && !lowerType.includes('restaurant')) {
      cuisineTypes.add(lowerType)
    }
  }

  // Minimum estimate based on restaurant count
  return Math.max(cuisineTypes.size, Math.floor(placeTypes.length / 5))
}
