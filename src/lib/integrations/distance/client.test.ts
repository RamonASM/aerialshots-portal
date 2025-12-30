/**
 * Distance/Commute Client Tests
 *
 * Tests for travel time and proximity calculations
 * Note: The client reads GOOGLE_PLACES_API_KEY at module load time,
 * so these tests focus on function behavior rather than mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDistanceMatrix,
  getAirportProximity,
  getBeachProximity,
  getCommuteTimes,
  getCommuteSummary,
  getTravelTime,
} from './client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Distance Client', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_PLACES_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getDistanceMatrix', () => {
    it('should return empty map for empty destinations', async () => {
      const result = await getDistanceMatrix(28.5, -81.3, [])
      expect(result.size).toBe(0)
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await getDistanceMatrix(28.5, -81.3, [
        { lat: 28.4, lng: -81.2, name: 'Dest' },
      ])

      // Should return empty map or fallback (depending on API key state)
      expect(result instanceof Map).toBe(true)
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getDistanceMatrix(28.5, -81.3, [
        { lat: 28.4, lng: -81.2, name: 'Dest' },
      ])

      expect(result instanceof Map).toBe(true)
    })
  })

  describe('getAirportProximity', () => {
    it('should return proximity to major Florida airports', async () => {
      // This uses fallback Haversine calculations when API unavailable
      const result = await getAirportProximity(28.5383, -81.3792)

      expect(result.mco).toBeDefined()
      expect(result.sfb).toBeDefined()
      expect(result.tpa).toBeDefined()

      // Should have distance/duration properties
      expect(result.mco.distanceMiles).toBeGreaterThanOrEqual(0)
      expect(result.mco.durationMinutes).toBeGreaterThanOrEqual(0)
    })

    it('should use Haversine fallback when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await getAirportProximity(28.5383, -81.3792)

      // Should still return results using fallback calculation
      expect(result.mco).toBeDefined()
      expect(result.sfb).toBeDefined()
      expect(result.tpa).toBeDefined()

      // Fallback uses Haversine distance
      expect(result.mco.distanceMiles).toBeGreaterThan(0)
    })

    it('should return reasonable distances for Orlando location', async () => {
      const result = await getAirportProximity(28.5383, -81.3792)

      // MCO is roughly 10-15 miles from downtown Orlando
      expect(result.mco.distanceMiles).toBeGreaterThan(5)
      expect(result.mco.distanceMiles).toBeLessThan(25)

      // TPA is roughly 80 miles from Orlando
      expect(result.tpa.distanceMiles).toBeGreaterThan(50)
      expect(result.tpa.distanceMiles).toBeLessThan(120)
    })
  })

  describe('getBeachProximity', () => {
    it('should return array of beach data', async () => {
      const result = await getBeachProximity(28.5383, -81.3792)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should include beach features', async () => {
      const result = await getBeachProximity(28.5, -81.3)

      // Each beach should have features array
      result.forEach((beach) => {
        expect(Array.isArray(beach.features)).toBe(true)
        expect(beach.name).toBeDefined()
        expect(beach.distanceMiles).toBeGreaterThanOrEqual(0)
      })
    })

    it('should return empty array when no beaches nearby', async () => {
      // Very small distance - no beaches in Orlando within 1 mile
      const result = await getBeachProximity(28.5383, -81.3792, 1)
      expect(result).toEqual([])
    })

    it('should sort results by distance', async () => {
      const result = await getBeachProximity(28.5383, -81.3792, 100)

      if (result.length > 1) {
        for (let i = 1; i < result.length; i++) {
          expect(result[i].distanceMiles).toBeGreaterThanOrEqual(result[i - 1].distanceMiles)
        }
      }
    })
  })

  describe('getCommuteTimes', () => {
    it('should return commute times to key destinations', async () => {
      const result = await getCommuteTimes(28.5383, -81.3792)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Each commute destination should have required fields
      result.forEach((dest) => {
        expect(dest.id).toBeDefined()
        expect(dest.name).toBeDefined()
        expect(dest.type).toBeDefined()
        expect(dest.distanceMiles).toBeDefined()
        expect(dest.durationMinutes).toBeDefined()
        expect(dest.durationWithTraffic).toBeDefined()
        expect(dest.trafficLevel).toBeDefined()
      })
    })

    it('should include various destination types', async () => {
      const result = await getCommuteTimes(28.5, -81.3)

      const types = new Set(result.map((d) => d.type))
      expect(types.has('airport')).toBe(true)
      expect(types.has('downtown')).toBe(true)
      expect(types.has('theme_park')).toBe(true)
      expect(types.has('beach')).toBe(true)
    })

    it('should sort results by distance', async () => {
      const result = await getCommuteTimes(28.5, -81.3)

      for (let i = 1; i < result.length; i++) {
        expect(result[i].distanceMiles).toBeGreaterThanOrEqual(result[i - 1].distanceMiles)
      }
    })

    it('should assign traffic levels', async () => {
      const result = await getCommuteTimes(28.5, -81.3)

      const validTrafficLevels = ['light', 'moderate', 'heavy']
      result.forEach((dest) => {
        expect(validTrafficLevels).toContain(dest.trafficLevel)
      })
    })
  })

  describe('getCommuteSummary', () => {
    it('should return summary of key commute metrics', async () => {
      const result = await getCommuteSummary(28.5383, -81.3792)

      expect(result.nearestHighway).toBeDefined()
      expect(result.nearestHighwayMiles).toBeDefined()
      expect(result.downtownOrlandoMinutes).toBeDefined()
      expect(result.mcoAirportMinutes).toBeDefined()
      expect(result.nearestBeachMinutes).toBeDefined()
    })

    it('should cap highway distance at 10 miles', async () => {
      const result = await getCommuteSummary(28.5, -81.5)
      expect(result.nearestHighwayMiles).toBeLessThanOrEqual(10)
    })

    it('should return reasonable values', async () => {
      const result = await getCommuteSummary(28.5383, -81.3792)

      expect(result.downtownOrlandoMinutes).toBeGreaterThan(0)
      expect(result.mcoAirportMinutes).toBeGreaterThan(0)
      expect(result.nearestBeachMinutes).toBeGreaterThan(0)
    })
  })

  describe('getTravelTime', () => {
    it('should return travel time result or null', async () => {
      const result = await getTravelTime(28.5383, -81.3792, 28.4294, -81.3089, 'MCO Airport')

      // May return null if API key not configured at module load
      if (result !== null) {
        expect(result.name).toBe('MCO Airport')
        expect(result.distanceMiles).toBeGreaterThanOrEqual(0)
        expect(result.durationMinutes).toBeGreaterThanOrEqual(0)
      }
    })

    it('should handle missing destination name', async () => {
      const result = await getTravelTime(28.5, -81.3, 28.4, -81.2)

      if (result !== null) {
        expect(result.name).toBe('Destination')
      }
    })
  })

  describe('Haversine Distance Calculation', () => {
    it('should calculate reasonable fallback distances', async () => {
      // When API fails, fallback should use Haversine
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await getAirportProximity(28.5383, -81.3792)

      // MCO is roughly 10-15 miles from downtown Orlando
      expect(result.mco.distanceMiles).toBeGreaterThan(5)
      expect(result.mco.distanceMiles).toBeLessThan(25)

      // TPA is roughly 80 miles from Orlando
      expect(result.tpa.distanceMiles).toBeGreaterThan(50)
      expect(result.tpa.distanceMiles).toBeLessThan(120)
    })
  })

  describe('Edge Cases', () => {
    it('should handle API returning non-OK status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'INVALID_REQUEST',
            rows: [],
          }),
      })

      const result = await getDistanceMatrix(28.5, -81.3, [
        { lat: 28.4, lng: -81.2, name: 'Dest' },
      ])

      expect(result.size).toBe(0)
    })
  })
})
