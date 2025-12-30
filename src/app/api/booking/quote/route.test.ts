/**
 * Quote API Endpoint Tests
 *
 * TDD tests for the quote API route.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

// Helper to create mock NextRequest for POST
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/booking/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create mock NextRequest for GET with query params
function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/booking/quote')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

describe('Quote API', () => {
  describe('POST /api/booking/quote', () => {
    describe('validation', () => {
      it('should require sqft', async () => {
        const request = createPostRequest({})
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('sqft')
      })

      it('should require sqft to be a number', async () => {
        const request = createPostRequest({ sqft: 'abc' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('sqft')
      })

      it('should require either packageKey or services', async () => {
        const request = createPostRequest({ sqft: 2000 })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('packageKey')
      })

      it('should reject invalid package key', async () => {
        const request = createPostRequest({ sqft: 2000, packageKey: 'invalid' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid package')
      })
    })

    describe('package quotes', () => {
      it('should compute essentials package quote', async () => {
        const request = createPostRequest({ sqft: 2000, packageKey: 'essentials' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.bucket).toBe('1501_2500')
        expect(data.tierKey).toBe('_2001_2500')
        expect(data.items).toHaveLength(1)
        expect(data.items[0].type).toBe('package')
        expect(data.items[0].id).toBe('essentials')
        expect(data.total).toBe(375)
      })

      it('should compute signature package quote', async () => {
        const request = createPostRequest({ sqft: 3000, packageKey: 'signature' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.bucket).toBe('2501_3500')
        expect(data.total).toBe(579)
      })

      it('should compute luxury package quote', async () => {
        const request = createPostRequest({ sqft: 1500, packageKey: 'luxury' })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.bucket).toBe('lt1500')
        expect(data.total).toBe(649)
      })

      it('should add addon for service not in package', async () => {
        const request = createPostRequest({
          sqft: 2000,
          packageKey: 'essentials',
          services: ['realTwilight'],
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.items).toHaveLength(2)
        expect(data.items[1].type).toBe('addon')
        expect(data.items[1].id).toBe('realTwilight')
        expect(data.total).toBe(375 + 150)
      })

      it('should not double-charge for included services', async () => {
        const request = createPostRequest({
          sqft: 2000,
          packageKey: 'essentials',
          services: ['droneAddOn', 'zillow3d'],
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.items).toHaveLength(1)
        expect(data.total).toBe(375)
      })
    })

    describe('a la carte quotes', () => {
      it('should compute photos only quote', async () => {
        const request = createPostRequest({ sqft: 2000, services: ['photos'] })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.items).toHaveLength(1)
        expect(data.items[0].id).toBe('photos')
        expect(data.total).toBe(225)
      })

      it('should compute multi-service quote', async () => {
        const request = createPostRequest({
          sqft: 2000,
          services: ['photos', 'droneAddOn', 'listingVideo'],
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.items).toHaveLength(3)
        expect(data.total).toBe(225 + 75 + 350)
      })
    })

    describe('sqft tiers', () => {
      it('should use correct tier for small home', async () => {
        const request = createPostRequest({ sqft: 1400, packageKey: 'essentials' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.bucket).toBe('lt1500')
        expect(data.tierKey).toBe('under2000')
        expect(data.total).toBe(315)
      })

      it('should use correct tier for large home', async () => {
        const request = createPostRequest({ sqft: 6000, packageKey: 'essentials' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.bucket).toBe('5001_10000')
        expect(data.tierKey).toBe('_5001_10000')
        expect(data.total).toBe(580)
      })
    })
  })

  describe('GET /api/booking/quote', () => {
    it('should require sqft query param', async () => {
      const request = createGetRequest({})
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sqft')
    })

    it('should require package or services', async () => {
      const request = createGetRequest({ sqft: '2000' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('package')
    })

    it('should compute quote with package query param', async () => {
      const request = createGetRequest({ sqft: '2000', package: 'essentials' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total).toBe(375)
    })

    it('should compute quote with services query param', async () => {
      const request = createGetRequest({ sqft: '2000', services: 'photos,droneAddOn' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total).toBe(225 + 75)
    })
  })
})
