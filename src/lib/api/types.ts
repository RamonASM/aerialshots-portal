// Life Here API - Core Types

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta: {
    requestId: string
    cached: boolean
    cachedAt?: string
    responseTime: number
  }
}

/**
 * API Key tiers with limits
 */
export type ApiTier = 'free' | 'pro' | 'business' | 'enterprise'

export interface ApiKeyData {
  id: string
  userId: string | null
  name: string | null
  tier: ApiTier
  monthlyLimit: number
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
}

export const TIER_LIMITS: Record<ApiTier, { requestsPerMonth: number; requestsPerMinute: number }> = {
  free: { requestsPerMonth: 3000, requestsPerMinute: 10 }, // 100/day
  pro: { requestsPerMonth: 10000, requestsPerMinute: 60 },
  business: { requestsPerMonth: 100000, requestsPerMinute: 300 },
  enterprise: { requestsPerMonth: Infinity, requestsPerMinute: 1000 },
}

/**
 * Location query parameters
 */
export interface LocationQuery {
  lat: number
  lng: number
  radius?: number // in miles, default varies by endpoint
}

/**
 * Theme Park data
 */
export interface ThemePark {
  id: string
  name: string
  slug: string
  distanceMiles: number
  driveDurationMinutes: number
  driveDurationWithTraffic: number
  isOpen: boolean
  operatingHours?: {
    open: string
    close: string
  }
}

export interface RideWaitTime {
  id: string
  name: string
  waitMinutes: number | null // null = closed/unavailable
  status: 'operating' | 'closed' | 'down' | 'refurbishment'
  lastUpdated: string
}

export interface ThemeParkWithWaits extends ThemePark {
  topRides: RideWaitTime[]
}

/**
 * Attractions response
 */
export interface AttractionsData {
  themeparks: ThemeParkWithWaits[]
  airports: AirportProximity
  beaches: BeachProximity[]
  museums: NearbyAttraction[]
}

export interface AirportProximity {
  mco: TravelTime // Orlando International
  sfb: TravelTime // Sanford
  tpa: TravelTime // Tampa
}

export interface TravelTime {
  code: string
  name: string
  distanceMiles: number
  durationMinutes: number
  durationWithTraffic: number
}

export interface BeachProximity {
  name: string
  distanceMiles: number
  durationMinutes: number
  durationWithTraffic: number
  features: string[] // e.g., ['surfing', 'family-friendly', 'pier']
}

export interface NearbyAttraction {
  id: string
  name: string
  type: string
  rating: number | null
  reviewCount: number
  distanceMiles: number
  address: string
  photoUrl?: string
}

/**
 * Dining data
 */
export interface Restaurant {
  id: string
  name: string
  cuisine: string[]
  rating: number
  reviewCount: number
  priceLevel: 1 | 2 | 3 | 4
  distanceMiles: number
  address: string
  phone?: string
  isOpen: boolean
  photoUrl?: string
  yelpUrl?: string
  googleUrl?: string
  categories: string[]
  highlights?: string[] // e.g., 'Hot & New', 'Good for Groups'
}

export interface DiningData {
  trending: Restaurant[]
  newOpenings: Restaurant[]
  topRated: Restaurant[]
  byCategory: Record<string, Restaurant[]>
}

/**
 * Events data
 */
export interface LocalEvent {
  id: string
  name: string
  description?: string | null
  date: string
  time?: string | null
  endDate?: string | null
  venue: string
  venueAddress?: string | null
  city: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'food' | 'community' | 'other' | string
  genre?: string | null
  priceRange?: string | null
  imageUrl?: string | null
  ticketUrl?: string | null
  source: 'ticketmaster' | 'eventbrite' | 'curated'
  distanceMiles?: number | null
}

export interface EventsData {
  upcoming: LocalEvent[] // All events sorted by date
  thisWeek: LocalEvent[]
  thisWeekend: LocalEvent[]
  family: LocalEvent[]
  free: LocalEvent[]
  byCategory: Record<string, LocalEvent[]>
}

/**
 * Movies data
 */
export interface Movie {
  id: number
  title: string
  overview: string
  posterUrl: string
  backdropUrl?: string
  releaseDate: string
  rating: number
  voteCount: number
  genres: string[]
  runtime?: number
}

export interface Theater {
  id: string
  name: string
  address: string
  distanceMiles: number
  rating?: number
  chain?: string // AMC, Regal, etc.
}

export interface MoviesData {
  nowPlaying: Movie[]
  comingSoon: Movie[]
  theaters: Theater[]
}

/**
 * News data
 */
export interface NewsArticle {
  id: string
  title: string
  description?: string
  source: string
  url: string
  imageUrl?: string
  publishedAt: string
  category?: string
}

export interface CommunityDiscussion {
  id: string
  title: string
  subreddit: string
  score: number
  commentCount: number
  url: string
  createdAt: string
}

export interface NewsData {
  articles: NewsArticle[]
  discussions: CommunityDiscussion[]
  curatedUpdates: CuratedUpdate[]
}

export interface CuratedUpdate {
  id: string
  title: string
  description?: string
  category: 'development' | 'business' | 'infrastructure' | 'event' | 'school' | 'park'
  sourceUrl?: string
  createdAt: string
}

/**
 * Commute data
 */
export interface CommuteDestination {
  id: string
  name: string
  type: 'airport' | 'downtown' | 'beach' | 'theme_park' | 'highway' | 'custom'
  distanceMiles: number
  durationMinutes: number
  durationWithTraffic: number
  trafficLevel: 'light' | 'moderate' | 'heavy'
}

export interface CommuteData {
  destinations: CommuteDestination[]
  summary: {
    nearestHighway: string
    nearestHighwayMiles: number
    downtownOrlandoMinutes: number
    mcoAirportMinutes: number
    nearestBeachMinutes: number
  }
}

/**
 * Lifestyle data (gyms, parks, recreation)
 */
export interface LifestylePlace {
  id: string
  name: string
  type: string
  category: 'fitness' | 'parks' | 'recreation' | 'sports'
  rating?: number
  reviewCount: number
  distanceMiles: number
  address: string
  photoUrl?: string
  amenities?: string[]
}

export interface LifestyleData {
  fitness: LifestylePlace[]
  parks: LifestylePlace[]
  recreation: LifestylePlace[]
  sports: LifestylePlace[]
}

/**
 * Essentials data (grocery, pharmacy, banks)
 */
export interface EssentialPlace {
  id: string
  name: string
  type: string
  category: 'grocery' | 'pharmacy' | 'bank' | 'gas' | 'post_office'
  chain?: string
  distanceMiles: number
  address: string
  isOpen: boolean
  hours?: string
}

export interface EssentialsData {
  grocery: EssentialPlace[]
  pharmacy: EssentialPlace[]
  banks: EssentialPlace[]
  gas: EssentialPlace[]
}

/**
 * Scores data
 */
export interface LocationScores {
  walkScore: number
  walkScoreDescription: string
  transitScore?: number
  transitScoreDescription?: string
  bikeScore?: number
  bikeScoreDescription?: string
  schoolScore?: number
  crimeScore?: number
}

/**
 * Complete location overview
 */
export interface LocationOverview {
  location: {
    lat: number
    lng: number
    formattedAddress?: string
    neighborhood?: string
    city?: string
    county?: string
    state?: string
    zip?: string
  }
  attractions: AttractionsData
  dining: DiningData
  events: EventsData
  movies: MoviesData
  news: NewsData
  commute: CommuteData
  lifestyle: LifestyleData
  essentials: EssentialsData
  scores: LocationScores
}

/**
 * Central Florida specific destinations
 */
export const CENTRAL_FL_DESTINATIONS = {
  themeparks: {
    magicKingdom: { lat: 28.4177, lng: -81.5812, name: 'Magic Kingdom' },
    epcot: { lat: 28.3747, lng: -81.5494, name: 'EPCOT' },
    hollywoodStudios: { lat: 28.3575, lng: -81.5583, name: "Hollywood Studios" },
    animalKingdom: { lat: 28.3553, lng: -81.5901, name: 'Animal Kingdom' },
    universalStudios: { lat: 28.4752, lng: -81.4664, name: 'Universal Studios' },
    islandsOfAdventure: { lat: 28.4722, lng: -81.4699, name: 'Islands of Adventure' },
    seaworld: { lat: 28.4112, lng: -81.4612, name: 'SeaWorld Orlando' },
    legoland: { lat: 28.0986, lng: -81.6908, name: 'LEGOLAND Florida' },
    buschGardens: { lat: 28.0372, lng: -82.4214, name: 'Busch Gardens Tampa' },
  },
  airports: {
    mco: { lat: 28.4312, lng: -81.3081, name: 'Orlando International (MCO)', code: 'MCO' },
    sfb: { lat: 28.7776, lng: -81.2375, name: 'Orlando Sanford (SFB)', code: 'SFB' },
    tpa: { lat: 27.9756, lng: -82.5333, name: 'Tampa International (TPA)', code: 'TPA' },
  },
  beaches: {
    cocoaBeach: { lat: 28.3200, lng: -80.6076, name: 'Cocoa Beach', features: ['surfing', 'pier', 'space-coast'] },
    newSmyrna: { lat: 29.0258, lng: -80.9270, name: 'New Smyrna Beach', features: ['surfing', 'inlet', 'dolphins'] },
    daytonaBeach: { lat: 29.2108, lng: -81.0228, name: 'Daytona Beach', features: ['boardwalk', 'drive-on', 'pier'] },
    clearwaterBeach: { lat: 27.9659, lng: -82.8265, name: 'Clearwater Beach', features: ['calm-water', 'family-friendly', 'sunset'] },
    stPeteBeach: { lat: 27.7253, lng: -82.7412, name: 'St. Pete Beach', features: ['gulf', 'resorts', 'pass-a-grille'] },
  },
  downtown: {
    orlando: { lat: 28.5383, lng: -81.3792, name: 'Downtown Orlando' },
    winterPark: { lat: 28.5994, lng: -81.3394, name: 'Downtown Winter Park' },
    kissimmee: { lat: 28.2920, lng: -81.4076, name: 'Downtown Kissimmee' },
  },
} as const
