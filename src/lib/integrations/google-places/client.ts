// Google Places API Client
// Documentation: https://developers.google.com/maps/documentation/places/web-service

import { PLACE_CATEGORIES, type PlaceCategory, type NearbyPlace } from '@/lib/utils/category-info'

// Re-export for convenience
export { PLACE_CATEGORIES, type PlaceCategory, type NearbyPlace }

export interface PlaceResult {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  types: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  opening_hours?: {
    open_now: boolean
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  price_level?: number
}

export interface NearbySearchResponse {
  results: PlaceResult[]
  status: string
  next_page_token?: string
}

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place'

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

// Get photo URL from photo reference
function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  return `${GOOGLE_PLACES_API_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`
}

// Search for nearby places
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  category: PlaceCategory,
  radius = 2000 // meters
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.warn('GOOGLE_PLACES_API_KEY not configured')
    return []
  }

  const types = PLACE_CATEGORIES[category]
  const places: NearbyPlace[] = []

  for (const type of types) {
    try {
      const url = new URL(`${GOOGLE_PLACES_API_BASE}/nearbysearch/json`)
      url.searchParams.set('location', `${lat},${lng}`)
      url.searchParams.set('radius', String(radius))
      url.searchParams.set('type', type)
      url.searchParams.set('key', apiKey)

      const response = await fetch(url.toString())
      const data: NearbySearchResponse = await response.json()

      if (data.status === 'OK') {
        for (const place of data.results.slice(0, 5)) {
          places.push({
            id: place.place_id,
            name: place.name,
            address: place.vicinity,
            rating: place.rating ?? null,
            reviewCount: place.user_ratings_total ?? 0,
            category,
            type,
            distance: calculateDistance(
              lat,
              lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            ),
            isOpen: place.opening_hours?.open_now,
            priceLevel: place.price_level,
            photoUrl: place.photos?.[0]
              ? getPhotoUrl(place.photos[0].photo_reference)
              : undefined,
          })
        }
      }
    } catch (error) {
      console.error(`Error fetching ${type} places:`, error)
    }
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
