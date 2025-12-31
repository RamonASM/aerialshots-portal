// Theme Parks Integration - Real-time wait times and park data
// Uses ThemeParks.wiki API (free, no key required)

import { CENTRAL_FL_DESTINATIONS, ThemeParkWithWaits, RideWaitTime } from '@/lib/api/types'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'themeparks' })

const THEMEPARKS_API_BASE = 'https://api.themeparks.wiki/v1'

// Park IDs for ThemeParks.wiki API
const PARK_IDS: Record<string, string> = {
  'magic-kingdom': 'waltdisneyworldresort_magickingdom',
  'epcot': 'waltdisneyworldresort_epcot',
  'hollywood-studios': 'waltdisneyworldresort_hollywoodstudios',
  'animal-kingdom': 'waltdisneyworldresort_animalkingdom',
  'universal-studios': 'universalorlando_universalstudiosflorida',
  'islands-of-adventure': 'universalorlando_islandsofadventure',
  'seaworld': 'seaworldentertainment_seaworldorlando',
  'busch-gardens': 'seaworldentertainment_buschgardenstampabay',
}

// Top rides per park (the ones people care about most)
const TOP_RIDES: Record<string, string[]> = {
  'magic-kingdom': [
    'Space Mountain',
    'Big Thunder Mountain Railroad',
    'Splash Mountain', // Now Tiana's Bayou Adventure
    'Seven Dwarfs Mine Train',
    'Haunted Mansion',
    'Pirates of the Caribbean',
    'Jungle Cruise',
    "It's a Small World",
    'TRON Lightcycle Run',
    'Peter Pan\'s Flight',
  ],
  'epcot': [
    'Guardians of the Galaxy: Cosmic Rewind',
    'Test Track',
    'Frozen Ever After',
    'Remy\'s Ratatouille Adventure',
    'Soarin\' Around the World',
    'Spaceship Earth',
    'Mission: SPACE',
    'Journey Into Imagination',
  ],
  'hollywood-studios': [
    'Star Wars: Rise of the Resistance',
    'Millennium Falcon: Smugglers Run',
    'Twilight Zone Tower of Terror',
    'Rock \'n\' Roller Coaster',
    'Slinky Dog Dash',
    'Mickey & Minnie\'s Runaway Railway',
    'Toy Story Mania!',
  ],
  'animal-kingdom': [
    'Avatar Flight of Passage',
    'Na\'vi River Journey',
    'Expedition Everest',
    'Kilimanjaro Safaris',
    'Dinosaur',
    'Kali River Rapids',
  ],
  'universal-studios': [
    'Harry Potter and the Escape from Gringotts',
    'Hagrid\'s Magical Creatures Motorbike Adventure',
    'Revenge of the Mummy',
    'Hollywood Rip Ride Rockit',
    'Transformers: The Ride 3D',
    'Men in Black: Alien Attack',
    'E.T. Adventure',
  ],
  'islands-of-adventure': [
    'VelociCoaster',
    'Hagrid\'s Magical Creatures Motorbike Adventure',
    'Harry Potter and the Forbidden Journey',
    'The Incredible Hulk Coaster',
    'The Amazing Adventures of Spider-Man',
    'Jurassic World VelociCoaster',
    'Skull Island: Reign of Kong',
  ],
  'seaworld': [
    'Mako',
    'Kraken',
    'Manta',
    'Journey to Atlantis',
    'Ice Breaker',
    'Pipeline: The Surf Coaster',
  ],
  'busch-gardens': [
    'Iron Gwazi',
    'SheiKra',
    'Cheetah Hunt',
    'Montu',
    'Kumba',
    'Cobra\'s Curse',
    'Tigris',
  ],
}

interface ThemeParksApiEntity {
  id: string
  name: string
  entityType: string
  queue?: {
    STANDBY?: {
      waitTime: number | null
    }
  }
  status?: string
}

interface ThemeParksScheduleEntry {
  date: string
  openingTime?: string
  closingTime?: string
  type: string
}

/**
 * Get park entity ID from slug
 */
function getParkId(slug: string): string | null {
  return PARK_IDS[slug] || null
}

/**
 * Fetch live wait times for a specific park
 */
export async function getParkWaitTimes(parkSlug: string): Promise<RideWaitTime[]> {
  const parkId = getParkId(parkSlug)
  if (!parkId) {
    logger.warn({ parkSlug }, 'Unknown park slug')
    return []
  }

  try {
    const response = await fetch(`${THEMEPARKS_API_BASE}/entity/${parkId}/live`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      logger.error({ status: response.status }, 'ThemeParks API error')
      return []
    }

    const data = await response.json()
    const rides: ThemeParksApiEntity[] = data.liveData || []

    // Filter to attractions only and get top rides
    const topRideNames = TOP_RIDES[parkSlug] || []
    const attractions = rides.filter(
      (entity) => entity.entityType === 'ATTRACTION'
    )

    // Map to our format, prioritizing top rides
    const waitTimes: RideWaitTime[] = attractions
      .filter((ride) => topRideNames.some((name) =>
        ride.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(ride.name.toLowerCase())
      ))
      .map((ride) => ({
        id: ride.id,
        name: ride.name,
        waitMinutes: ride.queue?.STANDBY?.waitTime ?? null,
        status: mapStatus(ride.status),
        lastUpdated: new Date().toISOString(),
      }))
      .slice(0, 10) // Top 10 rides

    return waitTimes
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error fetching park wait times')
    return []
  }
}

/**
 * Get park schedule (opening/closing times)
 */
export async function getParkSchedule(
  parkSlug: string,
  date?: string
): Promise<{ open: string; close: string } | null> {
  const parkId = getParkId(parkSlug)
  if (!parkId) return null

  try {
    const response = await fetch(`${THEMEPARKS_API_BASE}/entity/${parkId}/schedule`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) return null

    const data = await response.json()
    const schedules: ThemeParksScheduleEntry[] = data.schedule || []

    // Find today's or requested date's schedule
    const targetDate = date || new Date().toISOString().split('T')[0]
    const todaySchedule = schedules.find(
      (s) => s.date === targetDate && s.type === 'OPERATING'
    )

    if (!todaySchedule?.openingTime || !todaySchedule?.closingTime) {
      return null
    }

    return {
      open: formatTime(todaySchedule.openingTime),
      close: formatTime(todaySchedule.closingTime),
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error fetching park schedule')
    return null
  }
}

/**
 * Check if a park is currently open
 */
export async function isParkOpen(parkSlug: string): Promise<boolean> {
  const schedule = await getParkSchedule(parkSlug)
  if (!schedule) return false

  const now = new Date()
  const [openHour, openMin] = schedule.open.split(':').map(Number)
  const [closeHour, closeMin] = schedule.close.split(':').map(Number)

  const openTime = new Date()
  openTime.setHours(openHour, openMin, 0)

  const closeTime = new Date()
  closeTime.setHours(closeHour, closeMin, 0)

  return now >= openTime && now <= closeTime
}

/**
 * Get all Orlando-area theme parks with basic info
 */
export async function getAllThemeParks(): Promise<Array<{
  slug: string
  name: string
  lat: number
  lng: number
}>> {
  return Object.entries(CENTRAL_FL_DESTINATIONS.themeparks).map(([key, data]) => ({
    slug: key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''),
    name: data.name,
    lat: data.lat,
    lng: data.lng,
  }))
}

/**
 * Get theme park data with wait times for display
 */
export async function getThemeParkWithWaits(
  parkSlug: string,
  fromLat: number,
  fromLng: number
): Promise<ThemeParkWithWaits | null> {
  // Find park info
  const parkKey = Object.keys(CENTRAL_FL_DESTINATIONS.themeparks).find(
    (key) => key.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '') === parkSlug ||
           key.toLowerCase() === parkSlug.replace(/-/g, '')
  )

  if (!parkKey) return null

  const parkInfo = CENTRAL_FL_DESTINATIONS.themeparks[parkKey as keyof typeof CENTRAL_FL_DESTINATIONS.themeparks]

  // Get wait times and schedule in parallel
  const [waitTimes, schedule, isOpen] = await Promise.all([
    getParkWaitTimes(parkSlug),
    getParkSchedule(parkSlug),
    isParkOpen(parkSlug),
  ])

  // Calculate distance (Haversine formula)
  const distance = haversineDistance(fromLat, fromLng, parkInfo.lat, parkInfo.lng)

  // Estimate drive time (rough: 1.5 min per mile in Orlando area)
  const estimatedDriveMinutes = Math.round(distance * 1.5)

  return {
    id: parkSlug,
    name: parkInfo.name,
    slug: parkSlug,
    distanceMiles: Math.round(distance * 10) / 10,
    driveDurationMinutes: estimatedDriveMinutes,
    driveDurationWithTraffic: Math.round(estimatedDriveMinutes * 1.3), // 30% traffic buffer
    isOpen,
    operatingHours: schedule || undefined,
    topRides: waitTimes,
  }
}

/**
 * Get all nearby theme parks with distances
 */
export async function getNearbyThemeParks(
  lat: number,
  lng: number,
  maxDistanceMiles: number = 50
): Promise<ThemeParkWithWaits[]> {
  const parks = await getAllThemeParks()

  // Filter by distance and get details
  const nearbyParks = parks.filter((park) => {
    const distance = haversineDistance(lat, lng, park.lat, park.lng)
    return distance <= maxDistanceMiles
  })

  // Get details for each park in parallel
  const parkDetails = await Promise.all(
    nearbyParks.map((park) => getThemeParkWithWaits(park.slug, lat, lng))
  )

  // Filter out nulls and sort by distance
  return parkDetails
    .filter((p): p is ThemeParkWithWaits => p !== null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

// Helper functions

function mapStatus(status?: string): RideWaitTime['status'] {
  switch (status?.toUpperCase()) {
    case 'OPERATING':
      return 'operating'
    case 'CLOSED':
      return 'closed'
    case 'DOWN':
      return 'down'
    case 'REFURBISHMENT':
      return 'refurbishment'
    default:
      return 'closed'
  }
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

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
