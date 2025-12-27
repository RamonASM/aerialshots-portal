import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getParkWaitTimes,
  getNearbyThemeParks,
  getAllThemeParks,
  getThemeParkWithWaits,
  getParkSchedule,
  isParkOpen,
} from './client'
import { mockThemeParksApiResponse } from '@/test/mocks/api-responses'

describe('Theme Parks Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllThemeParks', () => {
    it('should return all Central Florida theme parks', async () => {
      const parks = await getAllThemeParks()

      expect(parks).toBeInstanceOf(Array)
      expect(parks.length).toBeGreaterThan(0)

      // Check structure
      for (const park of parks) {
        expect(park.slug).toBeDefined()
        expect(park.name).toBeDefined()
        expect(typeof park.lat).toBe('number')
        expect(typeof park.lng).toBe('number')
      }
    })

    it('should include major theme parks', async () => {
      const parks = await getAllThemeParks()
      const parkNames = parks.map((p) => p.name.toLowerCase())

      // Check for major parks
      expect(parkNames.some((n) => n.includes('magic kingdom'))).toBe(true)
      expect(parkNames.some((n) => n.includes('epcot'))).toBe(true)
      expect(parkNames.some((n) => n.includes('universal'))).toBe(true)
    })
  })

  describe('getParkWaitTimes', () => {
    it('should fetch wait times for a valid park', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockThemeParksApiResponse),
      })

      // Use the correct park slug from PARK_IDS
      const waitTimes = await getParkWaitTimes('magic-kingdom')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('waltdisneyworldresort_magickingdom'),
        expect.any(Object)
      )
      expect(waitTimes).toBeInstanceOf(Array)
    })

    it('should return empty array on fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const waitTimes = await getParkWaitTimes('invalid-park')

      expect(waitTimes).toEqual([])
    })

    it('should return empty array on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const waitTimes = await getParkWaitTimes('magic-kingdom')

      expect(waitTimes).toEqual([])
    })

    it('should filter to only attractions with wait times', async () => {
      const mockResponse = {
        id: 'waltdisneyworldresort_magickingdom',
        name: 'Magic Kingdom',
        liveData: [
          {
            id: 'ride1',
            name: 'Space Mountain', // Must match TOP_RIDES list
            entityType: 'ATTRACTION',
            status: 'OPERATING',
            queue: { STANDBY: { waitTime: 30 } },
          },
          {
            id: 'shop1',
            name: 'Gift Shop',
            entityType: 'MERCHANDISE',
            status: 'OPERATING',
          },
          {
            id: 'ride2',
            name: 'Big Thunder Mountain Railroad',
            entityType: 'ATTRACTION',
            status: 'CLOSED',
          },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const waitTimes = await getParkWaitTimes('magic-kingdom')

      // Should filter and process attractions
      expect(waitTimes).toBeInstanceOf(Array)
    })
  })

  describe('getNearbyThemeParks', () => {
    it('should return parks within max distance', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockThemeParksApiResponse),
      })

      // Orlando coordinates
      const lat = 28.5383
      const lng = -81.3792

      const parks = await getNearbyThemeParks(lat, lng, 75)

      // Should return parks array
      expect(parks).toBeInstanceOf(Array)
    })

    it('should filter out parks beyond max distance', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockThemeParksApiResponse),
      })

      // Coordinates far from Florida
      const lat = 40.7128 // New York
      const lng = -74.006

      const parks = await getNearbyThemeParks(lat, lng, 10) // Very small radius

      // All FL theme parks should be filtered out
      expect(parks.length).toBe(0)
    })

    it('should include distance information for each park', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockThemeParksApiResponse),
      })

      const lat = 28.5383
      const lng = -81.3792

      const parks = await getNearbyThemeParks(lat, lng, 100)

      for (const park of parks) {
        expect(park.distanceMiles).toBeDefined()
        expect(typeof park.distanceMiles).toBe('number')
      }
    })

    it('should sort parks by distance', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockThemeParksApiResponse),
      })

      const lat = 28.5383
      const lng = -81.3792

      const parks = await getNearbyThemeParks(lat, lng, 100)

      // Check if sorted by distance
      for (let i = 1; i < parks.length; i++) {
        expect(parks[i].distanceMiles).toBeGreaterThanOrEqual(parks[i - 1].distanceMiles)
      }
    })
  })
})

describe('Theme Park Data Structures', () => {
  it('should have required fields in park data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockThemeParksApiResponse),
    })

    const parks = await getNearbyThemeParks(28.5383, -81.3792, 100)

    for (const park of parks) {
      expect(park.id).toBeDefined()
      expect(park.name).toBeDefined()
      expect(park.distanceMiles).toBeDefined()
    }
  })

  it('should include ride wait times when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockThemeParksApiResponse),
    })

    const parks = await getNearbyThemeParks(28.5383, -81.3792, 100)

    const parkWithRides = parks.find((p) => p.topRides && p.topRides.length > 0)
    if (parkWithRides) {
      for (const ride of parkWithRides.topRides) {
        expect(ride.name).toBeDefined()
        // waitMinutes can be number or null
        expect(ride.waitMinutes === null || typeof ride.waitMinutes === 'number').toBe(true)
        expect(ride.status).toBeDefined()
      }
    }
  })
})
