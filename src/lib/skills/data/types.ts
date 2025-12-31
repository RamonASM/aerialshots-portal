/**
 * Data Skills - Types
 *
 * Type definitions for data fetching and integration skills.
 */

// =====================
// LIFE HERE SKILL
// =====================

export type LifeHereDataType =
  | 'scores'
  | 'dining'
  | 'commute'
  | 'events'
  | 'attractions'
  | 'essentials'
  | 'lifestyle'
  | 'overview'

export type LifestyleProfile =
  | 'balanced'
  | 'family'
  | 'professional'
  | 'active'
  | 'foodie'

/**
 * Input for integrate-life-here skill
 */
export interface IntegrateLifeHereInput {
  // Location (one of these required)
  address?: string
  city?: string
  state?: string
  lat?: number
  lng?: number

  // Data types to fetch
  dataTypes: LifeHereDataType[]

  // Profile for score weighting
  profile?: LifestyleProfile

  // Options
  limit?: number  // Limit items per category (default 5)
  cacheTtl?: number  // Cache TTL in seconds (default 1800 = 30 min)
}

/**
 * Output from integrate-life-here skill
 */
export interface IntegrateLifeHereOutput {
  // Location info
  location: {
    lat: number
    lng: number
    address?: string
    city?: string
    state?: string
  }

  // Life Here Score (if scores requested)
  lifeHereScore?: {
    score: number
    label: string
    profile: LifestyleProfile
    description: string
  }

  // Category data (based on requested dataTypes)
  dining?: DiningData
  commute?: CommuteData
  events?: EventData
  attractions?: AttractionData
  essentials?: EssentialsData
  lifestyle?: LifestyleData
  overview?: OverviewData

  // Pre-formatted highlights for content generation
  highlights: string[]

  // Metadata
  dataFetched: LifeHereDataType[]
  fetchedAt: string
  cached: boolean
}

// =====================
// CATEGORY DATA TYPES
// =====================

export interface DiningData {
  count: number
  topPicks: Array<{
    name: string
    cuisine: string
    rating: number
    priceLevel?: string
    distance: number
    address?: string
  }>
  cuisineBreakdown?: Record<string, number>
  avgRating?: number
}

export interface CommuteData {
  airportMinutes: number
  beachMinutes: number
  downtownMinutes: number
  themeParkMinutes?: number
  nearestHighwayMiles?: number
  transitScore?: number
  walkScore?: number
  bikeScore?: number
}

export interface EventData {
  count: number
  upcoming: Array<{
    name: string
    date: string
    venue: string
    type: string
    distance?: number
    ticketUrl?: string
  }>
  categories?: Record<string, number>
}

export interface AttractionData {
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

export interface EssentialsData {
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
  services?: Array<{
    name: string
    type: string
    distance: number
  }>
}

export interface LifestyleData {
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

export interface OverviewData {
  summary: string
  neighborhoodType?: string
  population?: number
  medianAge?: number
  crimeIndex?: number
  costOfLiving?: number
  topFeatures: string[]
  considerations?: string[]
}
