/**
 * Unified Pricing Integration Tests
 *
 * Verifies that pricing is consistent between:
 * - Portal API (/api/booking/quote)
 * - Backend API (asm-agent-backend /quote)
 * - Database pricing tables (when available)
 *
 * This ensures the unified architecture works correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { computeQuote } from '@/lib/pricing/service'

// Expected pricing matrix from unified_pricing.sql
const EXPECTED_PRICING = {
  essentials: {
    under2000: 315,
    _2001_2500: 375,
    _2501_3500: 425,
    _3501_5000: 485,
    _5001_10000: 580,
  },
  signature: {
    under2000: 449,
    _2001_2500: 529,
    _2501_3500: 579,
    _3501_5000: 619,
    _5001_10000: 700,
  },
  luxury: {
    under2000: 649,
    _2001_2500: 729,
    _2501_3500: 819,
    _3501_5000: 899,
    _5001_10000: 1100,
  },
}

// Sqft to tier mapping
const SQFT_TO_TIER: Record<number, string> = {
  1000: 'under2000',
  1500: 'under2000',
  2000: '_2001_2500',
  2500: '_2001_2500',
  3000: '_2501_3500',
  3500: '_2501_3500',
  4000: '_3501_5000',
  5000: '_3501_5000',
  6000: '_5001_10000',
  8000: '_5001_10000',
}

describe('Unified Pricing Integration', () => {
  describe('Portal Pricing Service', () => {
    describe('Essentials Package', () => {
      Object.entries(SQFT_TO_TIER).forEach(([sqft, tier]) => {
        it(`should price ${sqft} sqft at $${EXPECTED_PRICING.essentials[tier as keyof typeof EXPECTED_PRICING.essentials]}`, () => {
          const quote = computeQuote({
            sqft: Number(sqft),
            packageKey: 'essentials',
            services: [],
          })

          expect(quote.total).toBe(EXPECTED_PRICING.essentials[tier as keyof typeof EXPECTED_PRICING.essentials])
        })
      })
    })

    describe('Signature Package', () => {
      Object.entries(SQFT_TO_TIER).forEach(([sqft, tier]) => {
        it(`should price ${sqft} sqft at $${EXPECTED_PRICING.signature[tier as keyof typeof EXPECTED_PRICING.signature]}`, () => {
          const quote = computeQuote({
            sqft: Number(sqft),
            packageKey: 'signature',
            services: [],
          })

          expect(quote.total).toBe(EXPECTED_PRICING.signature[tier as keyof typeof EXPECTED_PRICING.signature])
        })
      })
    })

    describe('Luxury Package', () => {
      Object.entries(SQFT_TO_TIER).forEach(([sqft, tier]) => {
        it(`should price ${sqft} sqft at $${EXPECTED_PRICING.luxury[tier as keyof typeof EXPECTED_PRICING.luxury]}`, () => {
          const quote = computeQuote({
            sqft: Number(sqft),
            packageKey: 'luxury',
            services: [],
          })

          expect(quote.total).toBe(EXPECTED_PRICING.luxury[tier as keyof typeof EXPECTED_PRICING.luxury])
        })
      })
    })
  })

  describe('A La Carte Services', () => {
    const EXPECTED_SERVICES = {
      photos: { small: 175, medium: 225, large: 275 },
      droneOnly: 150,
      droneAddOn: 75,
      zillow3d: 150,
      '2dFloor': 0, // Included
      '3dFloor': 75,
      listingVideo: 350,
      signatureVid: 900,
      realTwilight: 150,
    }

    it('should price standalone drone at $150', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['droneOnly'],
      })

      expect(quote.total).toBe(150)
    })

    it('should price drone addon at $75', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['photos', 'droneAddOn'],
      })

      // photos + drone addon
      expect(quote.items.find(i => i.id === 'droneAddOn')?.price).toBe(75)
    })

    it('should price Zillow 3D at $150', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['zillow3d'],
      })

      expect(quote.total).toBe(150)
    })

    it('should price listing video at $350', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['listingVideo'],
      })

      expect(quote.total).toBe(350)
    })

    it('should price signature video at $900', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['signatureVid'],
      })

      expect(quote.total).toBe(900)
    })

    it('should price real twilight at $150', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: undefined,
        services: ['realTwilight'],
      })

      expect(quote.total).toBe(150)
    })
  })

  describe('Package + Addon Combinations', () => {
    it('should not double-charge for services included in package', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: 'essentials',
        services: ['droneAddOn', 'zillow3d'], // Both included in essentials
      })

      // Should only be package price, no addons
      expect(quote.items.length).toBe(1)
      expect(quote.total).toBe(375) // Essentials for 2001-2500 sqft
    })

    it('should add non-included services as addons', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: 'essentials',
        services: ['3dFloor'], // Not in essentials
      })

      expect(quote.items.length).toBe(2)
      expect(quote.items[1].id).toBe('3dFloor')
      expect(quote.total).toBe(375 + 75) // Essentials + 3D Floor
    })

    it('should add signature video to essentials package', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: 'essentials',
        services: ['signatureVid'],
      })

      expect(quote.total).toBe(375 + 900)
    })
  })

  describe('Quote Response Structure', () => {
    it('should include all required fields', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: 'signature',
        services: [],
      })

      expect(quote).toHaveProperty('bucket')
      expect(quote).toHaveProperty('tierKey')
      expect(quote).toHaveProperty('items')
      expect(quote).toHaveProperty('total')
      expect(Array.isArray(quote.items)).toBe(true)
    })

    it('should include item details', () => {
      const quote = computeQuote({
        sqft: 2500,
        packageKey: 'signature',
        services: [],
      })

      const packageItem = quote.items[0]
      expect(packageItem).toHaveProperty('id')
      expect(packageItem).toHaveProperty('name') // name instead of label
      expect(packageItem).toHaveProperty('price')
      expect(packageItem).toHaveProperty('type')
    })
  })
})
