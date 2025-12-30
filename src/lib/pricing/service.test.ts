/**
 * Pricing Service Tests
 *
 * TDD tests for the unified pricing service.
 */

import { describe, it, expect } from 'vitest'
import {
  SQFT_BUCKETS,
  PACKAGES,
  A_LA_CARTE_SERVICES,
  bucketFromSqft,
  tierFromBucket,
  getPhotoPrice,
  getBucketForSqft,
  getService,
  getServicePrice,
  computeQuote,
  getPackagePrice,
  getPackagesForSqft,
} from './service'

describe('Pricing Service', () => {
  describe('SQFT_BUCKETS', () => {
    it('should have 6 buckets', () => {
      expect(SQFT_BUCKETS).toHaveLength(6)
    })

    it('should have increasing photo prices', () => {
      const prices = SQFT_BUCKETS.map((b) => b.photoPrice)
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThan(prices[i - 1])
      }
    })

    it('should have correct price range from $175 to $550', () => {
      expect(SQFT_BUCKETS[0].photoPrice).toBe(175)
      expect(SQFT_BUCKETS[5].photoPrice).toBe(550)
    })
  })

  describe('PACKAGES', () => {
    it('should have 3 packages', () => {
      expect(Object.keys(PACKAGES)).toHaveLength(3)
      expect(PACKAGES.essentials).toBeDefined()
      expect(PACKAGES.signature).toBeDefined()
      expect(PACKAGES.luxury).toBeDefined()
    })

    it('essentials should include core services', () => {
      const essentials = PACKAGES.essentials
      expect(essentials.includesIds).toContain('photos')
      expect(essentials.includesIds).toContain('droneAddOn')
      expect(essentials.includesIds).toContain('zillow3d')
    })

    it('signature should include listing video', () => {
      expect(PACKAGES.signature.includesIds).toContain('listingVideo')
    })

    it('luxury should include signature video and 3d floor plan', () => {
      expect(PACKAGES.luxury.includesIds).toContain('signatureVid')
      expect(PACKAGES.luxury.includesIds).toContain('3dFloor')
    })

    it('packages should have increasing prices at same tier', () => {
      const tier = 'under2000'
      expect(PACKAGES.signature.priceByTier[tier]).toBeGreaterThan(
        PACKAGES.essentials.priceByTier[tier]
      )
      expect(PACKAGES.luxury.priceByTier[tier]).toBeGreaterThan(
        PACKAGES.signature.priceByTier[tier]
      )
    })
  })

  describe('A_LA_CARTE_SERVICES', () => {
    it('should have at least 15 services', () => {
      expect(A_LA_CARTE_SERVICES.length).toBeGreaterThanOrEqual(15)
    })

    it('should have photos service with varies pricing', () => {
      const photos = A_LA_CARTE_SERVICES.find((s) => s.id === 'photos')
      expect(photos).toBeDefined()
      expect(photos?.price).toBe('varies')
    })

    it('should have drone services with correct pricing', () => {
      const droneOnly = A_LA_CARTE_SERVICES.find((s) => s.id === 'droneOnly')
      const droneAddOn = A_LA_CARTE_SERVICES.find((s) => s.id === 'droneAddOn')
      expect(droneOnly?.price).toBe(150)
      expect(droneAddOn?.price).toBe(75)
    })

    it('should have video services in correct price range', () => {
      const listingVideo = A_LA_CARTE_SERVICES.find((s) => s.id === 'listingVideo')
      const signatureVid = A_LA_CARTE_SERVICES.find((s) => s.id === 'signatureVid')
      expect(listingVideo?.price).toBe(350)
      expect(signatureVid?.price).toBe(900)
    })
  })

  describe('bucketFromSqft', () => {
    it('should return lt1500 for small homes', () => {
      expect(bucketFromSqft(1000)).toBe('lt1500')
      expect(bucketFromSqft(1500)).toBe('lt1500')
    })

    it('should return correct bucket for mid-sized homes', () => {
      expect(bucketFromSqft(1501)).toBe('1501_2500')
      expect(bucketFromSqft(2500)).toBe('1501_2500')
      expect(bucketFromSqft(2501)).toBe('2501_3500')
      expect(bucketFromSqft(3500)).toBe('2501_3500')
    })

    it('should return correct bucket for large homes', () => {
      expect(bucketFromSqft(3501)).toBe('3501_4000')
      expect(bucketFromSqft(4000)).toBe('3501_4000')
      expect(bucketFromSqft(4001)).toBe('4001_5000')
      expect(bucketFromSqft(5000)).toBe('4001_5000')
    })

    it('should return 5001_10000 for very large homes', () => {
      expect(bucketFromSqft(5001)).toBe('5001_10000')
      expect(bucketFromSqft(10000)).toBe('5001_10000')
      expect(bucketFromSqft(15000)).toBe('5001_10000')
    })
  })

  describe('tierFromBucket', () => {
    it('should map lt1500 to under2000', () => {
      expect(tierFromBucket('lt1500')).toBe('under2000')
    })

    it('should map bucket to correct tier', () => {
      expect(tierFromBucket('1501_2500')).toBe('_2001_2500')
      expect(tierFromBucket('2501_3500')).toBe('_2501_3500')
      expect(tierFromBucket('3501_4000')).toBe('_3501_5000')
      expect(tierFromBucket('4001_5000')).toBe('_3501_5000')
      expect(tierFromBucket('5001_10000')).toBe('_5001_10000')
    })

    it('should return default tier for unknown bucket', () => {
      expect(tierFromBucket('unknown')).toBe('under2000')
    })
  })

  describe('getPhotoPrice', () => {
    it('should return correct price for each sqft range', () => {
      expect(getPhotoPrice(1000)).toBe(175)
      expect(getPhotoPrice(2000)).toBe(225)
      expect(getPhotoPrice(3000)).toBe(275)
      expect(getPhotoPrice(3800)).toBe(350)
      expect(getPhotoPrice(4500)).toBe(450)
      expect(getPhotoPrice(6000)).toBe(550)
    })
  })

  describe('getBucketForSqft', () => {
    it('should return bucket data for sqft', () => {
      const bucket = getBucketForSqft(2000)
      expect(bucket).toBeDefined()
      expect(bucket?.id).toBe('1501_2500')
      expect(bucket?.photoPrice).toBe(225)
    })
  })

  describe('getService', () => {
    it('should return service by id', () => {
      const service = getService('listingVideo')
      expect(service).toBeDefined()
      expect(service?.name).toBe('Listing Video')
      expect(service?.price).toBe(350)
    })

    it('should return undefined for unknown service', () => {
      expect(getService('unknown')).toBeUndefined()
    })
  })

  describe('getServicePrice', () => {
    it('should return fixed price for standard services', () => {
      expect(getServicePrice('listingVideo')).toBe(350)
      expect(getServicePrice('droneAddOn')).toBe(75)
      expect(getServicePrice('zillow3d')).toBe(150)
    })

    it('should return sqft-based price for photos', () => {
      expect(getServicePrice('photos', 1500)).toBe(175)
      expect(getServicePrice('photos', 3000)).toBe(275)
      expect(getServicePrice('photos', 5000)).toBe(450)
    })

    it('should return default price for photos without sqft', () => {
      expect(getServicePrice('photos')).toBe(175)
    })

    it('should return 0 for unknown service', () => {
      expect(getServicePrice('unknown')).toBe(0)
    })
  })

  describe('computeQuote', () => {
    describe('package quotes', () => {
      it('should compute essentials package quote', () => {
        const quote = computeQuote({ sqft: 2000, packageKey: 'essentials' })

        expect(quote.bucket).toBe('1501_2500')
        expect(quote.tierKey).toBe('_2001_2500')
        expect(quote.items).toHaveLength(1)
        expect(quote.items[0].type).toBe('package')
        expect(quote.items[0].id).toBe('essentials')
        expect(quote.total).toBe(375)
      })

      it('should compute signature package quote', () => {
        const quote = computeQuote({ sqft: 3000, packageKey: 'signature' })

        expect(quote.bucket).toBe('2501_3500')
        expect(quote.total).toBe(579)
      })

      it('should compute luxury package quote', () => {
        const quote = computeQuote({ sqft: 1500, packageKey: 'luxury' })

        expect(quote.bucket).toBe('lt1500')
        expect(quote.total).toBe(649)
      })

      it('should add addon services not included in package', () => {
        const quote = computeQuote({
          sqft: 2000,
          packageKey: 'essentials',
          services: ['realTwilight'], // Not included in essentials
        })

        expect(quote.items).toHaveLength(2)
        expect(quote.items[1].type).toBe('addon')
        expect(quote.items[1].id).toBe('realTwilight')
        expect(quote.total).toBe(375 + 150)
      })

      it('should not double-charge for included services', () => {
        const quote = computeQuote({
          sqft: 2000,
          packageKey: 'essentials',
          services: ['droneAddOn', 'zillow3d'], // Both included in essentials
        })

        // Should only have the package, no addons
        expect(quote.items).toHaveLength(1)
        expect(quote.total).toBe(375)
      })
    })

    describe('a la carte quotes', () => {
      it('should compute photos only quote', () => {
        const quote = computeQuote({ sqft: 2000, services: ['photos'] })

        expect(quote.items).toHaveLength(1)
        expect(quote.items[0].id).toBe('photos')
        expect(quote.total).toBe(225)
      })

      it('should compute multi-service quote', () => {
        const quote = computeQuote({
          sqft: 2000,
          services: ['photos', 'droneAddOn', 'listingVideo'],
        })

        expect(quote.items).toHaveLength(3)
        expect(quote.total).toBe(225 + 75 + 350)
      })

      it('should handle empty services array', () => {
        const quote = computeQuote({ sqft: 2000, services: [] })

        expect(quote.items).toHaveLength(0)
        expect(quote.total).toBe(0)
      })
    })
  })

  describe('getPackagePrice', () => {
    it('should return correct price for package at sqft', () => {
      expect(getPackagePrice('essentials', 1500)).toBe(315)
      expect(getPackagePrice('essentials', 3000)).toBe(425)
      expect(getPackagePrice('signature', 2000)).toBe(529)
      expect(getPackagePrice('luxury', 5000)).toBe(899)
    })

    it('should return undefined for unknown package', () => {
      expect(getPackagePrice('unknown', 2000)).toBeUndefined()
    })
  })

  describe('getPackagesForSqft', () => {
    it('should return all packages with prices for sqft', () => {
      const packages = getPackagesForSqft(2000)

      expect(packages).toHaveLength(3)
      expect(packages.find((p) => p.id === 'essentials')?.price).toBe(375)
      expect(packages.find((p) => p.id === 'signature')?.price).toBe(529)
      expect(packages.find((p) => p.id === 'luxury')?.price).toBe(729)
    })

    it('should return different prices for different sqft', () => {
      const smallHome = getPackagesForSqft(1500)
      const largeHome = getPackagesForSqft(6000)

      expect(smallHome[0].price).toBeLessThan(largeHome[0].price)
    })
  })
})
