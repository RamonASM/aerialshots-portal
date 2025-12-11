import { createClient } from '@/lib/supabase/server'
import type { CuratedItem } from '@/lib/utils/category-info'

// Re-export CuratedItem type for convenience
export type { CuratedItem }

// Get curated items near a location
export async function getCuratedItemsNearLocation(
  lat: number,
  lng: number,
  radiusMiles = 10
): Promise<CuratedItem[]> {
  const supabase = await createClient()

  // Calculate bounding box for initial filter
  // 1 degree latitude = 69 miles
  // 1 degree longitude = 69 miles * cos(latitude)
  const latDelta = radiusMiles / 69
  const lngDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180))

  const { data, error } = await supabase
    .from('curated_items')
    .select('*')
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching curated items:', error)
    return []
  }

  // Filter by actual distance using Haversine formula
  return (data as CuratedItem[]).filter((item) => {
    const distance = calculateDistance(lat, lng, item.lat, item.lng)
    return distance <= (item.radius_miles || radiusMiles)
  })
}

// Calculate distance between two points in miles (Haversine formula)
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
