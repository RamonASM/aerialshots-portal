/**
 * Content Branding & Retainer Package Tests
 *
 * Verifies content retainer pricing and video services.
 */

import { describe, it, expect } from 'vitest'
import {
  CONTENT_SERVICES,
  CONTENT_RETAINERS,
  TRAVEL_TIERS,
  getContentService,
  getContentRetainer,
  calculateTravelFee,
} from '@/lib/pricing/service'

describe('Content Branding Integration', () => {
  describe('Content Services', () => {
    it('should have all a la carte content video services', () => {
      const serviceIds = CONTENT_SERVICES.map((s) => s.id)

      expect(serviceIds).toContain('educationalVideo')
      expect(serviceIds).toContain('propertyTourVideo')
      expect(serviceIds).toContain('businessSpotlight')
      expect(serviceIds).toContain('closingVideo')
      expect(serviceIds).toContain('eventVideo')
      expect(serviceIds).toContain('socialManagement')
    })

    it('should have correct pricing for educational videos', () => {
      const service = getContentService('educationalVideo')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(125)
      expect(service!.minQuantity).toBe(3) // 3-video minimum
    })

    it('should have correct pricing for property tour videos', () => {
      const service = getContentService('propertyTourVideo')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(550)
    })

    it('should have correct pricing for business spotlight', () => {
      const service = getContentService('businessSpotlight')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(450)
    })

    it('should have correct pricing for closing video', () => {
      const service = getContentService('closingVideo')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(350)
    })

    it('should have correct pricing for event video', () => {
      const service = getContentService('eventVideo')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(650)
    })

    it('should have correct pricing for social media management', () => {
      const service = getContentService('socialManagement')
      expect(service).toBeTruthy()
      expect(service!.price).toBe(600)
      expect(service!.category).toBe('subscription')
    })
  })

  describe('Content Retainer Packages', () => {
    it('should have three retainer tiers', () => {
      expect(CONTENT_RETAINERS).toHaveLength(3)
      expect(CONTENT_RETAINERS.map((r) => r.id)).toEqual(['momentum', 'dominance', 'elite'])
    })

    describe('Momentum (Tier 1)', () => {
      it('should have correct pricing', () => {
        const retainer = getContentRetainer('momentum')
        expect(retainer).toBeTruthy()
        expect(retainer!.priceMonthly).toBe(1488)
        expect(retainer!.alaCarteValue).toBe(1975)
        expect(retainer!.savings).toBe(487)
      })

      it('should include 8 videos per month', () => {
        const retainer = getContentRetainer('momentum')
        expect(retainer!.videosPerMonth).toBe(8)
        expect(retainer!.includedVideos).toEqual({
          educational: 5,
          propertyTour: 1,
          businessSpotlight: 1,
          closingEvent: 1,
        })
      })

      it('should include 2 shoot days per month', () => {
        const retainer = getContentRetainer('momentum')
        expect(retainer!.shootDaysPerMonth).toBe(2)
      })

      it('should have standard turnaround (null)', () => {
        const retainer = getContentRetainer('momentum')
        expect(retainer!.turnaroundHours).toBeNull()
      })

      it('should include core features', () => {
        const retainer = getContentRetainer('momentum')
        expect(retainer!.features).toContain('Branding photoshoot')
        expect(retainer!.features).toContain('Notion dashboard')
        expect(retainer!.features).toContain('Slack support')
      })
    })

    describe('Dominance (Tier 2 - Most Popular)', () => {
      it('should be marked as most popular', () => {
        const retainer = getContentRetainer('dominance')
        expect(retainer!.isPopular).toBe(true)
      })

      it('should have correct pricing', () => {
        const retainer = getContentRetainer('dominance')
        expect(retainer!.priceMonthly).toBe(2500)
        expect(retainer!.alaCarteValue).toBe(2900)
        expect(retainer!.savings).toBe(400)
      })

      it('should include 12 videos per month', () => {
        const retainer = getContentRetainer('dominance')
        expect(retainer!.videosPerMonth).toBe(12)
        expect(retainer!.includedVideos).toEqual({
          educational: 8,
          propertyTour: 2,
          businessSpotlight: 1,
          closingEvent: 1,
        })
      })

      it('should include 3 shoot days per month', () => {
        const retainer = getContentRetainer('dominance')
        expect(retainer!.shootDaysPerMonth).toBe(3)
      })

      it('should have 48-hour priority turnaround', () => {
        const retainer = getContentRetainer('dominance')
        expect(retainer!.turnaroundHours).toBe(48)
      })
    })

    describe('Elite (Tier 3)', () => {
      it('should have correct pricing', () => {
        const retainer = getContentRetainer('elite')
        expect(retainer!.priceMonthly).toBe(4500)
        expect(retainer!.alaCarteValue).toBe(5500)
        expect(retainer!.savings).toBe(1000)
      })

      it('should include 20 videos per month', () => {
        const retainer = getContentRetainer('elite')
        expect(retainer!.videosPerMonth).toBe(20)
        expect(retainer!.includedVideos).toEqual({
          educational: 15,
          propertyTour: 3,
          businessSpotlight: 1,
          closingEvent: 1,
        })
      })

      it('should include 4 shoot days per month', () => {
        const retainer = getContentRetainer('elite')
        expect(retainer!.shootDaysPerMonth).toBe(4)
      })

      it('should have 24-hour priority turnaround', () => {
        const retainer = getContentRetainer('elite')
        expect(retainer!.turnaroundHours).toBe(24)
      })

      it('should include premium features', () => {
        const retainer = getContentRetainer('elite')
        expect(retainer!.features).toContain('Dedicated account manager')
        expect(retainer!.features).toContain('Weekly strategy calls')
        expect(retainer!.features).toContain('Team training session')
      })
    })
  })

  describe('Travel Fee Calculation', () => {
    it('should be free within 40 miles', () => {
      expect(calculateTravelFee(0)).toBe(0)
      expect(calculateTravelFee(20)).toBe(0)
      expect(calculateTravelFee(40)).toBe(0)
    })

    it('should charge $1.50/mile for 41-75 miles', () => {
      // 41 miles: 1 chargeable mile * $1.50 = $1.50
      expect(calculateTravelFee(41)).toBe(1.5)
      // 60 miles: 20 chargeable miles * $1.50 = $30
      expect(calculateTravelFee(60)).toBe(30)
      // 75 miles: 35 chargeable miles * $1.50 = $52.50
      expect(calculateTravelFee(75)).toBe(52.5)
    })

    it('should charge $2.00/mile for 76-150 miles', () => {
      // 76 miles: 36 chargeable miles * $2.00 = $72
      expect(calculateTravelFee(76)).toBe(72)
      // 100 miles: 60 chargeable miles * $2.00 = $120
      expect(calculateTravelFee(100)).toBe(120)
      // 150 miles: 110 chargeable miles * $2.00 = $220
      expect(calculateTravelFee(150)).toBe(220)
    })

    it('should charge $3.00/mile beyond 150 miles', () => {
      // 151 miles: 111 chargeable miles * $3.00 = $333
      expect(calculateTravelFee(151)).toBe(333)
      // 200 miles: 160 chargeable miles * $3.00 = $480
      expect(calculateTravelFee(200)).toBe(480)
    })
  })

  describe('Travel Tiers Structure', () => {
    it('should have four travel tiers', () => {
      expect(TRAVEL_TIERS).toHaveLength(4)
    })

    it('should have free tier up to 40 miles', () => {
      const freeTier = TRAVEL_TIERS[0]
      expect(freeTier.minMiles).toBe(0)
      expect(freeTier.maxMiles).toBe(40)
      expect(freeTier.feePerMile).toBe(0)
    })

    it('should have no upper limit on the final tier', () => {
      const lastTier = TRAVEL_TIERS[TRAVEL_TIERS.length - 1]
      expect(lastTier.maxMiles).toBeNull()
    })
  })
})
