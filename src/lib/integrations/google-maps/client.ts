import { createClient } from '@/lib/supabase/server'
import { integrationLogger, formatError } from '@/lib/logger'
import type {
  Coordinates,
  DriveTimeResult,
  DriveTimeMatrix,
  RouteStop,
  OptimizedRoute,
} from './types'

const logger = integrationLogger.child({ integration: 'google-maps' })

const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api'
const CACHE_DURATION_HOURS = 24

/**
 * Calculate drive time between two points
 */
export async function getDriveTime(
  origin: Coordinates | string,
  destination: Coordinates | string,
  departureTime?: Date
): Promise<DriveTimeResult | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured')
      return null
    }

    // Format origin and destination
    const originStr =
      typeof origin === 'string'
        ? origin
        : `${origin.lat},${origin.lng}`
    const destStr =
      typeof destination === 'string'
        ? destination
        : `${destination.lat},${destination.lng}`

    // Check cache first
    if (typeof origin !== 'string' && typeof destination !== 'string') {
      const cached = await getCachedDriveTime(origin, destination)
      if (cached) {
        return {
          originAddress: originStr,
          destinationAddress: destStr,
          distanceMeters: cached.distance_meters,
          distanceText: formatDistance(cached.distance_meters),
          durationSeconds: cached.duration_seconds,
          durationText: formatDuration(cached.duration_seconds),
        }
      }
    }

    // Build URL
    const params = new URLSearchParams({
      origins: originStr,
      destinations: destStr,
      key: apiKey,
      units: 'imperial',
    })

    if (departureTime) {
      params.append('departure_time', Math.floor(departureTime.getTime() / 1000).toString())
      params.append('traffic_model', 'best_guess')
    }

    const response = await fetch(
      `${GOOGLE_MAPS_API_URL}/distancematrix/json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Distance Matrix API error: ${response.status}`)
    }

    const data = await response.json() as DriveTimeMatrix

    if (
      data.rows.length === 0 ||
      data.rows[0].elements.length === 0 ||
      data.rows[0].elements[0].status !== 'OK'
    ) {
      logger.warn({ response: data }, 'No route found')
      return null
    }

    const element = data.rows[0].elements[0]
    const result: DriveTimeResult = {
      originAddress: data.origins[0],
      destinationAddress: data.destinations[0],
      distanceMeters: element.distance!.value,
      distanceText: element.distance!.text,
      durationSeconds: element.duration!.value,
      durationText: element.duration!.text,
    }

    if (element.durationInTraffic) {
      result.durationInTrafficSeconds = element.durationInTraffic.value
      result.durationInTrafficText = element.durationInTraffic.text
    }

    // Cache the result
    if (typeof origin !== 'string' && typeof destination !== 'string') {
      await cacheDriveTime(
        origin,
        destination,
        result.distanceMeters,
        result.durationSeconds
      )
    }

    return result
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Drive time calculation error')
    return null
  }
}

/**
 * Calculate drive times for multiple origin-destination pairs
 */
export async function getDriveTimeMatrix(
  origins: Array<Coordinates | string>,
  destinations: Array<Coordinates | string>,
  departureTime?: Date
): Promise<DriveTimeMatrix | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured')
      return null
    }

    // Format origins and destinations
    const originStrs = origins.map((o) =>
      typeof o === 'string' ? o : `${o.lat},${o.lng}`
    )
    const destStrs = destinations.map((d) =>
      typeof d === 'string' ? d : `${d.lat},${d.lng}`
    )

    // Build URL
    const params = new URLSearchParams({
      origins: originStrs.join('|'),
      destinations: destStrs.join('|'),
      key: apiKey,
      units: 'imperial',
    })

    if (departureTime) {
      params.append('departure_time', Math.floor(departureTime.getTime() / 1000).toString())
      params.append('traffic_model', 'best_guess')
    }

    const response = await fetch(
      `${GOOGLE_MAPS_API_URL}/distancematrix/json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Distance Matrix API error: ${response.status}`)
    }

    const data = await response.json() as DriveTimeMatrix
    return data
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Drive time matrix error')
    return null
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<Coordinates | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured')
      return null
    }

    const params = new URLSearchParams({
      address,
      key: apiKey,
    })

    const response = await fetch(
      `${GOOGLE_MAPS_API_URL}/geocode/json?${params}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.results.length === 0) {
      return null
    }

    const location = data.results[0].geometry.location
    return {
      lat: location.lat,
      lng: location.lng,
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Geocoding error')
    return null
  }
}

/**
 * Optimize route order using nearest neighbor algorithm
 */
export async function optimizeRoute(
  startLocation: Coordinates,
  stops: RouteStop[],
  startTime: Date
): Promise<OptimizedRoute> {
  if (stops.length === 0) {
    return {
      stops: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      estimatedEndTime: startTime,
    }
  }

  if (stops.length === 1) {
    const driveTime = await getDriveTime(startLocation, {
      lat: stops[0].lat,
      lng: stops[0].lng,
    })

    const arrivalTime = new Date(
      startTime.getTime() + (driveTime?.durationSeconds || 0) * 1000
    )
    const departureTime = new Date(
      arrivalTime.getTime() + stops[0].dwellTimeMinutes * 60000
    )

    return {
      stops: [
        {
          ...stops[0],
          arrivalTime,
          departureTime,
        },
      ],
      totalDistanceMeters: driveTime?.distanceMeters || 0,
      totalDurationSeconds:
        (driveTime?.durationSeconds || 0) + stops[0].dwellTimeMinutes * 60,
      estimatedEndTime: departureTime,
    }
  }

  // Get all coordinates for matrix calculation
  const allCoords: Coordinates[] = [
    startLocation,
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
  ]

  // Get distance matrix
  const matrix = await getDriveTimeMatrix(allCoords, allCoords)

  if (!matrix) {
    // Fallback: return original order
    return {
      stops,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      estimatedEndTime: startTime,
    }
  }

  // Build distance/duration matrices
  const n = allCoords.length
  const durations: number[][] = []

  for (let i = 0; i < n; i++) {
    durations[i] = []
    for (let j = 0; j < n; j++) {
      const element = matrix.rows[i]?.elements[j]
      durations[i][j] =
        element?.status === 'OK' ? element.duration?.value || Infinity : Infinity
    }
  }

  // Nearest neighbor algorithm (greedy)
  const visited = new Set<number>([0]) // Start is already visited
  const route: number[] = [0]
  let current = 0

  while (visited.size < n) {
    let nearest = -1
    let nearestDuration = Infinity

    for (let j = 1; j < n; j++) {
      if (!visited.has(j) && durations[current][j] < nearestDuration) {
        nearest = j
        nearestDuration = durations[current][j]
      }
    }

    if (nearest === -1) break

    route.push(nearest)
    visited.add(nearest)
    current = nearest
  }

  // Build optimized route with times
  const optimizedStops: RouteStop[] = []
  let totalDistance = 0
  let totalDuration = 0
  let currentTime = new Date(startTime)
  let prevIdx = 0

  for (let i = 1; i < route.length; i++) {
    const stopIdx = route[i] - 1 // Adjust for start location at index 0
    const stop = stops[stopIdx]
    const driveDuration = durations[prevIdx][route[i]]
    const driveDistance = matrix.rows[prevIdx]?.elements[route[i]]?.distance?.value || 0

    // Calculate arrival time
    const arrivalTime = new Date(currentTime.getTime() + driveDuration * 1000)
    const departureTime = new Date(
      arrivalTime.getTime() + stop.dwellTimeMinutes * 60000
    )

    optimizedStops.push({
      ...stop,
      arrivalTime,
      departureTime,
    })

    totalDistance += driveDistance
    totalDuration += driveDuration + stop.dwellTimeMinutes * 60
    currentTime = departureTime
    prevIdx = route[i]
  }

  return {
    stops: optimizedStops,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
    estimatedEndTime: currentTime,
  }
}

/**
 * Check cache for drive time
 */
async function getCachedDriveTime(
  origin: Coordinates,
  destination: Coordinates
): Promise<{ distance_meters: number; duration_seconds: number } | null> {
  try {
    const supabase = await createClient()

    // Round coordinates to reduce cache misses (about 1km precision)
    const originLat = Math.round(origin.lat * 100) / 100
    const originLng = Math.round(origin.lng * 100) / 100
    const destLat = Math.round(destination.lat * 100) / 100
    const destLng = Math.round(destination.lng * 100) / 100

    const { data } = await supabase
      .from('drive_time_cache')
      .select('distance_meters, duration_seconds')
      .eq('origin_lat', originLat)
      .eq('origin_lng', originLng)
      .eq('destination_lat', destLat)
      .eq('destination_lng', destLng)
      .gt('expires_at', new Date().toISOString())
      .single()

    return data
  } catch {
    return null
  }
}

/**
 * Cache drive time result
 */
async function cacheDriveTime(
  origin: Coordinates,
  destination: Coordinates,
  distanceMeters: number,
  durationSeconds: number
): Promise<void> {
  try {
    const supabase = await createClient()

    // Round coordinates
    const originLat = Math.round(origin.lat * 100) / 100
    const originLng = Math.round(origin.lng * 100) / 100
    const destLat = Math.round(destination.lat * 100) / 100
    const destLng = Math.round(destination.lng * 100) / 100

    const expiresAt = new Date(
      Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000
    )

    await supabase.from('drive_time_cache').upsert(
      {
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng,
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'origin_lat,origin_lng,destination_lat,destination_lng',
      }
    )
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Cache drive time error')
  }
}

/**
 * Format distance in meters to human readable
 */
function formatDistance(meters: number): string {
  const miles = meters / 1609.344
  if (miles < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`
  }
  return `${miles.toFixed(1)} mi`
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  return `${minutes} min`
}
