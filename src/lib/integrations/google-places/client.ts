// Google Places API Client (Places API New)
// Documentation: https://developers.google.com/maps/documentation/places/web-service/nearby-search

import { PLACE_CATEGORIES, type PlaceCategory, type NearbyPlace } from '@/lib/utils/category-info'
import { integrationLogger, formatError } from '@/lib/logger'
import { fetchWithTimeout, FETCH_TIMEOUTS } from '@/lib/utils/fetch-with-timeout'

const logger = integrationLogger.child({ integration: 'google-places' })

// Re-export for convenience
export { PLACE_CATEGORIES, type PlaceCategory, type NearbyPlace }

const PLACES_API_BASE = 'https://places.googleapis.com/v1'

// Places API (New) response types
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
}

interface NearbySearchResponse {
  places?: GooglePlaceNew[]
}

// Calculate distance between two coordinates in miles
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

// Get photo URL from new Places API photo name
function getPhotoUrl(photoName: string, maxWidth = 400): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`
}

// Map price level enum to number
function mapPriceLevel(priceLevel?: string): number | undefined {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 0
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1
    case 'PRICE_LEVEL_MODERATE':
      return 2
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4
    default:
      return undefined
  }
}

// Search for nearby places using Places API (New)
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  category: PlaceCategory,
  radius = 2000 // meters
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    logger.warn('GOOGLE_PLACES_API_KEY not configured')
    return []
  }

  const types = PLACE_CATEGORIES[category]
  const places: NearbyPlace[] = []

  // With the new API, we can search for multiple types at once
  try {
    const requestBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: radius,
        },
      },
      includedTypes: [...types], // Convert readonly tuple to array
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
    }

    const response = await fetchWithTimeout(`${PLACES_API_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.primaryType,places.currentOpeningHours,places.regularOpeningHours,places.photos,places.businessStatus',
      },
      body: JSON.stringify(requestBody),
      timeout: FETCH_TIMEOUTS.DEFAULT,
    })

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`)
    }

    const data: NearbySearchResponse = await response.json()

    if (data.places) {
      for (const place of data.places) {
        // Skip permanently closed places
        if (place.businessStatus === 'CLOSED_PERMANENTLY') continue

        const distance = calculateDistance(
          lat,
          lng,
          place.location.latitude,
          place.location.longitude
        )

        // Determine the type based on primaryType or first matching type
        let placeType = place.primaryType || ''
        if (!placeType && place.types) {
          const matchingType = place.types.find(t =>
            (types as readonly string[]).includes(t)
          )
          placeType = matchingType || place.types[0] || ''
        }

        places.push({
          id: place.id,
          name: place.displayName.text,
          address: place.shortFormattedAddress || place.formattedAddress,
          rating: place.rating ?? null,
          reviewCount: place.userRatingCount ?? 0,
          category,
          type: placeType,
          distance,
          isOpen: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow,
          priceLevel: mapPriceLevel(place.priceLevel),
          photoUrl: place.photos?.[0]
            ? getPhotoUrl(place.photos[0].name)
            : undefined,
        })
      }
    }
  } catch (error) {
    logger.error({ category, ...formatError(error) }, `Error fetching ${category} places`)
  }

  // Sort by rating and return top results
  return places
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8)
}

// Get all nearby places for a location
export async function getAllNearbyPlaces(
  lat: number,
  lng: number
): Promise<Record<PlaceCategory, NearbyPlace[]>> {
  const categories = Object.keys(PLACE_CATEGORIES) as PlaceCategory[]

  const results = await Promise.all(
    categories.map(async (category) => ({
      category,
      places: await searchNearbyPlaces(lat, lng, category),
    }))
  )

  return results.reduce(
    (acc, { category, places }) => {
      acc[category] = places
      return acc
    },
    {} as Record<PlaceCategory, NearbyPlace[]>
  )
}
