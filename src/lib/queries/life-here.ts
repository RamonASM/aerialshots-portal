// Life Here Data Fetching Utility
// Centralized data fetching for Property and Community pages
// Uses the new Life Here Score system instead of Walk Score

import { calculateLifeHereScore, type LifeHereScore } from '@/lib/scoring'
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

export interface LifeHereScoreData {
  lifeHereScore: {
    score: number
    label: string
    profile: string
    description: string
  }
  dining: {
    score: number
    label: string
    description: string | undefined
    highlights: {
      restaurantCount: number
      topRated: number
      cuisineTypes: number
    }
  }
  convenience: {
    score: number
    label: string
    description: string | undefined
    highlights: {
      nearestGroceryMiles: number
      has24HourPharmacy: boolean
    }
  }
  lifestyle: {
    score: number
    label: string
    description: string | undefined
    highlights: {
      gymCount: number
      parkCount: number
      entertainmentVenues: number
    }
  }
  commute: {
    score: number
    label: string
    description: string | undefined
    highlights: {
      airportMinutes: number
      beachMinutes: number
      downtownMinutes: number
      themeParkMinutes: number | undefined
    }
  }
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
  scores: LifeHereScoreData | null
  themeparks: ThemeParkWithWaits[]
  commute: LifeHereCommute | null
  dining: DiningData | null
  movies: MoviesData | null
  news: NewsData | null
}

/**
 * Transform Life Here Score to the format expected by LocationScoresCard
 */
function transformScores(lifeHereScore: LifeHereScore | null): LifeHereScoreData | null {
  if (!lifeHereScore) return null

  return {
    lifeHereScore: {
      score: lifeHereScore.overall,
      label: lifeHereScore.label,
      profile: lifeHereScore.profile,
      description: getOverallDescription(lifeHereScore.overall),
    },
    dining: {
      score: lifeHereScore.dining.score,
      label: lifeHereScore.dining.label,
      description: lifeHereScore.dining.details,
      highlights: {
        restaurantCount: lifeHereScore.dining.restaurantCount,
        topRated: lifeHereScore.dining.topRestaurants,
        cuisineTypes: lifeHereScore.dining.cuisineTypes,
      },
    },
    convenience: {
      score: lifeHereScore.convenience.score,
      label: lifeHereScore.convenience.label,
      description: lifeHereScore.convenience.details,
      highlights: {
        nearestGroceryMiles: lifeHereScore.convenience.nearestGroceryMiles,
        has24HourPharmacy: lifeHereScore.convenience.has24HourPharmacy,
      },
    },
    lifestyle: {
      score: lifeHereScore.lifestyle.score,
      label: lifeHereScore.lifestyle.label,
      description: lifeHereScore.lifestyle.details,
      highlights: {
        gymCount: lifeHereScore.lifestyle.gymCount,
        parkCount: lifeHereScore.lifestyle.parkCount,
        entertainmentVenues: lifeHereScore.lifestyle.entertainmentVenues,
      },
    },
    commute: {
      score: lifeHereScore.commute.score,
      label: lifeHereScore.commute.label,
      description: lifeHereScore.commute.details,
      highlights: {
        airportMinutes: lifeHereScore.commute.airportMinutes,
        beachMinutes: lifeHereScore.commute.beachMinutes,
        downtownMinutes: lifeHereScore.commute.downtownMinutes,
        themeParkMinutes: lifeHereScore.commute.themeParkMinutes,
      },
    },
  }
}

/**
 * Get overall description based on score
 */
function getOverallDescription(score: number): string {
  if (score >= 90) return 'Exceptional lifestyle location with outstanding amenities and accessibility'
  if (score >= 70) return 'Excellent lifestyle location with great amenities and good accessibility'
  if (score >= 50) return 'Good lifestyle location with solid amenities and reasonable accessibility'
  if (score >= 30) return 'Moderate lifestyle location with basic amenities'
  return 'Limited amenities in this area - car-dependent lifestyle'
}

/**
 * Fetch all Life Here data for a location
 * Each data source is fetched in parallel with error handling
 */
export async function getLifeHereData(
  lat: number,
  lng: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _address?: string
): Promise<LifeHereData> {
  // Fetch all data sources in parallel
  const [
    lifeHereScore,
    themeparks,
    airports,
    beaches,
    destinations,
    summary,
    dining,
    movies,
    news,
  ] = await Promise.all([
    calculateLifeHereScore(lat, lng, 'balanced').catch((err) => {
      console.error('Error calculating Life Here Score:', err)
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
    scores: transformScores(lifeHereScore),
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
  lng: number
): Promise<LifeHereScoreData | null> {
  const lifeHereScore = await calculateLifeHereScore(lat, lng, 'balanced').catch(() => null)
  return transformScores(lifeHereScore)
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
