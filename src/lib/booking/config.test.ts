import { describe, it, expect } from 'vitest'
import {
  LISTING_BOOKING_STEPS,
  LISTING_ADDONS,
  calculateBookingTotal,
  getPackageByKey,
  getAddonById,
} from './config'

describe('Booking Configuration', () => {
  describe('LISTING_BOOKING_STEPS', () => {
    it('should have 5 steps', () => {
      expect(LISTING_BOOKING_STEPS).toHaveLength(5)
    })

    it('should have steps in correct order', () => {
      const stepIds = LISTING_BOOKING_STEPS.map((s) => s.id)
      expect(stepIds).toEqual(['package', 'addons', 'property', 'schedule', 'payment'])
    })

    it('should have labels and descriptions for all steps', () => {
      for (const step of LISTING_BOOKING_STEPS) {
        expect(step.label).toBeTruthy()
        expect(step.description).toBeTruthy()
      }
    })
  })

  describe('LISTING_ADDONS', () => {
    it('should have addons defined', () => {
      expect(LISTING_ADDONS.length).toBeGreaterThan(0)
    })

    it('should have valid price types', () => {
      for (const addon of LISTING_ADDONS) {
        expect(['flat', 'per_unit']).toContain(addon.priceType)
      }
    })

    it('should have unit defined for per_unit addons', () => {
      const perUnitAddons = LISTING_ADDONS.filter((a) => a.priceType === 'per_unit')
      for (const addon of perUnitAddons) {
        expect(addon.unit).toBeTruthy()
      }
    })

    it('should have valid categories', () => {
      const validCategories = ['staging', 'photography', 'video', 'delivery']
      for (const addon of LISTING_ADDONS) {
        expect(validCategories).toContain(addon.category)
      }
    })
  })

  describe('calculateBookingTotal', () => {
    it('should return zero total for empty data', () => {
      const result = calculateBookingTotal({})
      expect(result.total).toBe(0)
      expect(result.packagePrice).toBe(0)
      expect(result.addonsTotal).toBe(0)
    })

    it('should calculate package price correctly', () => {
      const result = calculateBookingTotal({
        packageKey: 'signature',
        sqftTier: 'lt2000',
      })
      expect(result.packagePrice).toBe(449)
      expect(result.total).toBe(449)
      expect(result.breakdown).toHaveLength(1)
      expect(result.breakdown[0].name).toContain('Signature')
    })

    it('should calculate addons correctly', () => {
      const result = calculateBookingTotal({
        packageKey: 'essentials',
        sqftTier: 'lt2000',
        addons: [{ id: 'rush-delivery', quantity: 1 }],
      })
      expect(result.packagePrice).toBe(315)
      expect(result.addonsTotal).toBe(75)
      expect(result.total).toBe(390)
      expect(result.breakdown).toHaveLength(2)
    })

    it('should handle per-unit addon quantities', () => {
      const result = calculateBookingTotal({
        packageKey: 'essentials',
        sqftTier: 'lt2000',
        addons: [{ id: 'extra-staging', quantity: 3 }],
      })
      // extra-staging is $20 per room
      expect(result.addonsTotal).toBe(60)
      expect(result.total).toBe(375)
    })

    it('should include tax as zero (FL service exemption)', () => {
      const result = calculateBookingTotal({
        packageKey: 'signature',
        sqftTier: 'lt2000',
      })
      expect(result.tax).toBe(0)
    })

    it('should calculate correctly for larger homes', () => {
      const result = calculateBookingTotal({
        packageKey: 'premier',
        sqftTier: 'over6500',
      })
      expect(result.packagePrice).toBe(1100)
      expect(result.total).toBe(1100)
    })
  })

  describe('getPackageByKey', () => {
    it('should return package by key', () => {
      const pkg = getPackageByKey('signature')
      expect(pkg).toBeDefined()
      expect(pkg?.key).toBe('signature')
    })

    it('should return undefined for invalid key', () => {
      const pkg = getPackageByKey('invalid')
      expect(pkg).toBeUndefined()
    })
  })

  describe('getAddonById', () => {
    it('should return addon by id', () => {
      const addon = getAddonById('rush-delivery')
      expect(addon).toBeDefined()
      expect(addon?.id).toBe('rush-delivery')
      expect(addon?.price).toBe(75)
    })

    it('should return undefined for invalid id', () => {
      const addon = getAddonById('invalid')
      expect(addon).toBeUndefined()
    })
  })
})
