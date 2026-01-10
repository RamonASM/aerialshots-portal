/**
 * Life Here API - Scores Endpoint Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, OPTIONS } from './route'

// Mock API key validation
import { NextResponse } from 'next/server'

vi.mock('@/lib/api/middleware/api-key', () => ({
  validateApiKey: vi.fn(() => Promise.resolve({
    valid: true,
    keyData: { id: 'test-key', name: 'Test Key', rateLimitTier: 'standard' },
  })),
  apiError: vi.fn((code, message, status, _requestId) =>
    NextResponse.json({ error: { code, message } }, { status })
  ),
}))

// Mock rate limiting
vi.mock('@/lib/api/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 99 })),
  addRateLimitHeaders: vi.fn((response) => response),
}))

// Mock CORS
vi.mock('@/lib/api/middleware/cors', () => ({
  addCorsHeaders: vi.fn((response) => response),
  handleCorsPrelight: vi.fn(() => new Response(null, { status: 204 })),
}))

// Mock scoring
const mockScoreResult = {
  overall: 75,
  label: 'Excellent',
  profile: 'balanced',
  calculatedAt: new Date().toISOString(),
  dining: {
    score: 80,
    label: 'Great',
    details: 'Many dining options',
    restaurantCount: 50,
    topRestaurants: ['Restaurant A', 'Restaurant B'],
    cuisineTypes: ['American', 'Italian'],
  },
  convenience: {
    score: 70,
    label: 'Good',
    details: 'Convenient area',
    nearestGroceryMiles: 0.5,
    has24HourPharmacy: true,
  },
  lifestyle: {
    score: 75,
    label: 'Great',
    details: 'Active lifestyle options',
    gymCount: 5,
    parkCount: 3,
    entertainmentVenues: 10,
  },
  commute: {
    score: 72,
    label: 'Good',
    details: 'Reasonable commute times',
    airportMinutes: 25,
    beachMinutes: 45,
    downtownMinutes: 15,
    themeParkMinutes: 30,
  },
}

vi.mock('@/lib/scoring', () => ({
  calculateLifeHereScore: vi.fn(() => Promise.resolve(mockScoreResult)),
}))

// Mock cache
vi.mock('@/lib/api/cache', () => ({
  withLocationCache: vi.fn(async (_lat, _lng, _category, fn) => {
    const data = await fn()
    return {
      data,
      meta: { cached: false, cachedAt: null, responseTime: 50 },
    }
  }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  formatError: vi.fn((e) => ({ message: e?.message })),
}))

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-request-id',
}))

describe('Life Here Scores API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OPTIONS', () => {
    it('should handle CORS preflight', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/scores')
      const response = await OPTIONS(request)
      expect(response.status).toBe(204)
    })
  })

  describe('GET', () => {
    it('should return scores for valid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.lifeHereScore).toBeDefined()
      expect(data.data.lifeHereScore.score).toBe(75)
      expect(data.data.lifeHereScore.label).toBe('Excellent')
    })

    it('should return scores with profile breakdown', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=28.5383&lng=-81.3792&profile=family'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.scores).toBeDefined()
      expect(data.data.scores.dining).toBeDefined()
      expect(data.data.scores.convenience).toBeDefined()
      expect(data.data.scores.lifestyle).toBeDefined()
      expect(data.data.scores.commute).toBeDefined()
    })

    it('should return 400 for missing coordinates', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/scores')

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=abc&lng=xyz'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for out of range coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=100&lng=-200'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should default to balanced profile if invalid', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=28.5383&lng=-81.3792&profile=invalid'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.profileInfo.name).toBe('Balanced Lifestyle')
    })

    it('should include available profiles in meta', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.meta.availableProfiles).toContain('balanced')
      expect(data.meta.availableProfiles).toContain('family')
      expect(data.meta.availableProfiles).toContain('professional')
      expect(data.meta.availableProfiles).toContain('active')
      expect(data.meta.availableProfiles).toContain('foodie')
    })

    it('should include request metadata', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/scores?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.source).toBe('lifehere.api')
    })
  })
})
