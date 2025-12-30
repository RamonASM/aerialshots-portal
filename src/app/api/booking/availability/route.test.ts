/**
 * Availability API Endpoint Tests
 *
 * TDD tests for the availability API route.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, AvailabilityResponse } from './route'

// Helper to create mock NextRequest for POST
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/booking/availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create mock NextRequest for GET with query params
function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/booking/availability')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

describe('Availability API', () => {
  // Use fixed date for consistent testing
  const mockDate = new Date('2025-01-15T10:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('GET /api/booking/availability', () => {
    it('should return availability with default params', async () => {
      const request = createGetRequest({})
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.duration).toBeGreaterThan(0)
      expect(data.durationFormatted).toBeDefined()
      expect(data.slots).toBeInstanceOf(Array)
      expect(data.slots.length).toBe(10) // default count
    })

    it('should use sqft to calculate duration', async () => {
      const smallHome = createGetRequest({ sqft: '1500' })
      const largeHome = createGetRequest({ sqft: '6000' })

      const smallResponse = await GET(smallHome)
      const largeResponse = await GET(largeHome)

      const smallData: AvailabilityResponse = await smallResponse.json()
      const largeData: AvailabilityResponse = await largeResponse.json()

      // Large home should have longer duration (120 base vs 75)
      expect(largeData.duration).toBeGreaterThan(smallData.duration)
    })

    it('should add service durations', async () => {
      const withoutServices = createGetRequest({ sqft: '2000' })
      const withServices = createGetRequest({
        sqft: '2000',
        services: 'droneAddOn,listingVideo',
      })

      const withoutData: AvailabilityResponse = await (await GET(withoutServices)).json()
      const withData: AvailabilityResponse = await (await GET(withServices)).json()

      // 75 base + 20 drone + 45 video = 140
      expect(withoutData.duration).toBe(75)
      expect(withData.duration).toBe(140)
    })

    it('should return correct slot count', async () => {
      const request = createGetRequest({ count: '5' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      expect(data.slots.length).toBe(5)
    })

    it('should return slots with required fields', async () => {
      const request = createGetRequest({ count: '1' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      expect(data.slots[0]).toHaveProperty('slotId')
      expect(data.slots[0]).toHaveProperty('start')
      expect(data.slots[0]).toHaveProperty('end')
      expect(data.slots[0]).toHaveProperty('durationMinutes')
      expect(data.slots[0]).toHaveProperty('available')
    })

    it('should return future slots only', async () => {
      const request = createGetRequest({})
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      const now = mockDate.getTime()
      data.slots.forEach((slot) => {
        expect(new Date(slot.start).getTime()).toBeGreaterThan(now)
      })
    })

    it('should respect dateFrom parameter', async () => {
      const futureDate = '2025-01-20T09:00:00Z'
      const request = createGetRequest({ dateFrom: futureDate })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      const fromTime = new Date(futureDate).getTime()
      data.slots.forEach((slot) => {
        expect(new Date(slot.start).getTime()).toBeGreaterThanOrEqual(fromTime)
      })
    })

    it('should reject invalid dateFrom', async () => {
      const request = createGetRequest({ dateFrom: 'invalid-date' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid dateFrom')
    })

    it('should format duration correctly', async () => {
      const request = createGetRequest({ sqft: '2000', services: 'droneAddOn,listingVideo' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      // 140 minutes = 2 hrs 20 min
      expect(data.durationFormatted).toBe('2 hrs 20 min')
    })
  })

  describe('POST /api/booking/availability', () => {
    it('should accept JSON body', async () => {
      const request = createPostRequest({
        sqft: 2000,
        services: ['droneAddOn', 'listingVideo'],
        count: 5,
      })
      const response = await POST(request)
      const data: AvailabilityResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.duration).toBe(140)
      expect(data.slots.length).toBe(5)
    })

    it('should use defaults for missing params', async () => {
      const request = createPostRequest({})
      const response = await POST(request)
      const data: AvailabilityResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.duration).toBe(75) // 2000 sqft default = 75 min base
      expect(data.slots.length).toBe(10)
    })

    it('should reject invalid dateFrom in body', async () => {
      const request = createPostRequest({ dateFrom: 'not-a-date' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid dateFrom')
    })

    it('should handle empty services array', async () => {
      const request = createPostRequest({ sqft: 2000, services: [] })
      const response = await POST(request)
      const data: AvailabilityResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.duration).toBe(75)
    })
  })

  describe('slot generation', () => {
    it('should generate slots during business hours (9-5)', async () => {
      const request = createGetRequest({ count: '20' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      data.slots.forEach((slot) => {
        const startDate = new Date(slot.start)
        const startHour = startDate.getHours() // Use local hours
        expect(startHour).toBeGreaterThanOrEqual(9)
        expect(startHour).toBeLessThan(17) // Start before 5 PM
      })
    })

    it('should not generate slots on weekends', async () => {
      // Start from a Saturday
      const saturday = '2025-01-18T09:00:00Z'
      const request = createGetRequest({ dateFrom: saturday, count: '10' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      data.slots.forEach((slot) => {
        const day = new Date(slot.start).getDay() // Use local day
        expect(day).not.toBe(0) // Not Sunday
        expect(day).not.toBe(6) // Not Saturday
      })
    })

    it('should ensure shoot ends by 6 PM', async () => {
      // Request slots with long duration
      const request = createGetRequest({ sqft: '6000', services: 'signatureVid' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      data.slots.forEach((slot) => {
        const endDate = new Date(slot.end)
        const endHour = endDate.getHours() // Use local hours
        expect(endHour).toBeLessThanOrEqual(18)
      })
    })

    it('should generate unique slot IDs', async () => {
      const request = createGetRequest({ count: '10' })
      const response = await GET(request)
      const data: AvailabilityResponse = await response.json()

      const slotIds = data.slots.map((s) => s.slotId)
      const uniqueIds = new Set(slotIds)
      expect(uniqueIds.size).toBe(slotIds.length)
    })
  })
})
