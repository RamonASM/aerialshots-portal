// Ticketmaster Discovery API Client
// Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

import { integrationLogger, formatError } from '@/lib/logger'
import { fetchWithTimeout, FETCH_TIMEOUTS } from '@/lib/utils/fetch-with-timeout'

const logger = integrationLogger.child({ integration: 'ticketmaster' })

export interface TicketmasterEvent {
  id: string
  name: string
  type: string
  url: string
  locale: string
  images: Array<{
    url: string
    width: number
    height: number
    ratio: string
  }>
  dates: {
    start: {
      localDate: string
      localTime?: string
      dateTime?: string
    }
    timezone?: string
    status: {
      code: string
    }
  }
  classifications?: Array<{
    segment?: { name: string }
    genre?: { name: string }
    subGenre?: { name: string }
  }>
  priceRanges?: Array<{
    type: string
    currency: string
    min: number
    max: number
  }>
  _embedded?: {
    venues?: Array<{
      name: string
      city?: { name: string }
      state?: { name: string; stateCode: string }
      address?: { line1: string }
      location?: { longitude: string; latitude: string }
      distance?: number
      units?: string
    }>
  }
}

export interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[]
  }
  page: {
    size: number
    totalElements: number
    totalPages: number
    number: number
  }
}

export interface LocalEvent {
  id: string
  name: string
  url: string
  imageUrl: string | null
  date: string
  time: string | null
  venue: string
  city: string
  category: string
  genre: string | null
  priceRange: string | null
  distance: number | null
}

const TICKETMASTER_API_BASE = 'https://app.ticketmaster.com/discovery/v2'

// Format date for display
function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Format time for display
function formatEventTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// Format price range
function formatPriceRange(
  priceRanges?: TicketmasterEvent['priceRanges']
): string | null {
  if (!priceRanges || priceRanges.length === 0) return null

  const range = priceRanges[0]
  if (range.min === range.max) {
    return `$${range.min}`
  }
  return `$${range.min} - $${range.max}`
}

// Get best image URL
function getBestImage(images: TicketmasterEvent['images']): string | null {
  if (!images || images.length === 0) return null

  // Prefer 16:9 ratio images around 640px wide
  const preferred = images.find(
    (img) => img.ratio === '16_9' && img.width >= 500 && img.width <= 800
  )

  if (preferred) return preferred.url

  // Fall back to largest image
  const sorted = [...images].sort((a, b) => b.width - a.width)
  return sorted[0]?.url ?? null
}

// Search for events near a location
export async function searchLocalEvents(
  lat: number,
  lng: number,
  radiusMiles = 25,
  daysAhead = 30
): Promise<LocalEvent[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) {
    logger.warn('TICKETMASTER_API_KEY not configured')
    return []
  }

  try {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    const url = new URL(`${TICKETMASTER_API_BASE}/events.json`)
    url.searchParams.set('apikey', apiKey)
    url.searchParams.set('latlong', `${lat},${lng}`)
    url.searchParams.set('radius', String(radiusMiles))
    url.searchParams.set('unit', 'miles')
    url.searchParams.set('startDateTime', startDate.toISOString().split('.')[0] + 'Z')
    url.searchParams.set('endDateTime', endDate.toISOString().split('.')[0] + 'Z')
    url.searchParams.set('sort', 'date,asc')
    url.searchParams.set('size', '20')

    const response = await fetchWithTimeout(url.toString(), {
      timeout: FETCH_TIMEOUTS.DEFAULT,
    })

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`)
    }

    const data: TicketmasterResponse = await response.json()

    if (!data._embedded?.events) {
      return []
    }

    return data._embedded.events.map((event) => {
      const venue = event._embedded?.venues?.[0]
      const classification = event.classifications?.[0]

      return {
        id: event.id,
        name: event.name,
        url: event.url,
        imageUrl: getBestImage(event.images),
        date: formatEventDate(event.dates.start.localDate),
        time: event.dates.start.localTime
          ? formatEventTime(event.dates.start.localTime)
          : null,
        venue: venue?.name ?? 'TBA',
        city: venue?.city?.name ?? '',
        category: classification?.segment?.name ?? 'Event',
        genre: classification?.genre?.name ?? null,
        priceRange: formatPriceRange(event.priceRanges),
        distance: venue?.distance ?? null,
      }
    })
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error fetching Ticketmaster events')
    return []
  }
}

// Get events grouped by category
export async function getEventsGroupedByCategory(
  lat: number,
  lng: number
): Promise<Record<string, LocalEvent[]>> {
  const events = await searchLocalEvents(lat, lng)

  const grouped: Record<string, LocalEvent[]> = {}

  for (const event of events) {
    const category = event.category || 'Other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(event)
  }

  return grouped
}
