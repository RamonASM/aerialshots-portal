// Google Distance Matrix Integration
// Provides real-time travel times with traffic consideration

import { CENTRAL_FL_DESTINATIONS, TravelTime, CommuteDestination, AirportProximity } from '@/lib/api/types'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'distance' })

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_PLACES_API_KEY // Reuse existing key

interface DistanceMatrixElement {
  status: string
  duration?: { value: number; text: string }
  duration_in_traffic?: { value: number; text: string }
  distance?: { value: number; text: string }
}

interface DistanceMatrixResponse {
  status: string
  rows: Array<{
    elements: DistanceMatrixElement[]
  }>
  origin_addresses: string[]
  destination_addresses: string[]
}

/**
 * Get travel times from origin to multiple destinations
 */
export async function getDistanceMatrix(
  originLat: number,
  originLng: number,
  destinations: Array<{ lat: number; lng: number; name: string }>
): Promise<Map<string, TravelTime>> {
  if (!GOOGLE_MAPS_API_KEY || destinations.length === 0) {
    return new Map()
  }

  const origin = `${originLat},${originLng}`
  const destString = destinations.map((d) => `${d.lat},${d.lng}`).join('|')

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', origin)
    url.searchParams.set('destinations', destString)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('departure_time', 'now')
    url.searchParams.set('traffic_model', 'best_guess')
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY)

    const response = await fetch(url.toString(), {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      logger.error({ status: response.status }, 'Distance Matrix API error')
      return new Map()
    }

    const data: DistanceMatrixResponse = await response.json()

    if (data.status !== 'OK') {
      logger.error({ apiStatus: data.status }, 'Distance Matrix API returned non-OK status')
      return new Map()
    }

    const results = new Map<string, TravelTime>()
    const elements = data.rows[0]?.elements || []

    destinations.forEach((dest, index) => {
      const element = elements[index]
      if (element?.status === 'OK' && element.distance && element.duration) {
        results.set(dest.name, {
          code: dest.name,
          name: dest.name,
          distanceMiles: Math.round((element.distance.value / 1609.34) * 10) / 10,
          durationMinutes: Math.round(element.duration.value / 60),
          durationWithTraffic: element.duration_in_traffic
            ? Math.round(element.duration_in_traffic.value / 60)
            : Math.round(element.duration.value / 60),
        })
      }
    })

    return results
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error fetching distance matrix')
    return new Map()
  }
}

/**
 * Get airport proximity data
 */
export async function getAirportProximity(
  lat: number,
  lng: number
): Promise<AirportProximity> {
  const airports = [
    { ...CENTRAL_FL_DESTINATIONS.airports.mco, key: 'mco' },
    { ...CENTRAL_FL_DESTINATIONS.airports.sfb, key: 'sfb' },
    { ...CENTRAL_FL_DESTINATIONS.airports.tpa, key: 'tpa' },
  ]

  const distances = await getDistanceMatrix(
    lat,
    lng,
    airports.map((a) => ({ lat: a.lat, lng: a.lng, name: a.name }))
  )

  // Default fallback values using Haversine distance
  const fallback = (airport: typeof airports[0]): TravelTime => {
    const dist = haversineDistance(lat, lng, airport.lat, airport.lng)
    return {
      code: airport.code,
      name: airport.name,
      distanceMiles: Math.round(dist * 10) / 10,
      durationMinutes: Math.round(dist * 1.5), // Rough estimate
      durationWithTraffic: Math.round(dist * 2),
    }
  }

  return {
    mco: distances.get(CENTRAL_FL_DESTINATIONS.airports.mco.name) || fallback(airports[0]),
    sfb: distances.get(CENTRAL_FL_DESTINATIONS.airports.sfb.name) || fallback(airports[1]),
    tpa: distances.get(CENTRAL_FL_DESTINATIONS.airports.tpa.name) || fallback(airports[2]),
  }
}

/**
 * Get beach proximity data
 */
export async function getBeachProximity(
  lat: number,
  lng: number,
  maxDistanceMiles: number = 100
): Promise<Array<{
  name: string
  distanceMiles: number
  durationMinutes: number
  durationWithTraffic: number
  features: string[]
}>> {
  const beaches = Object.entries(CENTRAL_FL_DESTINATIONS.beaches)
    .map(([key, data]) => ({
      ...data,
      key,
    }))
    .filter((beach) => {
      const dist = haversineDistance(lat, lng, beach.lat, beach.lng)
      return dist <= maxDistanceMiles
    })

  if (beaches.length === 0) return []

  const distances = await getDistanceMatrix(
    lat,
    lng,
    beaches.map((b) => ({ lat: b.lat, lng: b.lng, name: b.name }))
  )

  return beaches
    .map((beach) => {
      const travelTime = distances.get(beach.name)
      const dist = haversineDistance(lat, lng, beach.lat, beach.lng)

      return {
        name: beach.name,
        distanceMiles: travelTime?.distanceMiles || Math.round(dist * 10) / 10,
        durationMinutes: travelTime?.durationMinutes || Math.round(dist * 1.5),
        durationWithTraffic: travelTime?.durationWithTraffic || Math.round(dist * 2),
        features: [...beach.features],
      }
    })
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

/**
 * Get commute times to key destinations
 */
export async function getCommuteTimes(
  lat: number,
  lng: number
): Promise<CommuteDestination[]> {
  // Combine all destination types
  const destinations: Array<{
    id: string
    name: string
    type: CommuteDestination['type']
    lat: number
    lng: number
  }> = [
    // Airports
    ...Object.entries(CENTRAL_FL_DESTINATIONS.airports).map(([key, data]) => ({
      id: key,
      name: data.name,
      type: 'airport' as const,
      lat: data.lat,
      lng: data.lng,
    })),
    // Downtown areas
    ...Object.entries(CENTRAL_FL_DESTINATIONS.downtown).map(([key, data]) => ({
      id: key,
      name: data.name,
      type: 'downtown' as const,
      lat: data.lat,
      lng: data.lng,
    })),
    // Theme parks (top 4 only)
    { id: 'magic-kingdom', name: 'Magic Kingdom', type: 'theme_park' as const, lat: 28.4177, lng: -81.5812 },
    { id: 'universal', name: 'Universal Orlando', type: 'theme_park' as const, lat: 28.4752, lng: -81.4664 },
    // Nearest beaches
    { id: 'cocoa-beach', name: 'Cocoa Beach', type: 'beach' as const, lat: 28.3200, lng: -80.6076 },
    { id: 'clearwater', name: 'Clearwater Beach', type: 'beach' as const, lat: 27.9659, lng: -82.8265 },
  ]

  const distances = await getDistanceMatrix(
    lat,
    lng,
    destinations.map((d) => ({ lat: d.lat, lng: d.lng, name: d.name }))
  )

  return destinations.map((dest) => {
    const travelTime = distances.get(dest.name)
    const dist = haversineDistance(lat, lng, dest.lat, dest.lng)

    const durationMinutes = travelTime?.durationMinutes || Math.round(dist * 1.5)
    const durationWithTraffic = travelTime?.durationWithTraffic || Math.round(dist * 2)

    // Determine traffic level
    let trafficLevel: 'light' | 'moderate' | 'heavy' = 'light'
    if (durationWithTraffic > durationMinutes * 1.5) {
      trafficLevel = 'heavy'
    } else if (durationWithTraffic > durationMinutes * 1.2) {
      trafficLevel = 'moderate'
    }

    return {
      id: dest.id,
      name: dest.name,
      type: dest.type,
      distanceMiles: travelTime?.distanceMiles || Math.round(dist * 10) / 10,
      durationMinutes,
      durationWithTraffic,
      trafficLevel,
    }
  }).sort((a, b) => a.distanceMiles - b.distanceMiles)
}

/**
 * Get a summary of commute times
 */
export async function getCommuteSummary(lat: number, lng: number): Promise<{
  nearestHighway: string
  nearestHighwayMiles: number
  downtownOrlandoMinutes: number
  mcoAirportMinutes: number
  nearestBeachMinutes: number
}> {
  const [commutes, beaches] = await Promise.all([
    getCommuteTimes(lat, lng),
    getBeachProximity(lat, lng),
  ])

  const downtown = commutes.find((c) => c.name === 'Downtown Orlando')
  const mco = commutes.find((c) => c.id === 'mco')
  const nearestBeach = beaches[0]

  // Estimate nearest highway (rough approximation)
  // In Central FL, you're typically within 5-10 miles of I-4 or turnpike
  const nearestHighway = 'I-4'
  const nearestHighwayMiles = Math.min(
    haversineDistance(lat, lng, 28.5383, -81.3792), // Downtown Orlando (I-4)
    10 // Cap at 10 miles
  )

  return {
    nearestHighway,
    nearestHighwayMiles: Math.round(nearestHighwayMiles * 10) / 10,
    downtownOrlandoMinutes: downtown?.durationWithTraffic || 30,
    mcoAirportMinutes: mco?.durationWithTraffic || 30,
    nearestBeachMinutes: nearestBeach?.durationWithTraffic || 60,
  }
}

/**
 * Get travel time between two specific points
 */
export async function getTravelTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  destinationName: string = 'Destination'
): Promise<TravelTime | null> {
  const distances = await getDistanceMatrix(
    fromLat,
    fromLng,
    [{ lat: toLat, lng: toLng, name: destinationName }]
  )

  return distances.get(destinationName) || null
}

// Helper function for Haversine distance
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
