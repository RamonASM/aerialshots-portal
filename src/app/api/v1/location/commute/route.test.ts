/**
 * Life Here API - Commute Endpoint Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, OPTIONS } from './route'

// Mock API key validation
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

// Mock commute data - array of CommuteDestination objects
const mockDestinations = [
  { id: 'mco', name: 'Orlando International Airport', type: 'airport', distanceMiles: 15, durationMinutes: 25, durationWithTraffic: 28 },
  { id: 'cocoa-beach', name: 'Cocoa Beach', type: 'beach', distanceMiles: 45, durationMinutes: 50, durationWithTraffic: 55 },
  { id: 'downtown-orlando', name: 'Downtown Orlando', type: 'downtown', distanceMiles: 8, durationMinutes: 15, durationWithTraffic: 18 },
]

const mockCommuteSummary = {
  nearestAirport: { name: 'Orlando International', minutes: 25 },
  nearestBeach: { name: 'Cocoa Beach', minutes: 50 },
  nearestDowntown: { name: 'Downtown Orlando', minutes: 15 },
}

const mockAirportProximity = {
  nearest: { code: 'MCO', name: 'Orlando International', distanceMiles: 15, durationMinutes: 25 },
  alternatives: [],
}

const mockBeachProximity = [
  { name: 'Cocoa Beach', distanceMiles: 45, durationMinutes: 50 },
]

vi.mock('@/lib/integrations/distance/client', () => ({
  getCommuteTimes: vi.fn(() => Promise.resolve(mockDestinations)),
  getCommuteSummary: vi.fn(() => Promise.resolve(mockCommuteSummary)),
  getAirportProximity: vi.fn(() => Promise.resolve(mockAirportProximity)),
  getBeachProximity: vi.fn(() => Promise.resolve(mockBeachProximity)),
  getDistanceMatrix: vi.fn(() => Promise.resolve(new Map())),
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
vi.mock('@/lib/logger', () => {
  const createMockLogger = (): Record<string, unknown> => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => createMockLogger(),
  })
  return {
    apiLogger: createMockLogger(),
    integrationLogger: createMockLogger(),
    formatError: vi.fn((e: Error | null) => ({ message: e?.message })),
  }
})

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-request-id',
}))

describe('Life Here Commute API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OPTIONS', () => {
    it('should handle CORS preflight', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/commute')
      const response = await OPTIONS(request)
      expect(response.status).toBe(204)
    })
  })

  describe('GET', () => {
    it('should return commute data for valid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/commute?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.destinations).toBeDefined()
    })

    it('should include destination data', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/commute?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      // Full commute response includes destinations array, summary, airports, beaches
      expect(data.data.destinations).toBeDefined()
      expect(Array.isArray(data.data.destinations)).toBe(true)
      expect(data.data.summary).toBeDefined()
      expect(data.data.airports).toBeDefined()
      expect(data.data.beaches).toBeDefined()
    })

    it('should return 400 for missing coordinates', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/commute')

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/commute?lat=abc&lng=xyz'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for out of range coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/commute?lat=100&lng=-200'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should include request metadata', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/commute?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.cached).toBeDefined()
    })
  })
})
