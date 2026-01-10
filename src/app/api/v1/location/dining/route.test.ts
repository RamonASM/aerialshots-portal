/**
 * Life Here API - Dining Endpoint Tests
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

// Mock Yelp client
const mockDiningData = {
  restaurants: [
    { name: 'Pizza Place', cuisine: 'Italian', rating: 4.5, priceLevel: '$$' },
    { name: 'Burger Joint', cuisine: 'American', rating: 4.2, priceLevel: '$' },
  ],
  total: 50,
  cuisineBreakdown: { Italian: 15, American: 20, Mexican: 10, Asian: 5 },
  avgRating: 4.3,
}

vi.mock('@/lib/integrations/yelp/client', () => ({
  getDiningData: vi.fn(() => Promise.resolve(mockDiningData)),
  searchDining: vi.fn(() => Promise.resolve([
    { name: 'Search Result', cuisine: 'American', rating: 4.0 },
  ])),
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
  withCache: vi.fn(async (_key, _category, fn) => {
    const data = await fn()
    return {
      data,
      meta: { cached: false, cachedAt: null, responseTime: 50 },
    }
  }),
  createApiCacheKey: vi.fn((...args) => args.join(':')),
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

describe('Life Here Dining API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OPTIONS', () => {
    it('should handle CORS preflight', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/dining')
      const response = await OPTIONS(request)
      expect(response.status).toBe(204)
    })
  })

  describe('GET', () => {
    it('should return dining data for valid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.restaurants).toBeDefined()
      expect(data.data.total).toBe(50)
    })

    it('should return cuisine breakdown', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.cuisineBreakdown).toBeDefined()
      expect(data.data.cuisineBreakdown.Italian).toBe(15)
    })

    it('should handle search parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=28.5383&lng=-81.3792&search=pizza'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.search).toBeDefined()
      expect(data.data.search.query).toBe('pizza')
    })

    it('should handle category parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=28.5383&lng=-81.3792&category=italian'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.category).toBeDefined()
      expect(data.data.category.name).toBe('italian')
    })

    it('should return 400 for missing coordinates', async () => {
      const request = new NextRequest('http://localhost/api/v1/location/dining')

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=abc&lng=xyz'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 for out of range coordinates', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=100&lng=-200'
      )

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should include request metadata', async () => {
      const request = new NextRequest(
        'http://localhost/api/v1/location/dining?lat=28.5383&lng=-81.3792'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.meta.requestId).toBeDefined()
      expect(data.meta.cached).toBeDefined()
      expect(data.meta.responseTime).toBeDefined()
    })
  })
})
