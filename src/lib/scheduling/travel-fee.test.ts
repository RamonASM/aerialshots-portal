import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateDistanceMiles,
  calculateTravelFee,
  getTravelFeeConfig,
  formatTravelFee,
  formatDistance,
} from './travel-fee'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
  }),
}))

describe('Travel Fee Calculator', () => {
  describe('calculateDistanceMiles', () => {
    it('should calculate distance between two points correctly', () => {
      // Orlando to Tampa is approximately 84 miles
      const orlando = { lat: 28.5383, lng: -81.3792 }
      const tampa = { lat: 27.9506, lng: -82.4572 }

      const distance = calculateDistanceMiles(
        orlando.lat,
        orlando.lng,
        tampa.lat,
        tampa.lng
      )

      // Should be approximately 84 miles (within 5 miles tolerance)
      expect(distance).toBeGreaterThan(75)
      expect(distance).toBeLessThan(90)
    })

    it('should return 0 for same location', () => {
      const distance = calculateDistanceMiles(28.5383, -81.3792, 28.5383, -81.3792)
      expect(distance).toBe(0)
    })

    it('should calculate short distances correctly', () => {
      // Two points about 1 mile apart
      const lat1 = 28.5383
      const lng1 = -81.3792
      const lat2 = 28.5528 // About 1 mile north
      const lng2 = -81.3792

      const distance = calculateDistanceMiles(lat1, lng1, lat2, lng2)

      // Should be approximately 1 mile
      expect(distance).toBeGreaterThan(0.8)
      expect(distance).toBeLessThan(1.2)
    })

    it('should handle negative coordinates', () => {
      // Southern hemisphere
      const distance = calculateDistanceMiles(-33.8688, 151.2093, -33.9, 151.2)
      expect(distance).toBeGreaterThan(0)
    })
  })

  describe('getTravelFeeConfig', () => {
    it('should return default config when database has no settings', async () => {
      const config = await getTravelFeeConfig()

      expect(config.free_radius_miles).toBe(40)
      expect(config.per_mile_rate_cents).toBe(75)
      expect(config.maximum_fee_cents).toBe(15000)
      expect(config.round_trip).toBe(true)
      expect(config.home_base_lat).toBe(28.5383)
      expect(config.home_base_lng).toBe(-81.3792)
    })
  })

  describe('calculateTravelFee', () => {
    it('should return free for locations within 40 mile radius', async () => {
      // Winter Park is about 5 miles from Orlando home base
      const winterPark = { lat: 28.6, lng: -81.34 }

      const result = await calculateTravelFee(winterPark.lat, winterPark.lng)

      expect(result.is_within_free_radius).toBe(true)
      expect(result.applied_fee_cents).toBe(0)
    })

    it('should charge for locations beyond 40 mile radius', async () => {
      // Tampa is about 84 miles from Orlando (one way)
      // Round trip = 168 miles
      // Free radius round trip = 80 miles
      // Billable = 168 - 80 = 88 miles
      // Fee = 88 * $0.75 = $66.00
      const tampa = { lat: 27.9506, lng: -82.4572 }

      const result = await calculateTravelFee(tampa.lat, tampa.lng)

      expect(result.is_within_free_radius).toBe(false)
      expect(result.applied_fee_cents).toBeGreaterThan(0)
      expect(result.is_round_trip).toBe(true)
    })

    it('should cap fee at maximum', async () => {
      // Miami is about 230 miles from Orlando
      // This would normally exceed max fee
      const miami = { lat: 25.7617, lng: -80.1918 }

      const result = await calculateTravelFee(miami.lat, miami.lng)

      // Should be capped at $150 (15000 cents)
      expect(result.applied_fee_cents).toBeLessThanOrEqual(15000)
      expect(result.breakdown.capped_at_maximum).toBe(true)
    })

    it('should calculate round trip distance correctly', async () => {
      const destination = { lat: 28.0, lng: -81.5 }

      const result = await calculateTravelFee(destination.lat, destination.lng)

      // Round trip should be roughly 2x one way
      expect(result.distance_miles).toBeGreaterThan(result.breakdown.one_way_miles * 1.9)
      expect(result.distance_miles).toBeLessThan(result.breakdown.one_way_miles * 2.1)
    })

    it('should include breakdown details', async () => {
      const destination = { lat: 27.5, lng: -81.5 }

      const result = await calculateTravelFee(destination.lat, destination.lng)

      expect(result.breakdown).toBeDefined()
      expect(result.breakdown.one_way_miles).toBeGreaterThan(0)
      expect(result.breakdown.per_mile_rate_cents).toBe(75)
    })
  })

  describe('formatTravelFee', () => {
    it('should format zero as Free', () => {
      expect(formatTravelFee(0)).toBe('Free')
    })

    it('should format cents as dollars', () => {
      expect(formatTravelFee(1000)).toBe('$10.00')
      expect(formatTravelFee(7500)).toBe('$75.00')
      expect(formatTravelFee(15000)).toBe('$150.00')
    })

    it('should handle odd cent amounts', () => {
      expect(formatTravelFee(1234)).toBe('$12.34')
    })
  })

  describe('formatDistance', () => {
    it('should format short distances', () => {
      expect(formatDistance(0.5)).toBe('Less than 1 mile')
    })

    it('should format normal distances with one decimal', () => {
      expect(formatDistance(5.5)).toBe('5.5 miles')
      expect(formatDistance(42.3)).toBe('42.3 miles')
    })

    it('should format whole numbers', () => {
      expect(formatDistance(10)).toBe('10.0 miles')
    })
  })
})

describe('Travel Fee Edge Cases', () => {
  it('should handle locations near 40 mile boundary as free', async () => {
    // Point about 35 miles away (well within free radius)
    // Using Haversine: 35 miles ≈ 0.50 degrees latitude
    const withinFortyMiles = {
      lat: 28.5383 + 0.50, // About 35 miles north
      lng: -81.3792,
    }

    const result = await calculateTravelFee(withinFortyMiles.lat, withinFortyMiles.lng)

    // At 35 miles (one way), should be within 40 mile free radius
    expect(result.is_within_free_radius).toBe(true)
    expect(result.applied_fee_cents).toBe(0)
    expect(result.breakdown.one_way_miles).toBeLessThan(40)
  })

  it('should handle location just beyond free radius', async () => {
    // Point just over 40 miles away
    const justBeyond = {
      lat: 28.5383 + 0.65, // About 45 miles north
      lng: -81.3792,
    }

    const result = await calculateTravelFee(justBeyond.lat, justBeyond.lng)

    // Should charge for the extra miles
    expect(result.is_within_free_radius).toBe(false)
    expect(result.applied_fee_cents).toBeGreaterThan(0)
    // But not a huge fee since it's just a bit over
    expect(result.applied_fee_cents).toBeLessThan(2000) // Less than $20
  })

  it('should return zero fee for home base location', async () => {
    // Same as home base
    const result = await calculateTravelFee(28.5383, -81.3792)

    expect(result.distance_miles).toBe(0)
    expect(result.applied_fee_cents).toBe(0)
    expect(result.is_within_free_radius).toBe(true)
  })
})
