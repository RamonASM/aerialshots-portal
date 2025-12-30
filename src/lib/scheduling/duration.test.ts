/**
 * Duration Calculation Tests
 *
 * TDD tests for shoot duration calculation.
 */

import { describe, it, expect } from 'vitest'
import {
  SERVICE_DURATIONS,
  getBaseDuration,
  calculateShootDuration,
  formatDuration,
  getDurationRange,
  calculateEndTime,
} from './duration'

describe('Duration Calculation', () => {
  describe('SERVICE_DURATIONS', () => {
    it('should have durations for common services', () => {
      expect(SERVICE_DURATIONS.droneAddOn).toBe(20)
      expect(SERVICE_DURATIONS.droneOnly).toBe(30)
      expect(SERVICE_DURATIONS.zillow3d).toBe(30)
      expect(SERVICE_DURATIONS.listingVideo).toBe(45)
      expect(SERVICE_DURATIONS.signatureVid).toBe(90)
      expect(SERVICE_DURATIONS.dayToNight).toBe(120)
    })

    it('should have zero duration for post-production only services', () => {
      expect(SERVICE_DURATIONS.render3d).toBe(0)
    })
  })

  describe('getBaseDuration', () => {
    it('should return 75 minutes for small homes under 3500 sqft', () => {
      expect(getBaseDuration(1000)).toBe(75)
      expect(getBaseDuration(2000)).toBe(75)
      expect(getBaseDuration(3000)).toBe(75)
      expect(getBaseDuration(3499)).toBe(75)
    })

    it('should return 90 minutes for medium homes 3500-4999 sqft', () => {
      expect(getBaseDuration(3500)).toBe(90)
      expect(getBaseDuration(4000)).toBe(90)
      expect(getBaseDuration(4999)).toBe(90)
    })

    it('should return 120 minutes for large homes 5000+ sqft', () => {
      expect(getBaseDuration(5000)).toBe(120)
      expect(getBaseDuration(7500)).toBe(120)
      expect(getBaseDuration(10000)).toBe(120)
    })
  })

  describe('calculateShootDuration', () => {
    it('should return base duration with no services', () => {
      expect(calculateShootDuration(2000, [])).toBe(75)
      expect(calculateShootDuration(4000, [])).toBe(90)
      expect(calculateShootDuration(6000, [])).toBe(120)
    })

    it('should add drone add-on time', () => {
      expect(calculateShootDuration(2000, ['droneAddOn'])).toBe(75 + 20)
    })

    it('should add Zillow 3D tour time', () => {
      expect(calculateShootDuration(2000, ['zillow3d'])).toBe(75 + 30)
    })

    it('should add listing video time', () => {
      expect(calculateShootDuration(2000, ['listingVideo'])).toBe(75 + 45)
    })

    it('should add multiple service times', () => {
      const services = ['droneAddOn', 'zillow3d', 'listingVideo']
      // 75 base + 20 drone + 30 zillow + 45 video = 170
      expect(calculateShootDuration(2000, services)).toBe(170)
    })

    it('should handle luxury package services', () => {
      const services = ['droneAddOn', 'zillow3d', 'signatureVid', '3dFloor']
      // 75 base + 20 + 30 + 90 + 15 = 230
      expect(calculateShootDuration(2000, services)).toBe(230)
    })

    it('should handle day-to-night service', () => {
      // 75 base + 120 dayToNight = 195
      expect(calculateShootDuration(2000, ['dayToNight'])).toBe(195)
    })

    it('should handle unknown services gracefully', () => {
      expect(calculateShootDuration(2000, ['unknownService'])).toBe(75)
    })

    it('should handle undefined services array', () => {
      expect(calculateShootDuration(2000)).toBe(75)
    })
  })

  describe('formatDuration', () => {
    it('should format minutes under 60', () => {
      expect(formatDuration(30)).toBe('30 min')
      expect(formatDuration(45)).toBe('45 min')
      expect(formatDuration(59)).toBe('59 min')
    })

    it('should format exactly 1 hour', () => {
      expect(formatDuration(60)).toBe('1 hr')
    })

    it('should format multiple hours', () => {
      expect(formatDuration(120)).toBe('2 hrs')
      expect(formatDuration(180)).toBe('3 hrs')
    })

    it('should format hours with minutes', () => {
      expect(formatDuration(75)).toBe('1 hr 15 min')
      expect(formatDuration(90)).toBe('1 hr 30 min')
      expect(formatDuration(135)).toBe('2 hrs 15 min')
    })
  })

  describe('getDurationRange', () => {
    it('should return a range with 30 min buffer', () => {
      const range = getDurationRange(2000, [])
      // Base 75 min, so 75-105
      expect(range).toBe('1 hr 15 min - 1 hr 45 min')
    })

    it('should calculate range with services', () => {
      const range = getDurationRange(2000, ['droneAddOn'])
      // 95 min - 125 min
      expect(range).toBe('1 hr 35 min - 2 hrs 5 min')
    })
  })

  describe('calculateEndTime', () => {
    it('should calculate end time based on duration', () => {
      const start = new Date('2025-01-15T09:00:00Z')
      const end = calculateEndTime(start, 2000, [])

      // 75 minutes later
      const expected = new Date('2025-01-15T10:15:00Z')
      expect(end.getTime()).toBe(expected.getTime())
    })

    it('should account for services in end time', () => {
      const start = new Date('2025-01-15T09:00:00Z')
      const end = calculateEndTime(start, 2000, ['droneAddOn', 'listingVideo'])

      // 75 + 20 + 45 = 140 minutes = 2 hours 20 min
      const expected = new Date('2025-01-15T11:20:00Z')
      expect(end.getTime()).toBe(expected.getTime())
    })

    it('should work with large homes', () => {
      const start = new Date('2025-01-15T09:00:00Z')
      const end = calculateEndTime(start, 6000, [])

      // 120 minutes = 2 hours
      const expected = new Date('2025-01-15T11:00:00Z')
      expect(end.getTime()).toBe(expected.getTime())
    })
  })
})
