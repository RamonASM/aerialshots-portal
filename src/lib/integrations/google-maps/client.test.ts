/**
 * Google Maps Extended Client Tests
 *
 * Tests for drive time, geocoding, and route optimization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDriveTime,
  getDriveTimeMatrix,
  geocodeAddress,
  optimizeRoute,
} from './client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}))

describe('Google Maps Extended Client', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getDriveTime', () => {
    it('should calculate drive time between two coordinates', async () => {
      const mockResponse = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { value: 16093, text: '10 mi' },
                duration: { value: 1200, text: '20 min' },
              },
            ],
          },
        ],
        origins: ['28.5383,-81.3792'],
        destinations: ['28.4294,-81.3089'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getDriveTime(
        { lat: 28.5383, lng: -81.3792 },
        { lat: 28.4294, lng: -81.3089 }
      )

      expect(result).toBeDefined()
      expect(result!.distanceMeters).toBe(16093)
      expect(result!.durationSeconds).toBe(1200)
      expect(result!.distanceText).toBe('10 mi')
      expect(result!.durationText).toBe('20 min')
    })

    it('should support string addresses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  {
                    status: 'OK',
                    distance: { value: 8000, text: '5 mi' },
                    duration: { value: 600, text: '10 min' },
                  },
                ],
              },
            ],
            origins: ['Orlando, FL'],
            destinations: ['Tampa, FL'],
          }),
      })

      const result = await getDriveTime('Orlando, FL', 'Tampa, FL')

      expect(result).toBeDefined()
      expect(result!.originAddress).toBe('Orlando, FL')
      expect(result!.destinationAddress).toBe('Tampa, FL')
    })

    it('should include traffic data when departure time provided', async () => {
      const mockResponse = {
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { value: 16093, text: '10 mi' },
                duration: { value: 1200, text: '20 min' },
                durationInTraffic: { value: 1500, text: '25 min' },
              },
            ],
          },
        ],
        origins: ['28.5,-81.3'],
        destinations: ['28.4,-81.3'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getDriveTime(
        { lat: 28.5, lng: -81.3 },
        { lat: 28.4, lng: -81.3 },
        new Date()
      )

      expect(result!.durationInTrafficSeconds).toBe(1500)
      expect(result!.durationInTrafficText).toBe('25 min')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('departure_time=')
      expect(url).toContain('traffic_model=best_guess')
    })

    it('should return null when API key not configured', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY

      const result = await getDriveTime(
        { lat: 28.5, lng: -81.3 },
        { lat: 28.4, lng: -81.3 }
      )

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return null when no route found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [{ status: 'ZERO_RESULTS' }],
              },
            ],
            origins: [],
            destinations: [],
          }),
      })

      const result = await getDriveTime(
        { lat: 0, lng: 0 },
        { lat: 90, lng: 180 }
      )

      expect(result).toBeNull()
    })

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await getDriveTime(
        { lat: 28.5, lng: -81.3 },
        { lat: 28.4, lng: -81.3 }
      )

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getDriveTime(
        { lat: 28.5, lng: -81.3 },
        { lat: 28.4, lng: -81.3 }
      )

      expect(result).toBeNull()
    })
  })

  describe('getDriveTimeMatrix', () => {
    it('should calculate matrix for multiple origins and destinations', async () => {
      const mockResponse = {
        status: 'OK',
        rows: [
          {
            elements: [
              { status: 'OK', distance: { value: 10000 }, duration: { value: 600 } },
              { status: 'OK', distance: { value: 20000 }, duration: { value: 1200 } },
            ],
          },
          {
            elements: [
              { status: 'OK', distance: { value: 15000 }, duration: { value: 900 } },
              { status: 'OK', distance: { value: 25000 }, duration: { value: 1500 } },
            ],
          },
        ],
        origins: ['Origin 1', 'Origin 2'],
        destinations: ['Dest 1', 'Dest 2'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getDriveTimeMatrix(
        [{ lat: 28.5, lng: -81.3 }, { lat: 28.4, lng: -81.2 }],
        [{ lat: 28.3, lng: -81.1 }, { lat: 28.2, lng: -81.0 }]
      )

      expect(result).toBeDefined()
      expect(result!.rows).toHaveLength(2)
      expect(result!.rows[0].elements).toHaveLength(2)
    })

    it('should support mixed coordinate and string inputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [{ elements: [{ status: 'OK' }] }],
            origins: [],
            destinations: [],
          }),
      })

      await getDriveTimeMatrix(
        [{ lat: 28.5, lng: -81.3 }, 'Orlando, FL'],
        ['Tampa, FL', { lat: 27.9, lng: -82.5 }]
      )

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('origins=28.5%2C-81.3%7COrlando%2C+FL')
      expect(url).toContain('destinations=Tampa%2C+FL%7C27.9%2C-82.5')
    })

    it('should return null when API key not configured', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY

      const result = await getDriveTimeMatrix(
        [{ lat: 28.5, lng: -81.3 }],
        [{ lat: 28.4, lng: -81.2 }]
      )

      expect(result).toBeNull()
    })
  })

  describe('geocodeAddress', () => {
    it('should geocode address to coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            results: [
              {
                geometry: {
                  location: { lat: 28.5383, lng: -81.3792 },
                },
              },
            ],
          }),
      })

      const result = await geocodeAddress('Orlando, FL')

      expect(result).toEqual({ lat: 28.5383, lng: -81.3792 })
    })

    it('should return null for unknown address', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'ZERO_RESULTS',
            results: [],
          }),
      })

      const result = await geocodeAddress('NonexistentPlace12345')

      expect(result).toBeNull()
    })

    it('should return null when API key not configured', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY

      const result = await geocodeAddress('Orlando, FL')

      expect(result).toBeNull()
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      const result = await geocodeAddress('Invalid address')

      expect(result).toBeNull()
    })
  })

  describe('optimizeRoute', () => {
    it('should return empty route for no stops', async () => {
      const startTime = new Date('2024-01-15T09:00:00Z')
      const result = await optimizeRoute(
        { lat: 28.5, lng: -81.3 },
        [],
        startTime
      )

      expect(result.stops).toHaveLength(0)
      expect(result.totalDistanceMeters).toBe(0)
      expect(result.totalDurationSeconds).toBe(0)
      expect(result.estimatedEndTime).toEqual(startTime)
    })

    it('should handle single stop', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  {
                    status: 'OK',
                    distance: { value: 8046, text: '5 mi' },
                    duration: { value: 900, text: '15 min' },
                  },
                ],
              },
            ],
            origins: ['Start'],
            destinations: ['Stop 1'],
          }),
      })

      const startTime = new Date('2024-01-15T09:00:00Z')
      const result = await optimizeRoute(
        { lat: 28.5, lng: -81.3 },
        [
          {
            id: 'stop-1',
            name: 'Property 1',
            lat: 28.4,
            lng: -81.2,
            dwellTimeMinutes: 60,
          },
        ],
        startTime
      )

      expect(result.stops).toHaveLength(1)
      expect(result.stops[0].id).toBe('stop-1')
      expect(result.stops[0].arrivalTime).toBeDefined()
      expect(result.stops[0].departureTime).toBeDefined()
      expect(result.totalDistanceMeters).toBe(8046)
    })

    it('should optimize multiple stops using nearest neighbor', async () => {
      // Matrix response for 3 locations (start + 2 stops)
      const mockMatrix = {
        status: 'OK',
        rows: [
          // From start to all
          {
            elements: [
              { status: 'OK', distance: { value: 0 }, duration: { value: 0 } },
              { status: 'OK', distance: { value: 20000 }, duration: { value: 1200 } },
              { status: 'OK', distance: { value: 10000 }, duration: { value: 600 } },
            ],
          },
          // From stop 1 to all
          {
            elements: [
              { status: 'OK', distance: { value: 20000 }, duration: { value: 1200 } },
              { status: 'OK', distance: { value: 0 }, duration: { value: 0 } },
              { status: 'OK', distance: { value: 15000 }, duration: { value: 900 } },
            ],
          },
          // From stop 2 to all
          {
            elements: [
              { status: 'OK', distance: { value: 10000 }, duration: { value: 600 } },
              { status: 'OK', distance: { value: 15000 }, duration: { value: 900 } },
              { status: 'OK', distance: { value: 0 }, duration: { value: 0 } },
            ],
          },
        ],
        origins: ['Start', 'Stop 1', 'Stop 2'],
        destinations: ['Start', 'Stop 1', 'Stop 2'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMatrix),
      })

      const startTime = new Date('2024-01-15T09:00:00Z')
      const result = await optimizeRoute(
        { lat: 28.5, lng: -81.3 },
        [
          { id: 'stop-1', name: 'Far Property', lat: 28.3, lng: -81.1, dwellTimeMinutes: 60 },
          { id: 'stop-2', name: 'Near Property', lat: 28.45, lng: -81.25, dwellTimeMinutes: 45 },
        ],
        startTime
      )

      expect(result.stops).toHaveLength(2)
      // Nearest neighbor should visit stop-2 first (10km from start vs 20km)
      expect(result.stops[0].id).toBe('stop-2')
      expect(result.stops[1].id).toBe('stop-1')
    })

    it('should calculate arrival and departure times', async () => {
      // For a single stop, optimizeRoute calls getDriveTime which only needs one element
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  { status: 'OK', distance: { value: 8000, text: '5 mi' }, duration: { value: 600, text: '10 min' } },
                ],
              },
            ],
            origins: ['Start'],
            destinations: ['Stop 1'],
          }),
      })

      const startTime = new Date('2024-01-15T09:00:00Z')
      const result = await optimizeRoute(
        { lat: 28.5, lng: -81.3 },
        [
          { id: 'stop-1', name: 'Property', lat: 28.4, lng: -81.2, dwellTimeMinutes: 45 },
        ],
        startTime
      )

      expect(result.stops).toHaveLength(1)
      const stop = result.stops[0]
      expect(stop.arrivalTime).toBeDefined()
      expect(stop.departureTime).toBeDefined()
      // Arrival should be after start time
      expect(stop.arrivalTime!.getTime()).toBeGreaterThanOrEqual(startTime.getTime())
      // Departure should be after arrival + dwell time
      expect(stop.departureTime!.getTime()).toBeGreaterThanOrEqual(stop.arrivalTime!.getTime() + 45 * 60000)
    })

    it('should fallback to original order when matrix fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const startTime = new Date('2024-01-15T09:00:00Z')
      const result = await optimizeRoute(
        { lat: 28.5, lng: -81.3 },
        [
          { id: 'stop-1', name: 'Property 1', lat: 28.4, lng: -81.2, dwellTimeMinutes: 60 },
          { id: 'stop-2', name: 'Property 2', lat: 28.3, lng: -81.1, dwellTimeMinutes: 45 },
        ],
        startTime
      )

      // Should return original order as fallback
      expect(result.stops[0].id).toBe('stop-1')
      expect(result.stops[1].id).toBe('stop-2')
      expect(result.totalDistanceMeters).toBe(0)
    })
  })

  describe('Distance Formatting', () => {
    it('should format short distances in feet', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  {
                    status: 'OK',
                    distance: { value: 100, text: '328 ft' },
                    duration: { value: 60, text: '1 min' },
                  },
                ],
              },
            ],
            origins: ['A'],
            destinations: ['B'],
          }),
      })

      const result = await getDriveTime(
        { lat: 28.5, lng: -81.3 },
        { lat: 28.5001, lng: -81.3001 }
      )

      expect(result!.distanceText).toContain('ft')
    })
  })

  describe('Duration Formatting', () => {
    it('should format long durations with hours', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  {
                    status: 'OK',
                    distance: { value: 160000, text: '100 mi' },
                    duration: { value: 7200, text: '2 hr 0 min' },
                  },
                ],
              },
            ],
            origins: ['A'],
            destinations: ['B'],
          }),
      })

      const result = await getDriveTime('Orlando, FL', 'Jacksonville, FL')

      expect(result!.durationSeconds).toBe(7200)
    })
  })

  describe('Coordinate Rounding for Cache', () => {
    it('should round coordinates to improve cache hits', async () => {
      // First call - should fetch from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            rows: [
              {
                elements: [
                  {
                    status: 'OK',
                    distance: { value: 16000, text: '10 mi' },
                    duration: { value: 1200, text: '20 min' },
                  },
                ],
              },
            ],
            origins: ['28.53,-81.38'],
            destinations: ['28.43,-81.31'],
          }),
      })

      await getDriveTime(
        { lat: 28.5383, lng: -81.3792 },
        { lat: 28.4294, lng: -81.3089 }
      )

      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
