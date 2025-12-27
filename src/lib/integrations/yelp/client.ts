// Dining Data Integration
// Uses Google Places API (New) - better pricing and features

import type { Restaurant, DiningData } from '@/lib/api/types'

const PLACES_API_BASE = 'https://places.googleapis.com/v1'

interface GooglePlaceNew {
  id: string
  displayName: {
    text: string
    languageCode: string
  }
  formattedAddress: string
  shortFormattedAddress?: string
  location: {
    latitude: number
    longitude: number
  }
  rating?: number
  userRatingCount?: number
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
  types?: string[]
  primaryType?: string
  primaryTypeDisplayName?: {
    text: string
  }
  currentOpeningHours?: {
    openNow: boolean
  }
  regularOpeningHours?: {
    openNow: boolean
  }
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
  }>
  businessStatus?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  googleMapsUri?: string
}

interface NearbySearchResponse {
  places?: GooglePlaceNew[]
}

// Calculate distance in miles
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

// Get photo URL from new Places API
function getPhotoUrl(photoName: string, maxWidth = 400): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`
}

// Map price level enum to number
function mapPriceLevel(priceLevel?: string): 1 | 2 | 3 | 4 {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1
    case 'PRICE_LEVEL_MODERATE':
      return 2
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4
    default:
      return 2
  }
}

// Map Google types to cuisine categories
function mapTypesToCuisine(types: string[], primaryType?: string): string[] {
  const cuisines: string[] = []

  if (primaryType) {
    // Clean up the primary type for display
    const formatted = primaryType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    cuisines.push(formatted)
  }

  const cuisineTypes = ['restaurant', 'cafe', 'bar', 'bakery', 'coffee_shop', 'fast_food_restaurant', 'fine_dining_restaurant']
  for (const type of types) {
    if (cuisineTypes.includes(type) && !cuisines.includes(type)) {
      const formatted = type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      cuisines.push(formatted)
    }
  }

  return cuisines.slice(0, 3)
}

// Convert new Places API result to Restaurant type
function placeToRestaurant(
  place: GooglePlaceNew,
  originLat: number,
  originLng: number
): Restaurant {
  const distance = calculateDistance(
    originLat,
    originLng,
    place.location.latitude,
    place.location.longitude
  )

  return {
    id: place.id,
    name: place.displayName.text,
    cuisine: mapTypesToCuisine(place.types || [], place.primaryType),
    rating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    priceLevel: mapPriceLevel(place.priceLevel),
    distanceMiles: distance,
    address: place.shortFormattedAddress || place.formattedAddress,
    phone: place.nationalPhoneNumber,
    isOpen: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? true,
    photoUrl: place.photos?.[0]
      ? getPhotoUrl(place.photos[0].name)
      : undefined,
    googleUrl: place.googleMapsUri,
    categories: place.types?.filter(t => !['point_of_interest', 'establishment'].includes(t)) || [],
    highlights: generateHighlights(place),
  }
}

// Generate highlights based on place data
function generateHighlights(place: GooglePlaceNew): string[] {
  const highlights: string[] = []

  if (place.rating && place.rating >= 4.5 && (place.userRatingCount || 0) > 100) {
    highlights.push('Highly Rated')
  }

  if ((place.userRatingCount || 0) > 500) {
    highlights.push('Popular')
  }

  if (place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' || place.priceLevel === 'PRICE_LEVEL_FREE') {
    highlights.push('Budget Friendly')
  } else if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') {
    highlights.push('Fine Dining')
  }

  return highlights.slice(0, 2)
}

/**
 * Search for restaurants using new Places API
 */
async function searchRestaurants(
  lat: number,
  lng: number,
  options: {
    includedTypes?: string[]
    keyword?: string
    radius?: number
    maxResults?: number
  } = {}
): Promise<Restaurant[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not configured')
    return []
  }

  const {
    includedTypes = ['restaurant'],
    keyword,
    radius = 5000,
    maxResults = 20
  } = options

  try {
    const requestBody: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: radius,
        },
      },
      includedTypes,
      maxResultCount: maxResults,
      rankPreference: 'DISTANCE',
    }

    // Add text query if keyword provided
    if (keyword) {
      requestBody.textQuery = keyword
    }

    const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.primaryType,places.primaryTypeDisplayName,places.currentOpeningHours,places.photos,places.businessStatus,places.googleMapsUri,places.nationalPhoneNumber',
      },
      body: JSON.stringify(requestBody),
    })

    const data: NearbySearchResponse = await response.json()

    if (!data.places) {
      return []
    }

    return data.places
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(place => placeToRestaurant(place, lat, lng))
  } catch (error) {
    console.error('Error searching restaurants:', error)
    return []
  }
}

/**
 * Get dining data for a location
 * Returns trending, new openings (high review count), and top rated restaurants
 */
export async function getDiningData(
  lat: number,
  lng: number,
  options: {
    limit?: number
    radius?: number
  } = {}
): Promise<DiningData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not configured - skipping dining data')
    return null
  }

  const { limit = 20, radius = 5000 } = options

  try {
    // Fetch restaurants, cafes, and bars in parallel
    const [restaurants, cafes, bars] = await Promise.all([
      searchRestaurants(lat, lng, { radius, includedTypes: ['restaurant'], maxResults: 20 }),
      searchRestaurants(lat, lng, { radius, includedTypes: ['cafe', 'coffee_shop'], maxResults: 10 }),
      searchRestaurants(lat, lng, { radius, includedTypes: ['bar'], maxResults: 10 }),
    ])

    // Combine and deduplicate
    const allPlaces = [...restaurants, ...cafes, ...bars]
    const uniquePlaces = Array.from(
      new Map(allPlaces.map(p => [p.id, p])).values()
    )

    // Sort by different criteria
    const byRating = [...uniquePlaces]
      .filter(r => r.rating >= 4.0 && r.reviewCount >= 10)
      .sort((a, b) => b.rating - a.rating)

    const byPopularity = [...uniquePlaces]
      .sort((a, b) => b.reviewCount - a.reviewCount)

    // Trending = high ratings + popular
    const trending = byPopularity
      .filter(r => r.rating >= 4.0)
      .slice(0, limit)

    // New openings = lower review count + high rating (proxy for newer places)
    const newOpenings = [...uniquePlaces]
      .filter(r => r.rating >= 4.0 && r.reviewCount >= 5 && r.reviewCount <= 100)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)

    // Top rated
    const topRated = byRating.slice(0, limit)

    // Group by category
    const byCategory: Record<string, Restaurant[]> = {}
    for (const restaurant of uniquePlaces) {
      for (const category of restaurant.categories.slice(0, 2)) {
        if (!byCategory[category]) {
          byCategory[category] = []
        }
        if (byCategory[category].length < 10) {
          byCategory[category].push(restaurant)
        }
      }
    }

    return {
      trending,
      newOpenings,
      topRated,
      byCategory,
    }
  } catch (error) {
    console.error('Error fetching dining data:', error)
    return null
  }
}

/**
 * Search restaurants by keyword/category
 */
export async function searchDining(
  lat: number,
  lng: number,
  query: string,
  options: {
    limit?: number
    radius?: number
  } = {}
): Promise<Restaurant[]> {
  const { limit = 20, radius = 5000 } = options

  // Use text search for keyword queries
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  try {
    const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.primaryType,places.currentOpeningHours,places.photos,places.businessStatus,places.googleMapsUri,places.nationalPhoneNumber',
      },
      body: JSON.stringify({
        textQuery: `${query} restaurants`,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius,
          },
        },
        maxResultCount: limit,
      }),
    })

    const data: NearbySearchResponse = await response.json()

    if (!data.places) return []

    return data.places
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(place => placeToRestaurant(place, lat, lng))
  } catch (error) {
    console.error('Error searching dining:', error)
    return []
  }
}

/**
 * Get restaurant details by place ID
 */
export async function getRestaurantDetails(placeId: string): Promise<Restaurant | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,shortFormattedAddress,location,rating,userRatingCount,priceLevel,types,primaryType,currentOpeningHours,photos,businessStatus,googleMapsUri,nationalPhoneNumber,websiteUri',
      },
    })

    const place: GooglePlaceNew = await response.json()

    if (!place.id) return null

    return {
      id: place.id,
      name: place.displayName.text,
      cuisine: mapTypesToCuisine(place.types || [], place.primaryType),
      rating: place.rating || 0,
      reviewCount: place.userRatingCount || 0,
      priceLevel: mapPriceLevel(place.priceLevel),
      distanceMiles: 0,
      address: place.shortFormattedAddress || place.formattedAddress,
      phone: place.nationalPhoneNumber,
      isOpen: place.currentOpeningHours?.openNow ?? true,
      photoUrl: place.photos?.[0] ? getPhotoUrl(place.photos[0].name) : undefined,
      googleUrl: place.googleMapsUri,
      categories: place.types?.filter(t => !['point_of_interest', 'establishment'].includes(t)) || [],
      highlights: [],
    }
  } catch (error) {
    console.error('Error fetching restaurant details:', error)
    return null
  }
}
