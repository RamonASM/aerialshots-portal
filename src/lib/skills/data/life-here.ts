/**
 * Integrate Life Here Skill
 *
 * Fetches location data from Life Here API endpoints for content enrichment.
 * Aggregates data from multiple endpoints and generates content-ready highlights.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import { withCircuitBreaker, CircuitOpenError } from '@/lib/resilience/circuit-breaker'
import type {
  IntegrateLifeHereInput,
  IntegrateLifeHereOutput,
  LifeHereDataType,
  LifestyleProfile,
  DiningData,
  CommuteData,
  EventData,
  AttractionData,
  EssentialsData,
  LifestyleData,
  OverviewData,
} from './types'

// =====================
// CONSTANTS
// =====================

const DEFAULT_LIMIT = 5
const DEFAULT_CACHE_TTL = 1800 // 30 minutes

// Base URL for internal API calls
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return 'http://localhost:3000'
}

// =====================
// CACHE IMPLEMENTATION
// =====================

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// Simple in-memory cache with TTL
const lifeHereCache = new Map<string, CacheEntry<IntegrateLifeHereOutput>>()
const MAX_CACHE_ENTRIES = 100

/**
 * Generate cache key from input
 */
function getCacheKey(input: IntegrateLifeHereInput): string {
  const lat = input.lat?.toFixed(4) || ''
  const lng = input.lng?.toFixed(4) || ''
  const dataTypes = [...input.dataTypes].sort().join(',')
  const profile = input.profile || 'balanced'
  const limit = input.limit || DEFAULT_LIMIT

  // Include address/city/state if no coords
  const location = lat && lng
    ? `${lat}:${lng}`
    : `${input.address || ''}:${input.city || ''}:${input.state || ''}`

  return `lifehere:${location}:${dataTypes}:${profile}:${limit}`
}

/**
 * Get cached data if valid
 */
function getCachedData(key: string): IntegrateLifeHereOutput | null {
  const entry = lifeHereCache.get(key)

  if (!entry) return null

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    lifeHereCache.delete(key)
    return null
  }

  return entry.data
}

/**
 * Store data in cache
 */
function setCacheData(key: string, data: IntegrateLifeHereOutput, ttlSeconds: number): void {
  // Evict oldest entries if at capacity
  if (lifeHereCache.size >= MAX_CACHE_ENTRIES) {
    // Remove first (oldest) entry
    const firstKey = lifeHereCache.keys().next().value
    if (firstKey) {
      lifeHereCache.delete(firstKey)
    }
  }

  lifeHereCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  })
}

/**
 * Clear expired entries from cache (called periodically)
 */
function cleanupCache(): void {
  const now = Date.now()
  for (const [key, entry] of lifeHereCache.entries()) {
    if (now > entry.expiresAt) {
      lifeHereCache.delete(key)
    }
  }
}

/**
 * Clear all cache entries (for testing)
 */
export function clearLifeHereCache(): void {
  lifeHereCache.clear()
}

/**
 * Get cache stats
 */
export function getLifeHereCacheStats(): { size: number; maxSize: number } {
  return {
    size: lifeHereCache.size,
    maxSize: MAX_CACHE_ENTRIES,
  }
}

// =====================
// GEOCODING
// =====================

/**
 * Geocode an address to lat/lng using Google Places
 */
async function geocodeAddress(
  address: string,
  city?: string,
  state?: string
): Promise<{ lat: number; lng: number } | null> {
  const fullAddress = [address, city, state].filter(Boolean).join(', ')

  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.warn('GOOGLE_PLACES_API_KEY not configured, cannot geocode')
      return null
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const data = await response.json()

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// =====================
// API FETCHERS
// =====================

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function fetchLifeHereEndpoint<T>(
  endpoint: string,
  lat: number,
  lng: number,
  params: Record<string, string> = {}
): Promise<T | null> {
  try {
    const baseUrl = getBaseUrl()
    const searchParams = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...params,
    })

    const url = `${baseUrl}/api/v1/location/${endpoint}?${searchParams}`

    // Wrap the fetch call with circuit breaker protection
    const result = await withCircuitBreaker('life-here-api', async () => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          // Use internal header for server-to-server calls
          'X-Internal-Request': 'true',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        // Throw to record as failure in circuit breaker
        throw new Error(`Life Here ${endpoint} returned ${response.status}`)
      }

      return response.json() as Promise<ApiResponse<T>>
    }, { timeout: 15000 })

    return result.success && result.data ? result.data : null
  } catch (error) {
    // If circuit is open, log and return null to allow graceful degradation
    if (error instanceof CircuitOpenError) {
      console.warn(`Circuit breaker open for life-here-api, skipping ${endpoint}`)
      return null
    }
    console.error(`Life Here ${endpoint} error:`, error)
    return null
  }
}

// =====================
// DATA FETCHERS
// =====================

async function fetchScores(lat: number, lng: number, profile: string): Promise<{
  score: number
  label: string
  profile: string
  description: string
} | null> {
  interface ScoresData {
    lifeHereScore: {
      score: number
      label: string
      profile: string
      description: string
    }
  }
  const data = await fetchLifeHereEndpoint<ScoresData>('scores', lat, lng, { profile })
  return data?.lifeHereScore || null
}

async function fetchDining(lat: number, lng: number, limit: number): Promise<DiningData | null> {
  interface DiningApiData {
    restaurants: Array<{
      name: string
      cuisine: string
      rating: number
      priceLevel?: string
      distance: number
      address?: string
    }>
    cuisineBreakdown?: Record<string, number>
    avgRating?: number
    total: number
  }
  const data = await fetchLifeHereEndpoint<DiningApiData>('dining', lat, lng, {
    limit: limit.toString(),
  })

  if (!data) return null

  return {
    count: data.total,
    topPicks: data.restaurants.slice(0, limit),
    cuisineBreakdown: data.cuisineBreakdown,
    avgRating: data.avgRating,
  }
}

async function fetchCommute(lat: number, lng: number): Promise<CommuteData | null> {
  interface CommuteApiData {
    destinations: {
      airport?: { minutes: number }
      beach?: { minutes: number }
      downtown?: { minutes: number }
      themePark?: { minutes: number }
    }
    nearestHighwayMiles?: number
    scores?: {
      transit?: number
      walk?: number
      bike?: number
    }
  }
  const data = await fetchLifeHereEndpoint<CommuteApiData>('commute', lat, lng)

  if (!data) return null

  return {
    airportMinutes: data.destinations.airport?.minutes || 0,
    beachMinutes: data.destinations.beach?.minutes || 0,
    downtownMinutes: data.destinations.downtown?.minutes || 0,
    themeParkMinutes: data.destinations.themePark?.minutes,
    nearestHighwayMiles: data.nearestHighwayMiles,
    transitScore: data.scores?.transit,
    walkScore: data.scores?.walk,
    bikeScore: data.scores?.bike,
  }
}

async function fetchEvents(lat: number, lng: number, limit: number): Promise<EventData | null> {
  interface EventApiData {
    events: Array<{
      name: string
      date: string
      venue: string
      type: string
      distance?: number
      ticketUrl?: string
    }>
    total: number
    categories?: Record<string, number>
  }
  const data = await fetchLifeHereEndpoint<EventApiData>('events', lat, lng, {
    limit: limit.toString(),
  })

  if (!data) return null

  return {
    count: data.total,
    upcoming: data.events.slice(0, limit),
    categories: data.categories,
  }
}

async function fetchAttractions(lat: number, lng: number, limit: number): Promise<AttractionData | null> {
  interface AttractionsApiData {
    themeparks?: Array<{
      name: string
      distance: number
      waitTimes?: Array<{ ride: string; wait: number }>
      isOpen?: boolean
    }>
    beaches?: Array<{
      name: string
      distance: number
      type: 'atlantic' | 'gulf'
    }>
    museums?: Array<{
      name: string
      type: string
      rating: number
      distance: number
    }>
    entertainment?: Array<{
      name: string
      type: string
      distance: number
    }>
  }
  const data = await fetchLifeHereEndpoint<AttractionsApiData>('attractions', lat, lng, {
    limit: limit.toString(),
  })

  return data || null
}

async function fetchEssentials(lat: number, lng: number, limit: number): Promise<EssentialsData | null> {
  interface EssentialsApiData {
    schools?: Array<{
      name: string
      type: 'elementary' | 'middle' | 'high' | 'private'
      rating?: number
      distance: number
    }>
    healthcare?: Array<{
      name: string
      type: 'hospital' | 'urgent_care' | 'pharmacy'
      distance: number
      is24Hour?: boolean
    }>
    grocery?: Array<{
      name: string
      distance: number
      isOrganic?: boolean
    }>
  }
  const data = await fetchLifeHereEndpoint<EssentialsApiData>('essentials', lat, lng, {
    limit: limit.toString(),
  })

  return data || null
}

async function fetchLifestyle(lat: number, lng: number, limit: number): Promise<LifestyleData | null> {
  interface LifestyleApiData {
    gyms?: Array<{
      name: string
      type: string
      distance: number
    }>
    parks?: Array<{
      name: string
      type: string
      distance: number
      amenities?: string[]
    }>
    recreation?: Array<{
      name: string
      type: string
      distance: number
    }>
    outdoors?: {
      trailsNearby: number
      golfCourses: number
      waterAccess: boolean
    }
  }
  const data = await fetchLifeHereEndpoint<LifestyleApiData>('lifestyle', lat, lng, {
    limit: limit.toString(),
  })

  return data || null
}

async function fetchOverview(lat: number, lng: number): Promise<OverviewData | null> {
  interface OverviewApiData {
    summary: string
    neighborhoodType?: string
    population?: number
    medianAge?: number
    crimeIndex?: number
    costOfLiving?: number
    topFeatures: string[]
    considerations?: string[]
  }
  const data = await fetchLifeHereEndpoint<OverviewApiData>('overview', lat, lng)

  return data || null
}

// =====================
// HIGHLIGHT GENERATOR
// =====================

function generateHighlights(output: Partial<IntegrateLifeHereOutput>): string[] {
  const highlights: string[] = []

  // Life Here Score highlight
  if (output.lifeHereScore) {
    highlights.push(
      `Life Here Score: ${output.lifeHereScore.score}/100 (${output.lifeHereScore.label})`
    )
  }

  // Dining highlights
  if (output.dining?.topPicks?.length) {
    const topRestaurant = output.dining.topPicks[0]
    highlights.push(
      `${output.dining.count}+ restaurants nearby including ${topRestaurant.name} (${topRestaurant.cuisine})`
    )
  }

  // Commute highlights
  if (output.commute) {
    if (output.commute.beachMinutes && output.commute.beachMinutes < 60) {
      highlights.push(`${output.commute.beachMinutes} minutes to the beach`)
    }
    if (output.commute.themeParkMinutes && output.commute.themeParkMinutes < 45) {
      highlights.push(`${output.commute.themeParkMinutes} minutes to theme parks`)
    }
    if (output.commute.walkScore && output.commute.walkScore >= 70) {
      highlights.push(`Walk Score: ${output.commute.walkScore} - Very Walkable`)
    }
  }

  // Events highlight
  if (output.events?.upcoming?.length) {
    highlights.push(`${output.events.count} local events coming up`)
  }

  // Attractions highlights
  if (output.attractions?.themeparks?.length) {
    const nearest = output.attractions.themeparks[0]
    highlights.push(`${nearest.name} just ${nearest.distance} miles away`)
  }
  if (output.attractions?.beaches?.length) {
    const nearest = output.attractions.beaches[0]
    highlights.push(`${nearest.name} (${nearest.type} coast) ${nearest.distance} miles`)
  }

  // Essentials highlights
  if (output.essentials?.schools?.length) {
    const topSchool = output.essentials.schools.find(s => s.rating && s.rating >= 8)
    if (topSchool) {
      highlights.push(`Top-rated ${topSchool.name} nearby`)
    }
  }

  // Lifestyle highlights
  if (output.lifestyle?.parks?.length) {
    highlights.push(`${output.lifestyle.parks.length}+ parks and green spaces`)
  }
  if (output.lifestyle?.outdoors?.waterAccess) {
    highlights.push('Water access for boating and kayaking')
  }

  // Overview highlights
  if (output.overview?.topFeatures?.length) {
    highlights.push(...output.overview.topFeatures.slice(0, 2))
  }

  return highlights.slice(0, 10) // Limit to 10 highlights
}

// =====================
// SKILL DEFINITION
// =====================

export const integrateLifeHereSkill: SkillDefinition<IntegrateLifeHereInput, IntegrateLifeHereOutput> = {
  id: 'integrate-life-here',
  name: 'Integrate Life Here',
  description: 'Fetch location data from Life Here API for content enrichment',
  category: 'data',
  version: '1.0.0',
  provider: 'life_here',

  inputSchema: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Street address' },
      city: { type: 'string', description: 'City name' },
      state: { type: 'string', description: 'State abbreviation' },
      lat: { type: 'number', description: 'Latitude' },
      lng: { type: 'number', description: 'Longitude' },
      dataTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['scores', 'dining', 'commute', 'events', 'attractions', 'essentials', 'lifestyle', 'overview'],
        },
      },
      profile: {
        type: 'string',
        enum: ['balanced', 'family', 'professional', 'active', 'foodie'],
      },
      limit: { type: 'number', description: 'Items per category' },
      cacheTtl: { type: 'number', description: 'Cache TTL in seconds' },
    },
    required: ['dataTypes'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      location: { type: 'object' },
      lifeHereScore: { type: 'object' },
      dining: { type: 'object' },
      commute: { type: 'object' },
      events: { type: 'object' },
      attractions: { type: 'object' },
      essentials: { type: 'object' },
      lifestyle: { type: 'object' },
      overview: { type: 'object' },
      highlights: { type: 'array' },
      dataFetched: { type: 'array' },
      fetchedAt: { type: 'string' },
      cached: { type: 'boolean' },
    },
    required: ['location', 'highlights', 'dataFetched', 'fetchedAt', 'cached'],
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  requirements: [
    {
      type: 'api_key',
      name: 'Google Places API',
      configKey: 'GOOGLE_PLACES_API_KEY',
      required: false, // Only needed if geocoding from address
      description: 'Required for address geocoding',
    },
  ],

  validate: (input: IntegrateLifeHereInput): ValidationError[] => {
    const errors: ValidationError[] = []

    // Must have location source
    const hasCoords = input.lat !== undefined && input.lng !== undefined
    const hasAddress = input.address || (input.city && input.state)

    if (!hasCoords && !hasAddress) {
      errors.push({
        field: 'location',
        message: 'Must provide lat/lng or address/city/state',
        code: 'REQUIRED',
      })
    }

    // Must have at least one data type
    if (!input.dataTypes || input.dataTypes.length === 0) {
      errors.push({
        field: 'dataTypes',
        message: 'At least one data type is required',
        code: 'REQUIRED',
      })
    }

    // Validate data types
    const validTypes: LifeHereDataType[] = [
      'scores', 'dining', 'commute', 'events',
      'attractions', 'essentials', 'lifestyle', 'overview',
    ]
    input.dataTypes?.forEach((type, index) => {
      if (!validTypes.includes(type)) {
        errors.push({
          field: `dataTypes[${index}]`,
          message: `Invalid data type: ${type}`,
          code: 'INVALID',
        })
      }
    })

    return errors
  },

  execute: async (input, context): Promise<SkillResult<IntegrateLifeHereOutput>> => {
    const startTime = Date.now()
    const cacheTtl = input.cacheTtl || DEFAULT_CACHE_TTL

    // Periodically clean up expired cache entries (1% chance per call)
    if (Math.random() < 0.01) {
      cleanupCache()
    }

    try {
      // Check cache first
      const cacheKey = getCacheKey(input)
      const cachedData = getCachedData(cacheKey)

      if (cachedData) {
        // Return cached data with updated timestamp
        return {
          success: true,
          data: {
            ...cachedData,
            cached: true,
            fetchedAt: cachedData.fetchedAt, // Keep original fetch time
          },
          metadata: {
            executionTimeMs: Date.now() - startTime,
            provider: 'life_here',
          },
        }
      }

      // Get coordinates
      let lat = input.lat
      let lng = input.lng

      if (lat === undefined || lng === undefined) {
        const coords = await geocodeAddress(input.address || '', input.city, input.state)
        if (!coords) {
          return {
            success: false,
            error: 'Unable to geocode address',
            errorCode: 'GEOCODE_FAILED',
            metadata: { executionTimeMs: Date.now() - startTime },
          }
        }
        lat = coords.lat
        lng = coords.lng
      }

      const limit = input.limit || DEFAULT_LIMIT
      const profile = input.profile || 'balanced'

      // Fetch requested data types in parallel
      const fetchPromises: Array<Promise<void>> = []
      const output: Partial<IntegrateLifeHereOutput> = {
        location: {
          lat,
          lng,
          address: input.address,
          city: input.city,
          state: input.state,
        },
        dataFetched: [],
      }

      for (const dataType of input.dataTypes) {
        switch (dataType) {
          case 'scores':
            fetchPromises.push(
              fetchScores(lat, lng, profile).then(data => {
                if (data) {
                  output.lifeHereScore = {
                    score: data.score,
                    label: data.label,
                    profile: profile as LifestyleProfile,
                    description: data.description,
                  }
                  output.dataFetched!.push('scores')
                }
              })
            )
            break
          case 'dining':
            fetchPromises.push(
              fetchDining(lat, lng, limit).then(data => {
                if (data) {
                  output.dining = data
                  output.dataFetched!.push('dining')
                }
              })
            )
            break
          case 'commute':
            fetchPromises.push(
              fetchCommute(lat, lng).then(data => {
                if (data) {
                  output.commute = data
                  output.dataFetched!.push('commute')
                }
              })
            )
            break
          case 'events':
            fetchPromises.push(
              fetchEvents(lat, lng, limit).then(data => {
                if (data) {
                  output.events = data
                  output.dataFetched!.push('events')
                }
              })
            )
            break
          case 'attractions':
            fetchPromises.push(
              fetchAttractions(lat, lng, limit).then(data => {
                if (data) {
                  output.attractions = data
                  output.dataFetched!.push('attractions')
                }
              })
            )
            break
          case 'essentials':
            fetchPromises.push(
              fetchEssentials(lat, lng, limit).then(data => {
                if (data) {
                  output.essentials = data
                  output.dataFetched!.push('essentials')
                }
              })
            )
            break
          case 'lifestyle':
            fetchPromises.push(
              fetchLifestyle(lat, lng, limit).then(data => {
                if (data) {
                  output.lifestyle = data
                  output.dataFetched!.push('lifestyle')
                }
              })
            )
            break
          case 'overview':
            fetchPromises.push(
              fetchOverview(lat, lng).then(data => {
                if (data) {
                  output.overview = data
                  output.dataFetched!.push('overview')
                }
              })
            )
            break
        }
      }

      // Wait for all fetches to complete
      await Promise.all(fetchPromises)

      // Generate highlights
      output.highlights = generateHighlights(output)
      output.fetchedAt = new Date().toISOString()
      output.cached = false

      const finalOutput = output as IntegrateLifeHereOutput

      // Store in cache
      setCacheData(cacheKey, finalOutput, cacheTtl)

      return {
        success: true,
        data: finalOutput,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          provider: 'life_here',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: message,
        errorCode: 'LIFE_HERE_ERROR',
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      }
    }
  },

  estimateCost: async (input: IntegrateLifeHereInput): Promise<number> => {
    // Life Here API is internal, cost is primarily compute
    // Base cost + per-endpoint cost
    const baseCost = 0.001
    const perEndpointCost = 0.0005
    return baseCost + (input.dataTypes?.length || 0) * perEndpointCost
  },
}

export default integrateLifeHereSkill
