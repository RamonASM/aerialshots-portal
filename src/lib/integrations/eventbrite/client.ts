// Eventbrite API Integration
// Community events, classes, workshops, and local happenings

import type { LocalEvent } from '@/lib/api/types'
import { integrationLogger, formatError } from '@/lib/logger'

const logger = integrationLogger.child({ integration: 'eventbrite' })

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3'

interface EventbriteEvent {
  id: string
  name: { text: string; html: string }
  description?: { text: string; html: string }
  url: string
  start: { local: string; utc: string }
  end: { local: string; utc: string }
  is_free: boolean
  logo?: { url: string }
  venue_id?: string
  category_id?: string
  subcategory_id?: string
  online_event: boolean
}

interface EventbriteVenue {
  id: string
  name: string
  address: {
    address_1: string
    city: string
    region: string
    postal_code: string
    localized_address_display: string
    latitude: string
    longitude: string
  }
}

interface EventbriteCategory {
  id: string
  name: string
  short_name: string
}

interface EventbriteSearchResponse {
  events: EventbriteEvent[]
  pagination: {
    object_count: number
    page_number: number
    page_size: number
    page_count: number
    has_more_items: boolean
  }
}

// Category mapping
const CATEGORY_MAP: Record<string, LocalEvent['category']> = {
  '103': 'music', // Music
  '101': 'arts', // Business & Professional -> other
  '110': 'food', // Food & Drink
  '113': 'community', // Community & Culture
  '199': 'other', // Other
  '102': 'arts', // Science & Technology -> arts
  '104': 'arts', // Film, Media & Entertainment
  '105': 'arts', // Performing & Visual Arts
  '106': 'other', // Fashion & Beauty
  '107': 'family', // Health & Wellness -> family
  '108': 'sports', // Sports & Fitness
  '109': 'other', // Travel & Outdoor
  '111': 'other', // Charity & Causes
  '112': 'other', // Religion & Spirituality
  '114': 'family', // Family & Education
  '115': 'other', // Seasonal & Holiday
  '116': 'other', // Government & Politics
  '117': 'other', // Home & Lifestyle
  '118': 'other', // Auto, Boat & Air
  '119': 'other', // Hobbies & Special Interest
  '120': 'other', // School Activities
}

/**
 * Search Eventbrite events near a location
 */
async function searchEventbrite(
  lat: number,
  lng: number,
  options: {
    radius?: string // e.g., "10mi"
    startDate?: string
    endDate?: string
    categories?: string[]
    isFree?: boolean
    page?: number
    pageSize?: number
  } = {}
): Promise<{ events: EventbriteEvent[]; hasMore: boolean }> {
  if (!EVENTBRITE_API_KEY) {
    logger.warn('EVENTBRITE_API_KEY not configured')
    return { events: [], hasMore: false }
  }

  try {
    const params = new URLSearchParams({
      'location.latitude': lat.toString(),
      'location.longitude': lng.toString(),
      'location.within': options.radius || '25mi',
      expand: 'venue,category',
      page: (options.page || 1).toString(),
      page_size: (options.pageSize || 50).toString(),
    })

    // Add date range (default: next 60 days)
    const now = new Date()
    const startDate = options.startDate || now.toISOString()
    const endDate =
      options.endDate ||
      new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()

    params.set('start_date.range_start', startDate)
    params.set('start_date.range_end', endDate)

    if (options.categories?.length) {
      params.set('categories', options.categories.join(','))
    }

    if (options.isFree !== undefined) {
      params.set('price', options.isFree ? 'free' : 'paid')
    }

    const response = await fetch(
      `${EVENTBRITE_API_BASE}/events/search/?${params}`,
      {
        headers: {
          Authorization: `Bearer ${EVENTBRITE_API_KEY}`,
        },
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    )

    if (!response.ok) {
      logger.error({ status: response.status }, 'Eventbrite API error')
      return { events: [], hasMore: false }
    }

    const data: EventbriteSearchResponse = await response.json()
    return {
      events: data.events || [],
      hasMore: data.pagination?.has_more_items || false,
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Error searching Eventbrite')
    return { events: [], hasMore: false }
  }
}

/**
 * Get venue details
 */
async function getVenue(venueId: string): Promise<EventbriteVenue | null> {
  if (!EVENTBRITE_API_KEY) return null

  try {
    const response = await fetch(`${EVENTBRITE_API_BASE}/venues/${venueId}/`, {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_API_KEY}`,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

/**
 * Transform Eventbrite event to our format
 */
function toLocalEvent(
  event: EventbriteEvent,
  venue?: EventbriteVenue | null,
  distance?: number
): LocalEvent {
  const startDate = new Date(event.start.local)

  return {
    id: event.id,
    name: event.name.text,
    description: event.description?.text?.slice(0, 200),
    date: startDate.toISOString().split('T')[0],
    time: startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    endDate: event.end.local,
    venue: venue?.name || 'TBA',
    venueAddress: venue?.address?.localized_address_display,
    city: venue?.address?.city || '',
    category: CATEGORY_MAP[event.category_id || '199'] || 'other',
    priceRange: event.is_free ? 'Free' : 'Paid',
    imageUrl: event.logo?.url || null,
    ticketUrl: event.url,
    source: 'eventbrite',
    distanceMiles: distance,
  }
}

/**
 * Get upcoming community events
 */
export async function getUpcomingEvents(
  lat: number,
  lng: number,
  limit: number = 20
): Promise<LocalEvent[]> {
  const { events } = await searchEventbrite(lat, lng, {
    pageSize: limit,
  })

  // Get venues for events (in batches to avoid rate limits)
  const venueIds = [...new Set(events.map((e) => e.venue_id).filter(Boolean))]
  const venues = await Promise.all(
    venueIds.slice(0, 10).map((id) => getVenue(id!))
  )
  const venueMap = new Map(venues.filter(Boolean).map((v) => [v!.id, v]))

  return events.slice(0, limit).map((event) => {
    const venue = event.venue_id ? venueMap.get(event.venue_id) : null
    return toLocalEvent(event, venue)
  })
}

/**
 * Get free community events
 */
export async function getFreeEvents(
  lat: number,
  lng: number,
  limit: number = 20
): Promise<LocalEvent[]> {
  const { events } = await searchEventbrite(lat, lng, {
    isFree: true,
    pageSize: limit,
  })

  return events.slice(0, limit).map((event) => toLocalEvent(event))
}

/**
 * Get family-friendly events
 */
export async function getFamilyEvents(
  lat: number,
  lng: number,
  limit: number = 20
): Promise<LocalEvent[]> {
  const { events } = await searchEventbrite(lat, lng, {
    categories: ['114'], // Family & Education
    pageSize: limit,
  })

  return events.slice(0, limit).map((event) => toLocalEvent(event))
}

/**
 * Get events by category
 */
export async function getEventsByCategory(
  lat: number,
  lng: number,
  category: LocalEvent['category'],
  limit: number = 20
): Promise<LocalEvent[]> {
  // Reverse lookup category ID
  const categoryId = Object.entries(CATEGORY_MAP).find(
    ([, cat]) => cat === category
  )?.[0]

  const { events } = await searchEventbrite(lat, lng, {
    categories: categoryId ? [categoryId] : undefined,
    pageSize: limit,
  })

  return events.slice(0, limit).map((event) => toLocalEvent(event))
}

/**
 * Get events happening this weekend
 */
export async function getWeekendEvents(
  lat: number,
  lng: number,
  limit: number = 20
): Promise<LocalEvent[]> {
  const now = new Date()
  const dayOfWeek = now.getDay()

  // Calculate next Friday
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
  const friday = new Date(now)
  friday.setDate(now.getDate() + daysUntilFriday)
  friday.setHours(0, 0, 0, 0)

  // Sunday end
  const sunday = new Date(friday)
  sunday.setDate(friday.getDate() + 2)
  sunday.setHours(23, 59, 59, 999)

  const { events } = await searchEventbrite(lat, lng, {
    startDate: friday.toISOString(),
    endDate: sunday.toISOString(),
    pageSize: limit,
  })

  return events.slice(0, limit).map((event) => toLocalEvent(event))
}

/**
 * Get all community events data
 */
export async function getCommunityEvents(
  lat: number,
  lng: number
): Promise<{
  upcoming: LocalEvent[]
  free: LocalEvent[]
  family: LocalEvent[]
  weekend: LocalEvent[]
}> {
  const [upcoming, free, family, weekend] = await Promise.all([
    getUpcomingEvents(lat, lng, 15),
    getFreeEvents(lat, lng, 10),
    getFamilyEvents(lat, lng, 10),
    getWeekendEvents(lat, lng, 10),
  ])

  return { upcoming, free, family, weekend }
}
