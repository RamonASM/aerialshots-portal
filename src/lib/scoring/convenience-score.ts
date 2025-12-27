// Convenience Score Calculation (0-100)
// Evaluates proximity to essential services: grocery, pharmacy, banking, gas

import type { ConvenienceScore, ConvenienceScoreInput } from './types'
import { getScoreLabel } from './types'

/**
 * Scoring weights for convenience score components
 * Total: 100 points
 */
const WEIGHTS = {
  grocery: 35, // Most important - daily/weekly need
  pharmacy: 25, // Health essentials
  banking: 20, // Financial services
  gas: 20, // Fuel accessibility
}

/**
 * Distance scoring curve
 * Returns 0-1 based on distance in miles
 * Closer = higher score with diminishing returns
 */
function distanceScore(miles: number, optimalMiles: number, maxMiles: number): number {
  if (miles <= optimalMiles) return 1
  if (miles >= maxMiles) return 0
  // Linear decay between optimal and max
  return 1 - (miles - optimalMiles) / (maxMiles - optimalMiles)
}

/**
 * Calculate grocery component (0-35 points)
 * Weighted heavily as most essential
 */
function calculateGroceryScore(grocery: ConvenienceScoreInput['grocery']): number {
  let score = 0

  // Distance score (0-20 points)
  // Optimal: within 1 mile, Max: 5 miles
  const distPoints = distanceScore(grocery.nearestMiles, 1, 5) * 20
  score += distPoints

  // Count bonus (0-10 points)
  // 5+ grocery stores = max
  const countRatio = Math.min(grocery.count / 5, 1)
  score += countRatio * 10

  // Premium store bonus (0-5 points)
  if (grocery.hasPublix) score += 2
  if (grocery.hasWholeFoods) score += 2
  if (grocery.hasTraderJoes) score += 1

  return Math.round(Math.min(score, WEIGHTS.grocery))
}

/**
 * Calculate pharmacy component (0-25 points)
 */
function calculatePharmacyScore(pharmacy: ConvenienceScoreInput['pharmacy']): number {
  let score = 0

  // Distance score (0-15 points)
  // Optimal: within 1 mile, Max: 4 miles
  const distPoints = distanceScore(pharmacy.nearestMiles, 1, 4) * 15
  score += distPoints

  // Count bonus (0-5 points)
  const countRatio = Math.min(pharmacy.count / 3, 1)
  score += countRatio * 5

  // 24-hour bonus (0-5 points)
  if (pharmacy.has24Hour) score += 5

  return Math.round(Math.min(score, WEIGHTS.pharmacy))
}

/**
 * Calculate banking component (0-20 points)
 */
function calculateBankingScore(banking: ConvenienceScoreInput['banking']): number {
  let score = 0

  // Distance score (0-12 points)
  // Optimal: within 1.5 miles, Max: 5 miles
  const distPoints = distanceScore(banking.nearestMiles, 1.5, 5) * 12
  score += distPoints

  // Count bonus (0-8 points)
  // 4+ banks/ATMs = max
  const countRatio = Math.min(banking.count / 4, 1)
  score += countRatio * 8

  return Math.round(Math.min(score, WEIGHTS.banking))
}

/**
 * Calculate gas component (0-20 points)
 */
function calculateGasScore(gas: ConvenienceScoreInput['gas']): number {
  let score = 0

  // Distance score (0-12 points)
  // Optimal: within 1 mile, Max: 4 miles
  const distPoints = distanceScore(gas.nearestMiles, 1, 4) * 12
  score += distPoints

  // Count bonus (0-8 points)
  // Competition = better prices, 4+ stations = max
  const countRatio = Math.min(gas.count / 4, 1)
  score += countRatio * 8

  return Math.round(Math.min(score, WEIGHTS.gas))
}

/**
 * Generate a human-readable description of the convenience score
 */
function generateDetails(score: number, input: ConvenienceScoreInput): string {
  const parts: string[] = []

  // Grocery description
  if (input.grocery.nearestMiles <= 0.5) {
    parts.push('grocery store within walking distance')
  } else if (input.grocery.nearestMiles <= 1.5) {
    parts.push('grocery store nearby')
  } else if (input.grocery.nearestMiles <= 3) {
    parts.push('grocery store accessible')
  } else {
    parts.push('grocery store requires driving')
  }

  // Premium grocery
  const premiumStores: string[] = []
  if (input.grocery.hasPublix) premiumStores.push('Publix')
  if (input.grocery.hasWholeFoods) premiumStores.push('Whole Foods')
  if (input.grocery.hasTraderJoes) premiumStores.push("Trader Joe's")
  if (premiumStores.length > 0) {
    parts.push(`${premiumStores.join(', ')} available`)
  }

  // 24-hour pharmacy
  if (input.pharmacy.has24Hour) {
    parts.push('24-hour pharmacy access')
  }

  // Overall convenience level
  if (score >= 85) {
    parts.unshift('Exceptional convenience:')
  } else if (score >= 70) {
    parts.unshift('Great convenience:')
  } else if (score >= 50) {
    parts.unshift('Good convenience:')
  }

  return parts.join(', ')
}

/**
 * Calculate the complete convenience score
 */
export function calculateConvenienceScore(input: ConvenienceScoreInput): ConvenienceScore {
  const groceryScore = calculateGroceryScore(input.grocery)
  const pharmacyScore = calculatePharmacyScore(input.pharmacy)
  const bankingScore = calculateBankingScore(input.banking)
  const gasScore = calculateGasScore(input.gas)

  const totalScore = groceryScore + pharmacyScore + bankingScore + gasScore

  return {
    score: totalScore,
    label: getScoreLabel(totalScore),
    components: {
      grocery: groceryScore,
      pharmacy: pharmacyScore,
      banking: bankingScore,
      gas: gasScore,
    },
    details: generateDetails(totalScore, input),
    nearestGroceryMiles: input.grocery.nearestMiles,
    nearestPharmacyMiles: input.pharmacy.nearestMiles,
    has24HourPharmacy: input.pharmacy.has24Hour ?? false,
  }
}

/**
 * Helper to identify premium grocery stores from place names
 */
export function identifyPremiumGrocers(placeNames: string[]): {
  hasPublix: boolean
  hasWholeFoods: boolean
  hasTraderJoes: boolean
} {
  const names = placeNames.map((n) => n.toLowerCase())
  return {
    hasPublix: names.some((n) => n.includes('publix')),
    hasWholeFoods: names.some((n) => n.includes('whole foods')),
    hasTraderJoes: names.some((n) => n.includes('trader joe')),
  }
}

/**
 * Helper to identify 24-hour pharmacies from place data
 */
export function has24HourPharmacy(pharmacies: Array<{ name: string; isOpen?: boolean }>): boolean {
  const chains24Hour = ['cvs', 'walgreens']
  return pharmacies.some((p) => {
    const name = p.name.toLowerCase()
    return chains24Hour.some((chain) => name.includes(chain))
  })
}
