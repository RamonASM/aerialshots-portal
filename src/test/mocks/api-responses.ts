// Mock API responses for testing Life Here API integrations

import type {
  ThemeParkWithWaits,
  Restaurant,
  LocalEvent,
  Movie,
  Theater,
  NewsArticle,
  CommuteDestination,
} from '@/lib/api/types'

// Theme Parks Mock Data
export const mockThemePark: ThemeParkWithWaits = {
  id: 'magic-kingdom',
  name: 'Magic Kingdom',
  slug: 'magic-kingdom',
  distanceMiles: 25.3,
  driveDurationMinutes: 35,
  driveDurationWithTraffic: 42,
  isOpen: true,
  topRides: [
    { id: 'space-mountain', name: 'Space Mountain', waitMinutes: 45, status: 'operating' as const, lastUpdated: new Date().toISOString() },
    { id: 'big-thunder', name: 'Big Thunder Mountain', waitMinutes: 30, status: 'operating' as const, lastUpdated: new Date().toISOString() },
    { id: 'haunted-mansion', name: 'Haunted Mansion', waitMinutes: 25, status: 'operating' as const, lastUpdated: new Date().toISOString() },
  ],
}

export const mockThemeParks: ThemeParkWithWaits[] = [
  mockThemePark,
  {
    id: 'epcot',
    name: 'EPCOT',
    slug: 'epcot',
    distanceMiles: 22.1,
    driveDurationMinutes: 32,
    driveDurationWithTraffic: 38,
    isOpen: true,
    topRides: [
      { id: 'guardians', name: 'Guardians of the Galaxy', waitMinutes: 60, status: 'operating' as const, lastUpdated: new Date().toISOString() },
      { id: 'test-track', name: 'Test Track', waitMinutes: 45, status: 'operating' as const, lastUpdated: new Date().toISOString() },
    ],
  },
]

// ThemeParks.wiki API mock response
export const mockThemeParksApiResponse = {
  id: 'waltdisneyworldmagickingdom',
  name: 'Magic Kingdom',
  liveData: [
    {
      id: 'spacemountain',
      name: 'Space Mountain',
      entityType: 'ATTRACTION',
      status: 'OPERATING',
      queue: { STANDBY: { waitTime: 45 } },
    },
    {
      id: 'bigthundermountain',
      name: 'Big Thunder Mountain Railroad',
      entityType: 'ATTRACTION',
      status: 'OPERATING',
      queue: { STANDBY: { waitTime: 30 } },
    },
  ],
}

// Restaurant Mock Data
export const mockRestaurant: Restaurant = {
  id: 'restaurant-123',
  name: 'The Test Kitchen',
  cuisine: ['American', 'Modern'],
  rating: 4.5,
  reviewCount: 234,
  priceLevel: 2,
  distanceMiles: 1.2,
  address: '123 Main St, Orlando, FL 32801',
  phone: '(407) 555-1234',
  isOpen: true,
  photoUrl: 'https://example.com/photo.jpg',
  yelpUrl: 'https://yelp.com/biz/test-kitchen',
  categories: ['newamerican', 'cocktailbars'],
  highlights: ['Hot & New', 'Highly Rated'],
}

export const mockRestaurants: Restaurant[] = [
  mockRestaurant,
  {
    id: 'restaurant-456',
    name: 'Sushi Paradise',
    cuisine: ['Japanese', 'Sushi'],
    rating: 4.8,
    reviewCount: 567,
    priceLevel: 3,
    distanceMiles: 2.5,
    address: '456 Oak Ave, Orlando, FL 32801',
    phone: '(407) 555-5678',
    isOpen: true,
    photoUrl: 'https://example.com/sushi.jpg',
    yelpUrl: 'https://yelp.com/biz/sushi-paradise',
    categories: ['japanese', 'sushi'],
    highlights: ['Popular'],
  },
]

// Yelp API mock response
export const mockYelpSearchResponse = {
  businesses: [
    {
      id: 'restaurant-123',
      name: 'The Test Kitchen',
      image_url: 'https://example.com/photo.jpg',
      url: 'https://yelp.com/biz/test-kitchen',
      review_count: 234,
      categories: [
        { alias: 'newamerican', title: 'American' },
        { alias: 'cocktailbars', title: 'Cocktail Bars' },
      ],
      rating: 4.5,
      coordinates: { latitude: 28.5383, longitude: -81.3792 },
      price: '$$',
      location: {
        address1: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zip_code: '32801',
        display_address: ['123 Main St', 'Orlando, FL 32801'],
      },
      phone: '+14075551234',
      display_phone: '(407) 555-1234',
      distance: 1931.21,
      is_closed: false,
      attributes: { hot_and_new: true },
    },
  ],
  total: 1,
}

// Event Mock Data
export const mockEvent: LocalEvent = {
  id: 'event-123',
  name: 'Orlando Magic vs. Miami Heat',
  description: 'NBA Basketball Game',
  date: '2024-12-28',
  time: '7:00 PM',
  endDate: '2024-12-28T22:00:00',
  venue: 'Amway Center',
  venueAddress: '400 W Church St, Orlando, FL',
  city: 'Orlando',
  category: 'sports',
  priceRange: '$45 - $250',
  imageUrl: 'https://example.com/magic.jpg',
  ticketUrl: 'https://ticketmaster.com/event/123',
  source: 'ticketmaster',
  distanceMiles: 3.2,
}

export const mockEvents: LocalEvent[] = [
  mockEvent,
  {
    id: 'event-456',
    name: 'Community Farmers Market',
    description: 'Weekly farmers market with local produce',
    date: '2024-12-29',
    time: '9:00 AM',
    venue: 'Lake Eola Park',
    city: 'Orlando',
    category: 'community',
    priceRange: 'Free',
    ticketUrl: 'https://eventbrite.com/event/456',
    source: 'eventbrite',
  },
]

// Eventbrite API mock response
export const mockEventbriteResponse = {
  events: [
    {
      id: 'event-456',
      name: { text: 'Community Farmers Market', html: '<p>Community Farmers Market</p>' },
      description: { text: 'Weekly farmers market', html: '<p>Weekly farmers market</p>' },
      url: 'https://eventbrite.com/event/456',
      start: { local: '2024-12-29T09:00:00', utc: '2024-12-29T14:00:00Z' },
      end: { local: '2024-12-29T14:00:00', utc: '2024-12-29T19:00:00Z' },
      is_free: true,
      logo: { url: 'https://example.com/market.jpg' },
      venue_id: 'venue-123',
      category_id: '113',
      online_event: false,
    },
  ],
  pagination: {
    object_count: 1,
    page_number: 1,
    page_size: 50,
    page_count: 1,
    has_more_items: false,
  },
}

// Movie Mock Data
export const mockMovie: Movie = {
  id: 123,
  title: 'Test Movie',
  overview: 'A thrilling adventure about testing software.',
  posterUrl: 'https://image.tmdb.org/t/p/w342/test.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/w780/test-backdrop.jpg',
  releaseDate: '2024-12-20',
  rating: 8.2,
  voteCount: 1234,
  genres: ['Action', 'Adventure'],
  runtime: 120,
}

export const mockMovies: Movie[] = [
  mockMovie,
  {
    id: 456,
    title: 'Comedy Central',
    overview: 'A hilarious comedy about nothing.',
    posterUrl: 'https://image.tmdb.org/t/p/w342/comedy.jpg',
    releaseDate: '2024-12-25',
    rating: 7.5,
    voteCount: 567,
    genres: ['Comedy'],
  },
]

// TMDb API mock response
export const mockTmdbResponse = {
  results: [
    {
      id: 123,
      title: 'Test Movie',
      overview: 'A thrilling adventure about testing software.',
      poster_path: '/test.jpg',
      backdrop_path: '/test-backdrop.jpg',
      release_date: '2024-12-20',
      vote_average: 8.2,
      vote_count: 1234,
      genre_ids: [28, 12],
      runtime: 120,
    },
  ],
  page: 1,
  total_pages: 1,
  total_results: 1,
}

// Theater Mock Data
export const mockTheater: Theater = {
  id: 'theater-123',
  name: 'AMC Disney Springs',
  address: '1500 E Buena Vista Dr, Lake Buena Vista, FL',
  distanceMiles: 3.2,
  rating: 4.3,
  chain: 'AMC',
}

// News Mock Data
export const mockNewsArticle: NewsArticle = {
  id: 'news-123',
  title: 'Orlando Real Estate Market Update',
  description: 'The Orlando housing market continues to grow...',
  source: 'Orlando Sentinel',
  url: 'https://orlandosentinel.com/article/123',
  imageUrl: 'https://example.com/news.jpg',
  publishedAt: '2024-12-24T10:00:00Z',
  category: 'real_estate',
}

// News API mock response
export const mockNewsApiResponse = {
  status: 'ok',
  totalResults: 1,
  articles: [
    {
      source: { id: null, name: 'Orlando Sentinel' },
      author: 'John Doe',
      title: 'Orlando Real Estate Market Update',
      description: 'The Orlando housing market continues to grow...',
      url: 'https://orlandosentinel.com/article/123',
      urlToImage: 'https://example.com/news.jpg',
      publishedAt: '2024-12-24T10:00:00Z',
      content: 'Full article content here...',
    },
  ],
}

// Reddit API mock response
export const mockRedditResponse = {
  data: {
    children: [
      {
        data: {
          id: 'reddit123',
          title: 'Best neighborhoods in Orlando?',
          subreddit: 'orlando',
          score: 156,
          num_comments: 89,
          permalink: '/r/orlando/comments/reddit123/best_neighborhoods/',
          created_utc: 1703433600,
          selftext: 'Looking for recommendations...',
        },
      },
    ],
  },
}

// Commute Mock Data
export const mockCommuteDestination: CommuteDestination = {
  id: 'magic-kingdom',
  name: 'Magic Kingdom',
  type: 'theme_park',
  distanceMiles: 25,
  durationMinutes: 35,
  durationWithTraffic: 42,
  trafficLevel: 'moderate',
}

export const mockCommuteDestinations: CommuteDestination[] = [
  mockCommuteDestination,
  {
    id: 'mco',
    name: 'Orlando International Airport',
    type: 'airport',
    distanceMiles: 18,
    durationMinutes: 28,
    durationWithTraffic: 35,
    trafficLevel: 'moderate',
  },
]

// Google Distance Matrix mock response
export const mockDistanceMatrixResponse = {
  status: 'OK',
  rows: [
    {
      elements: [
        {
          status: 'OK',
          distance: { text: '25 mi', value: 40234 },
          duration: { text: '35 mins', value: 2100 },
          duration_in_traffic: { text: '42 mins', value: 2520 },
        },
      ],
    },
  ],
}

// Walk Score mock response
export const mockWalkScoreResponse = {
  status: 1,
  walkscore: 72,
  description: 'Very Walkable',
  transit: {
    score: 45,
    description: 'Some Transit',
  },
  bike: {
    score: 68,
    description: 'Bikeable',
  },
}

// Google Places mock response
export const mockPlacesResponse = {
  results: [
    {
      place_id: 'place-123',
      name: 'LA Fitness',
      types: ['gym', 'health'],
      geometry: {
        location: { lat: 28.54, lng: -81.38 },
      },
      vicinity: '123 Fitness Way, Orlando, FL',
      rating: 4.2,
      user_ratings_total: 345,
      opening_hours: { open_now: true },
      photos: [{ photo_reference: 'photo123' }],
    },
  ],
}

// API Key mock data
export const mockApiKeyData = {
  id: 'key-123',
  user_id: 'user-123',
  key_hash: 'hashed_key_value',
  key_prefix: 'lh_live_xxxx',
  name: 'Test API Key',
  tier: 'free' as const,
  monthly_limit: 3000,
  requests_this_month: 100,
  is_active: true,
  created_at: '2024-12-01T00:00:00Z',
  last_used_at: '2024-12-24T12:00:00Z',
}

// Helper to create mock Response
export function createMockResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response
}

// Helper to create NextRequest mock
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
  } = {}
): Request {
  const { method = 'GET', headers = {}, body } = options

  return {
    url,
    method,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Request
}
