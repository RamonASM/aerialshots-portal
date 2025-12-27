// Life Here Data Fetching Utility
// Centralized data fetching for Property and Community pages

import { getWalkScore, type WalkScoreData } from '@/lib/integrations/walkscore/client'
import { getNearbyThemeParks } from '@/lib/integrations/themeparks/client'
import {
  getAirportProximity,
  getBeachProximity,
  getCommuteTimes,
  getCommuteSummary,
} from '@/lib/integrations/distance/client'
import { getDiningData } from '@/lib/integrations/yelp/client'
import { getMoviesData } from '@/lib/integrations/movies/client'
import { getNewsData } from '@/lib/integrations/news/client'

import type {
  ThemeParkWithWaits,
  AirportProximity,
  BeachProximity,
  CommuteDestination,
  DiningData,
  MoviesData,
  NewsData,
} from '@/lib/api/types'

export interface LifeHereScores {
  walkScore: {
    score: number
    description: string
    explanation: string
  } | null
  transitScore: {
    score: number
    description: string
    explanation: string
  } | null
  bikeScore: {
    score: number
    description: string
    explanation: string
  } | null
  overall: {
    score: number
    description: string
  } | null
}

export interface LifeHereCommute {
  airports: AirportProximity | null
  beaches: BeachProximity[]
  destinations: CommuteDestination[]
  summary: {
    nearestHighway: string
    nearestHighwayMiles: number
    downtownOrlandoMinutes: number
    mcoAirportMinutes: number
    nearestBeachMinutes: number
  } | null
}

export interface LifeHereData {
  scores: LifeHereScores | null
  themeparks: ThemeParkWithWaits[]
  commute: LifeHereCommute | null
  dining: DiningData | null
  movies: MoviesData | null
  news: NewsData | null
}

/**
 * Get score explanation based on type and value
 */
function getScoreExplanation(type: 'walk' | 'transit' | 'bike', score: number): string {
  if (type === 'walk') {
    if (score >= 90) return "Daily errands do not require a car - a Walker's Paradise"
    if (score >= 70) return 'Most errands can be accomplished on foot - Very Walkable'
    if (score >= 50) return 'Some errands can be accomplished on foot - Somewhat Walkable'
    if (score >= 25) return 'Most errands require a car - Car-Dependent'
    return 'Almost all errands require a car - Car-Dependent'
  }

  if (type === 'transit') {
    if (score >= 90) return 'Convenient for most trips - Excellent Transit'
    if (score >= 70) return 'Many nearby public transportation options - Excellent Transit'
    if (score >= 50) return 'Many nearby public transportation options - Good Transit'
    if (score >= 25) return 'A few public transportation options - Some Transit'
    return 'Minimal transit options - Minimal Transit'
  }

  // bike
  if (score >= 90) return "Biking is convenient for most trips - Biker's Paradise"
  if (score >= 70) return 'Biking is convenient for most trips - Very Bikeable'
  if (score >= 50) return 'Biking is convenient for some trips - Bikeable'
  return 'Minimal bike infrastructure - Somewhat Bikeable'
}

/**
 * Calculate overall livability score
 */
function calculateOverallScore(
  walkScore: number,
  transitScore?: number,
  bikeScore?: number
): number {
  // Weighted average: Walk 50%, Transit 30%, Bike 20%
  let total = walkScore * 0.5
  let weight = 0.5

  if (transitScore !== undefined) {
    total += transitScore * 0.3
    weight += 0.3
  }

  if (bikeScore !== undefined) {
    total += bikeScore * 0.2
    weight += 0.2
  }

  return Math.round(total / weight)
}

/**
 * Get overall description
 */
function getOverallDescription(score: number): string {
  if (score >= 90) return 'Excellent Livability'
  if (score >= 70) return 'Very Good Livability'
  if (score >= 50) return 'Good Livability'
  if (score >= 25) return 'Moderate Livability'
  return 'Car-Dependent Area'
}

/**
 * Transform Walk Score data to LifeHereScores format
 */
function transformScores(walkScoreData: WalkScoreData | null): LifeHereScores | null {
  if (!walkScoreData) return null

  const overallScore = calculateOverallScore(
    walkScoreData.walkScore,
    walkScoreData.transitScore,
    walkScoreData.bikeScore
  )

  return {
    walkScore: {
      score: walkScoreData.walkScore,
      description: walkScoreData.walkScoreDescription,
      explanation: getScoreExplanation('walk', walkScoreData.walkScore),
    },
    transitScore: walkScoreData.transitScore
      ? {
          score: walkScoreData.transitScore,
          description: walkScoreData.transitScoreDescription || '',
          explanation: getScoreExplanation('transit', walkScoreData.transitScore),
        }
      : null,
    bikeScore: walkScoreData.bikeScore
      ? {
          score: walkScoreData.bikeScore,
          description: walkScoreData.bikeScoreDescription || '',
          explanation: getScoreExplanation('bike', walkScoreData.bikeScore),
        }
      : null,
    overall: {
      score: overallScore,
      description: getOverallDescription(overallScore),
    },
  }
}

/**
 * Fetch all Life Here data for a location
 * Each data source is fetched in parallel with error handling
 */
export async function getLifeHereData(
  lat: number,
  lng: number,
  address?: string
): Promise<LifeHereData> {
  // Fetch all data sources in parallel
  const [
    walkScoreData,
    themeparks,
    airports,
    beaches,
    destinations,
    summary,
    dining,
    movies,
    news,
  ] = await Promise.all([
    getWalkScore(lat, lng, address || 'Property Location').catch((err) => {
      console.error('Error fetching Walk Score:', err)
      return null
    }),
    getNearbyThemeParks(lat, lng, 75).catch((err) => {
      console.error('Error fetching theme parks:', err)
      return []
    }),
    getAirportProximity(lat, lng).catch((err) => {
      console.error('Error fetching airport proximity:', err)
      return null
    }),
    getBeachProximity(lat, lng, 100).catch((err) => {
      console.error('Error fetching beach proximity:', err)
      return []
    }),
    getCommuteTimes(lat, lng).catch((err) => {
      console.error('Error fetching commute times:', err)
      return []
    }),
    getCommuteSummary(lat, lng).catch((err) => {
      console.error('Error fetching commute summary:', err)
      return null
    }),
    getDiningData(lat, lng).catch((err) => {
      console.error('Error fetching dining data:', err)
      return null
    }),
    getMoviesData(lat, lng).catch((err) => {
      console.error('Error fetching movies data:', err)
      return null
    }),
    getNewsData(lat, lng).catch((err) => {
      console.error('Error fetching news data:', err)
      return null
    }),
  ])

  return {
    scores: transformScores(walkScoreData),
    themeparks,
    commute: airports || beaches.length > 0 || destinations.length > 0 || summary
      ? {
          airports,
          beaches,
          destinations,
          summary,
        }
      : null,
    dining,
    movies,
    news,
  }
}

/**
 * Fetch only scores data (lighter weight)
 */
export async function getLifeHereScores(
  lat: number,
  lng: number,
  address?: string
): Promise<LifeHereScores | null> {
  const walkScoreData = await getWalkScore(lat, lng, address || 'Property Location').catch(() => null)
  return transformScores(walkScoreData)
}

/**
 * Fetch only attractions data (theme parks + commute)
 */
export async function getLifeHereAttractions(
  lat: number,
  lng: number
): Promise<{
  themeparks: ThemeParkWithWaits[]
  commute: LifeHereCommute | null
}> {
  const [themeparks, airports, beaches, destinations, summary] = await Promise.all([
    getNearbyThemeParks(lat, lng, 75).catch(() => []),
    getAirportProximity(lat, lng).catch(() => null),
    getBeachProximity(lat, lng, 100).catch(() => []),
    getCommuteTimes(lat, lng).catch(() => []),
    getCommuteSummary(lat, lng).catch(() => null),
  ])

  return {
    themeparks,
    commute: airports || beaches.length > 0 || destinations.length > 0 || summary
      ? { airports, beaches, destinations, summary }
      : null,
  }
}

/**
 * Fetch only dining and entertainment data
 */
export async function getLifeHereEntertainment(
  lat: number,
  lng: number
): Promise<{
  dining: DiningData | null
  movies: MoviesData | null
}> {
  const [dining, movies] = await Promise.all([
    getDiningData(lat, lng).catch(() => null),
    getMoviesData(lat, lng).catch(() => null),
  ])

  return { dining, movies }
}

/**
 * Fetch only news data
 */
export async function getLifeHereNews(
  lat: number,
  lng: number
): Promise<NewsData | null> {
  return getNewsData(lat, lng).catch(() => null)
}
