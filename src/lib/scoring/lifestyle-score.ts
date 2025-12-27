// Lifestyle Score Calculation (0-100)
// Evaluates fitness, entertainment, and recreational options

import type { LifestyleScore, LifestyleScoreInput } from './types'
import { getScoreLabel } from './types'

/**
 * Scoring weights for lifestyle score components
 * Total: 100 points
 */
const WEIGHTS = {
  fitness: 40, // Gyms, parks, recreation centers
  entertainment: 35, // Theaters, nightlife, bowling
  sports: 25, // Golf, tennis, pools
}

/**
 * Calculate fitness & recreation component (0-40 points)
 */
function calculateFitnessScore(fitness: LifestyleScoreInput['fitness']): number {
  let score = 0

  // Gym availability (0-15 points)
  // 5+ gyms = max
  const gymRatio = Math.min(fitness.gymCount / 5, 1)
  score += gymRatio * 15

  // Park availability (0-15 points)
  // 5+ parks = max (important for outdoor activities)
  const parkRatio = Math.min(fitness.parkCount / 5, 1)
  score += parkRatio * 15

  // Recreation center bonus (0-5 points)
  if (fitness.hasRecCenter) score += 5

  // Yoga/Pilates studio bonus (0-5 points)
  if (fitness.hasYogaStudio) score += 5

  return Math.round(Math.min(score, WEIGHTS.fitness))
}

/**
 * Calculate entertainment component (0-35 points)
 */
function calculateEntertainmentScore(entertainment: LifestyleScoreInput['entertainment']): number {
  let score = 0

  // Movie theaters (0-15 points)
  // 3+ theaters = max
  const theaterRatio = Math.min(entertainment.theaterCount / 3, 1)
  score += theaterRatio * 15

  // Nightlife options (0-15 points)
  // 8+ bars/clubs = max
  const nightlifeRatio = Math.min(entertainment.nightlifeCount / 8, 1)
  score += nightlifeRatio * 15

  // Bowling/activity centers (0-5 points)
  if (entertainment.bowlingCount && entertainment.bowlingCount > 0) {
    score += Math.min(entertainment.bowlingCount, 2) * 2.5
  }

  return Math.round(Math.min(score, WEIGHTS.entertainment))
}

/**
 * Calculate sports & activities component (0-25 points)
 */
function calculateSportsScore(sports: LifestyleScoreInput['sports']): number {
  let score = 0

  // Golf courses (0-10 points) - Florida staple
  // 3+ courses = max
  const golfRatio = Math.min(sports.golfCount / 3, 1)
  score += golfRatio * 10

  // Tennis courts (0-8 points)
  if (sports.tennisCount) {
    const tennisRatio = Math.min(sports.tennisCount / 3, 1)
    score += tennisRatio * 8
  }

  // Pools/aquatic centers (0-7 points)
  if (sports.poolCount) {
    const poolRatio = Math.min(sports.poolCount / 2, 1)
    score += poolRatio * 7
  }

  return Math.round(Math.min(score, WEIGHTS.sports))
}

/**
 * Generate a human-readable description of the lifestyle score
 */
function generateDetails(score: number, input: LifestyleScoreInput): string {
  const highlights: string[] = []

  // Fitness highlights
  if (input.fitness.gymCount >= 3) {
    highlights.push(`${input.fitness.gymCount} gyms nearby`)
  }
  if (input.fitness.parkCount >= 3) {
    highlights.push(`${input.fitness.parkCount} parks`)
  }
  if (input.fitness.hasRecCenter) {
    highlights.push('community recreation center')
  }

  // Entertainment highlights
  if (input.entertainment.theaterCount >= 2) {
    highlights.push(`${input.entertainment.theaterCount} movie theaters`)
  }
  if (input.entertainment.nightlifeCount >= 5) {
    highlights.push('vibrant nightlife')
  }

  // Sports highlights
  if (input.sports.golfCount >= 2) {
    highlights.push(`${input.sports.golfCount} golf courses`)
  }

  // Build description
  let prefix = ''
  if (score >= 85) {
    prefix = 'Outstanding lifestyle amenities: '
  } else if (score >= 70) {
    prefix = 'Excellent lifestyle options: '
  } else if (score >= 50) {
    prefix = 'Good lifestyle amenities: '
  } else if (score >= 30) {
    prefix = 'Basic lifestyle options: '
  } else {
    prefix = 'Limited lifestyle amenities: '
  }

  if (highlights.length === 0) {
    return prefix + 'standard neighborhood amenities'
  }

  return prefix + highlights.slice(0, 3).join(', ')
}

/**
 * Calculate the complete lifestyle score
 */
export function calculateLifestyleScore(input: LifestyleScoreInput): LifestyleScore {
  const fitnessScore = calculateFitnessScore(input.fitness)
  const entertainmentScore = calculateEntertainmentScore(input.entertainment)
  const sportsScore = calculateSportsScore(input.sports)

  const totalScore = fitnessScore + entertainmentScore + sportsScore

  return {
    score: totalScore,
    label: getScoreLabel(totalScore),
    components: {
      fitness: fitnessScore,
      entertainment: entertainmentScore,
      sports: sportsScore,
    },
    details: generateDetails(totalScore, input),
    gymCount: input.fitness.gymCount,
    parkCount: input.fitness.parkCount,
    entertainmentVenues: input.entertainment.theaterCount + input.entertainment.nightlifeCount,
  }
}

/**
 * Helper to categorize place types into lifestyle categories
 */
export function categorizePlaceForLifestyle(
  placeType: string
): 'fitness' | 'entertainment' | 'sports' | null {
  const type = placeType.toLowerCase()

  const fitnessTypes = ['gym', 'fitness_center', 'park', 'yoga', 'pilates', 'spa', 'recreation_center']
  const entertainmentTypes = [
    'movie_theater',
    'night_club',
    'bar',
    'bowling_alley',
    'amusement_center',
    'casino',
    'comedy_club',
  ]
  const sportsTypes = ['golf_course', 'tennis_court', 'swimming_pool', 'sports_club', 'stadium']

  if (fitnessTypes.some((t) => type.includes(t))) return 'fitness'
  if (entertainmentTypes.some((t) => type.includes(t))) return 'entertainment'
  if (sportsTypes.some((t) => type.includes(t))) return 'sports'

  return null
}
