import { describe, it, expect } from 'vitest'
import {
  LISTING_PACKAGES,
  SQFT_TIERS,
  getPackagePrice,
  getLowestPrice,
  formatCurrency,
} from './config'

describe('Pricing Configuration', () => {
  describe('LISTING_PACKAGES', () => {
    it('should have three packages', () => {
      expect(LISTING_PACKAGES).toHaveLength(3)
    })

    it('should have essentials, signature, and premier packages', () => {
      const packageKeys = LISTING_PACKAGES.map((p) => p.key)
      expect(packageKeys).toContain('essentials')
      expect(packageKeys).toContain('signature')
      expect(packageKeys).toContain('premier')
    })

    it('should have signature marked as recommended', () => {
      const signature = LISTING_PACKAGES.find((p) => p.key === 'signature')
      expect(signature?.recommended).toBe(true)
    })

    it('should have pricing for all sqft tiers', () => {
      for (const pkg of LISTING_PACKAGES) {
        for (const tier of SQFT_TIERS) {
          expect(pkg.pricing[tier.id]).toBeDefined()
          expect(typeof pkg.pricing[tier.id]).toBe('number')
          expect(pkg.pricing[tier.id]).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('SQFT_TIERS', () => {
    it('should have five tiers', () => {
      expect(SQFT_TIERS).toHaveLength(5)
    })

    it('should have tiers in ascending order', () => {
      const tierIds = SQFT_TIERS.map((t) => t.id)
      expect(tierIds).toEqual([
        'lt2000',
        '2001_3500',
        '3501_5000',
        '5001_6500',
        'over6500',
      ])
    })
  })

  describe('getPackagePrice', () => {
    it('should return correct price for essentials lt2000', () => {
      const essentials = LISTING_PACKAGES.find((p) => p.key === 'essentials')!
      const price = getPackagePrice(essentials, 'lt2000')
      expect(price).toBe(315)
    })

    it('should return correct price for signature 2001_3500', () => {
      const signature = LISTING_PACKAGES.find((p) => p.key === 'signature')!
      const price = getPackagePrice(signature, '2001_3500')
      expect(price).toBe(529)
    })

    it('should return correct price for premier over6500', () => {
      const premier = LISTING_PACKAGES.find((p) => p.key === 'premier')!
      const price = getPackagePrice(premier, 'over6500')
      expect(price).toBe(1100)
    })
  })

  describe('getLowestPrice', () => {
    it('should return lowest price for each package', () => {
      for (const pkg of LISTING_PACKAGES) {
        const lowestPrice = getLowestPrice(pkg)
        const allPrices = Object.values(pkg.pricing)
        expect(lowestPrice).toBe(Math.min(...allPrices))
      }
    })
  })

  describe('formatCurrency', () => {
    it('should format whole numbers without decimals', () => {
      expect(formatCurrency(100)).toBe('$100')
      expect(formatCurrency(1000)).toBe('$1,000')
    })

    it('should round to whole numbers', () => {
      // formatCurrency uses maximumFractionDigits: 0
      expect(formatCurrency(99.99)).toBe('$100')
      expect(formatCurrency(100.5)).toBe('$101') // rounds up
      expect(formatCurrency(99.49)).toBe('$99')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0')
    })
  })
})
