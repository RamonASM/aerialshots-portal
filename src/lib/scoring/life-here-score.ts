// Life Here Score - Composite Score Calculation
// Combines dining, convenience, lifestyle, and commute scores
// with lifestyle profile weighting

import { searchNearbyPlaces, PLACE_CATEGORIES } from '@/lib/integrations/google-places/client'
import type { NearbyPlace } from '@/lib/utils/category-info'
import {
  calculateDiningScore,
  estimateCuisineVariety,
} from './dining-score'
import {
  calculateConvenienceScore,
  identifyPremiumGrocers,
  has24HourPharmacy,
} from './convenience-score'
import { calculateLifestyleScore } from './lifestyle-score'
import {
  calculateCommuteScore,
  CENTRAL_FLORIDA_DESTINATIONS,
} from './commute-score'
import {
  getScoreLabel,
  PROFILE_WEIGHTS,
  type LifeHereScore,
  type LifestyleProfile,
  type DiningScoreInput,
  type ConvenienceScoreInput,
  type LifestyleScoreInput,
  type CommuteScoreInput,
} from './types'

// Re-export types for convenience
export * from './types'
export { calculateDiningScore } from './dining-score'
export { calculateConvenienceScore } from './convenience-score'
export { calculateLifestyleScore } from './lifestyle-score'
export { calculateCommuteScore, CENTRAL_FLORIDA_DESTINATIONS } from './commute-score'

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
 * Estimate drive time based on distance
 * Assumes average speed of 35 mph for urban/suburban
 */
function estimateDriveMinutes(distanceMiles: number): number {
  const avgSpeedMph = 35
  return Math.round((distanceMiles / avgSpeedMph) * 60)
}

/**
 * Find the nearest place from a list
 */
function findNearest(places: NearbyPlace[]): { place: NearbyPlace | null; miles: number } {
  if (places.length === 0) return { place: null, miles: 10 }
  const sorted = [...places].sort((a, b) => (a.distance ?? 10) - (b.distance ?? 10))
  return { place: sorted[0], miles: sorted[0].distance ?? 10 }
}

/**
 * Build dining score input from nearby places
 */
function buildDiningInput(diningPlaces: NearbyPlace[]): DiningScoreInput {
  const ratings = diningPlaces.filter(p => p.rating !== null).map(p => p.rating as number)
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
  const highlyRated = ratings.filter(r => r >= 4.0).length
  const withinHalfMile = diningPlaces.filter(p => (p.distance ?? 10) <= 0.5).length

  // Estimate cuisine variety from types
  const allTypes = diningPlaces.flatMap(p => [p.type])
  const cuisineVariety = estimateCuisineVariety(allTypes)

  return {
    totalRestaurants: diningPlaces.length,
    avgRating,
    highlyRatedCount: highlyRated,
    cuisineVariety,
    withinHalfMile,
  }
}

/**
 * Build convenience score input from nearby places
 */
function buildConvenienceInput(
  shoppingPlaces: NearbyPlace[],
  servicePlaces: NearbyPlace[]
): ConvenienceScoreInput {
  // Find grocery stores (supermarket type)
  const groceryStores = shoppingPlaces.filter(p =>
    p.type.includes('supermarket') || p.type.includes('grocery')
  )
  const nearestGrocery = findNearest(groceryStores)
  const groceryNames = groceryStores.map(p => p.name)
  const premiumGrocers = identifyPremiumGrocers(groceryNames)

  // Find pharmacies
  const pharmacies = servicePlaces.filter(p => p.type.includes('pharmacy'))
  const nearestPharmacy = findNearest(pharmacies)
  const pharmacyData = pharmacies.map(p => ({ name: p.name, isOpen: p.isOpen }))

  // Find banks
  const banks = servicePlaces.filter(p => p.type.includes('bank'))
  const nearestBank = findNearest(banks)

  // Find gas stations
  const gasStations = servicePlaces.filter(p =>
    p.type.includes('gas') || p.type.includes('fuel')
  )
  const nearestGas = findNearest(gasStations)

  return {
    grocery: {
      count: groceryStores.length,
      nearestMiles: nearestGrocery.miles,
      ...premiumGrocers,
    },
    pharmacy: {
      count: pharmacies.length,
      nearestMiles: nearestPharmacy.miles,
      has24Hour: has24HourPharmacy(pharmacyData),
    },
    banking: {
      count: banks.length,
      nearestMiles: nearestBank.miles,
    },
    gas: {
      count: gasStations.length,
      nearestMiles: nearestGas.miles,
    },
  }
}

/**
 * Build lifestyle score input from nearby places
 */
function buildLifestyleInput(
  fitnessPlaces: NearbyPlace[],
  entertainmentPlaces: NearbyPlace[]
): LifestyleScoreInput {
  // Fitness breakdown
  const gyms = fitnessPlaces.filter(p => p.type.includes('gym'))
  const parks = fitnessPlaces.filter(p => p.type.includes('park'))
  const spas = fitnessPlaces.filter(p => p.type.includes('spa'))

  // Entertainment breakdown
  const theaters = entertainmentPlaces.filter(p => p.type.includes('movie_theater'))
  const nightlife = entertainmentPlaces.filter(p =>
    p.type.includes('night_club') || p.type.includes('bar')
  )

  return {
    fitness: {
      gymCount: gyms.length,
      parkCount: parks.length,
      hasRecCenter: fitnessPlaces.some(p =>
        p.name.toLowerCase().includes('recreation') ||
        p.name.toLowerCase().includes('community center')
      ),
      hasYogaStudio: fitnessPlaces.some(p =>
        p.name.toLowerCase().includes('yoga') ||
        p.name.toLowerCase().includes('pilates')
      ) || spas.length > 0,
    },
    entertainment: {
      theaterCount: theaters.length,
      nightlifeCount: nightlife.length,
      bowlingCount: entertainmentPlaces.filter(p =>
        p.name.toLowerCase().includes('bowl')
      ).length,
    },
    sports: {
      golfCount: fitnessPlaces.filter(p =>
        p.name.toLowerCase().includes('golf')
      ).length,
      tennisCount: fitnessPlaces.filter(p =>
        p.name.toLowerCase().includes('tennis')
      ).length,
      poolCount: fitnessPlaces.filter(p =>
        p.name.toLowerCase().includes('pool') ||
        p.name.toLowerCase().includes('aquatic')
      ).length,
    },
  }
}

/**
 * Build commute score input based on location
 */
function buildCommuteInput(lat: number, lng: number): CommuteScoreInput {
  const destinations = CENTRAL_FLORIDA_DESTINATIONS

  // Calculate distances to key destinations
  const mcoDistance = calculateDistance(lat, lng, destinations.mco.lat, destinations.mco.lng)
  const sfbDistance = calculateDistance(lat, lng, destinations.sfb.lat, destinations.sfb.lng)
  const downtownDistance = calculateDistance(
    lat, lng,
    destinations.downtownOrlando.lat,
    destinations.downtownOrlando.lng
  )
  const magicKingdomDistance = calculateDistance(
    lat, lng,
    destinations.magicKingdom.lat,
    destinations.magicKingdom.lng
  )
  const universalDistance = calculateDistance(
    lat, lng,
    destinations.universal.lat,
    destinations.universal.lng
  )

  // Find nearest beach
  const beaches = [
    { key: 'cocoaBeach', ...destinations.cocoaBeach },
    { key: 'daytonaBeach', ...destinations.daytonaBeach },
    { key: 'newSmyrnaBeach', ...destinations.newSmyrnaBeach },
    { key: 'clearwaterBeach', ...destinations.clearwaterBeach },
  ]
  const beachDistances = beaches.map(b => ({
    name: b.name,
    distance: calculateDistance(lat, lng, b.lat, b.lng),
  }))
  const nearestBeach = beachDistances.sort((a, b) => a.distance - b.distance)[0]

  // Estimate highway access (assume ~2 miles average in Central FL)
  const highwayAccessMiles = 2

  return {
    downtownOrlandoMinutes: estimateDriveMinutes(downtownDistance),
    mcoMinutes: estimateDriveMinutes(mcoDistance),
    sfbMinutes: estimateDriveMinutes(sfbDistance),
    nearestBeachMinutes: estimateDriveMinutes(nearestBeach.distance),
    magicKingdomMinutes: estimateDriveMinutes(magicKingdomDistance),
    universalMinutes: estimateDriveMinutes(universalDistance),
    highwayAccessMiles,
  }
}

/**
 * Calculate the complete Life Here Score for a location
 */
export async function calculateLifeHereScore(
  lat: number,
  lng: number,
  profile: LifestyleProfile = 'balanced'
): Promise<LifeHereScore> {
  // Fetch all nearby place data in parallel
  const [diningPlaces, shoppingPlaces, fitnessPlaces, entertainmentPlaces, servicePlaces] =
    await Promise.all([
      searchNearbyPlaces(lat, lng, 'dining', 2500),
      searchNearbyPlaces(lat, lng, 'shopping', 2500),
      searchNearbyPlaces(lat, lng, 'fitness', 2500),
      searchNearbyPlaces(lat, lng, 'entertainment', 2500),
      searchNearbyPlaces(lat, lng, 'services', 2500),
    ])

  // Build inputs from place data
  const diningInput = buildDiningInput(diningPlaces)
  const convenienceInput = buildConvenienceInput(shoppingPlaces, servicePlaces)
  const lifestyleInput = buildLifestyleInput(fitnessPlaces, entertainmentPlaces)
  const commuteInput = buildCommuteInput(lat, lng)

  // Calculate individual scores
  const diningScore = calculateDiningScore(diningInput)
  const convenienceScore = calculateConvenienceScore(convenienceInput)
  const lifestyleScore = calculateLifestyleScore(lifestyleInput)
  const commuteScore = calculateCommuteScore(commuteInput)

  // Calculate weighted overall score based on profile
  const weights = PROFILE_WEIGHTS[profile]
  const overall = Math.round(
    diningScore.score * weights.dining +
    convenienceScore.score * weights.convenience +
    lifestyleScore.score * weights.lifestyle +
    commuteScore.score * weights.commute
  )

  return {
    overall,
    label: getScoreLabel(overall),
    profile,
    dining: diningScore,
    convenience: convenienceScore,
    lifestyle: lifestyleScore,
    commute: commuteScore,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate Life Here Score with pre-fetched place data
 * Use this when you already have the place data from other API calls
 */
export function calculateLifeHereScoreFromData(
  lat: number,
  lng: number,
  placeData: {
    dining: NearbyPlace[]
    shopping: NearbyPlace[]
    fitness: NearbyPlace[]
    entertainment: NearbyPlace[]
    services: NearbyPlace[]
  },
  profile: LifestyleProfile = 'balanced'
): LifeHereScore {
  // Build inputs from provided place data
  const diningInput = buildDiningInput(placeData.dining)
  const convenienceInput = buildConvenienceInput(placeData.shopping, placeData.services)
  const lifestyleInput = buildLifestyleInput(placeData.fitness, placeData.entertainment)
  const commuteInput = buildCommuteInput(lat, lng)

  // Calculate individual scores
  const diningScore = calculateDiningScore(diningInput)
  const convenienceScore = calculateConvenienceScore(convenienceInput)
  const lifestyleScore = calculateLifestyleScore(lifestyleInput)
  const commuteScore = calculateCommuteScore(commuteInput)

  // Calculate weighted overall score based on profile
  const weights = PROFILE_WEIGHTS[profile]
  const overall = Math.round(
    diningScore.score * weights.dining +
    convenienceScore.score * weights.convenience +
    lifestyleScore.score * weights.lifestyle +
    commuteScore.score * weights.commute
  )

  return {
    overall,
    label: getScoreLabel(overall),
    profile,
    dining: diningScore,
    convenience: convenienceScore,
    lifestyle: lifestyleScore,
    commute: commuteScore,
    calculatedAt: new Date().toISOString(),
  }
}
