import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  isBookingAllowed,
  getCutoffTime,
  getEarliestBookableDate,
  getCutoffConfig,
  type CutoffConfig,
} from './cutoff-rules'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  }),
}))

describe('Booking Cutoff Rules', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCutoffConfig', () => {
    it('should return default config when database has no settings', async () => {
      const config = await getCutoffConfig()

      expect(config.cutoff_hour).toBe(18) // 6 PM
      expect(config.cutoff_minute).toBe(0)
      expect(config.minimum_lead_hours).toBe(12)
      expect(config.block_same_day).toBe(true)
    })
  })

  describe('getCutoffTime', () => {
    it('should return 6 PM cutoff time for a given date', async () => {
      const testDate = new Date('2025-01-06T10:00:00') // Booking for Jan 6
      const cutoff = await getCutoffTime(testDate)

      // Cutoff is the day BEFORE at 6 PM (Jan 5 at 6 PM for Jan 6 booking)
      expect(cutoff.getHours()).toBe(18)
      expect(cutoff.getMinutes()).toBe(0)
      expect(cutoff.getDate()).toBe(5) // Day before booking date
    })

    it('should return cutoff for previous day when booking next day', async () => {
      const testDate = new Date('2025-01-07T10:00:00') // Tuesday
      const cutoff = await getCutoffTime(testDate)

      // Cutoff for Tuesday booking is Monday at 6 PM
      expect(cutoff.getDate()).toBe(6) // Monday
      expect(cutoff.getHours()).toBe(18)
    })
  })

  describe('isBookingAllowed', () => {
    it('should allow booking when before cutoff time', async () => {
      // Monday 3 PM - booking for Tuesday
      const now = new Date('2025-01-06T15:00:00')
      vi.setSystemTime(now)

      const bookingDate = new Date('2025-01-07T10:00:00') // Tuesday
      const result = await isBookingAllowed(bookingDate, now)

      expect(result.allowed).toBe(true)
    })

    it('should block booking after cutoff time for next day', async () => {
      // Monday 7 PM - booking for Tuesday (past 6 PM cutoff)
      const now = new Date('2025-01-06T19:00:00')
      vi.setSystemTime(now)

      const bookingDate = new Date('2025-01-07T10:00:00') // Tuesday
      const result = await isBookingAllowed(bookingDate, now)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('cutoff')
    })

    it('should block same-day bookings by default', async () => {
      // Monday 10 AM - trying to book for same day
      const now = new Date('2025-01-06T10:00:00')
      vi.setSystemTime(now)

      const bookingDate = new Date('2025-01-06T14:00:00') // Same day, later
      const result = await isBookingAllowed(bookingDate, now)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Same day')
    })

    it('should allow bookings for dates far in the future', async () => {
      vi.setSystemTime(new Date('2025-01-06T10:00:00'))

      const bookingDate = new Date('2025-01-20') // Two weeks out
      const result = await isBookingAllowed(bookingDate)

      expect(result.allowed).toBe(true)
    })

    it('should block bookings in the past', async () => {
      vi.setSystemTime(new Date('2025-01-10T10:00:00'))

      const bookingDate = new Date('2025-01-05') // Past date
      const result = await isBookingAllowed(bookingDate)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('past')
    })

    it('should require minimum lead time', async () => {
      // Monday 10 AM - trying to book for Monday 6 PM (only 8 hours notice)
      vi.setSystemTime(new Date('2025-01-06T10:00:00'))

      // With 12 hour minimum lead time and same-day blocked,
      // this should be blocked
      const bookingDate = new Date('2025-01-06T18:00:00')
      const result = await isBookingAllowed(bookingDate)

      expect(result.allowed).toBe(false)
    })
  })

  describe('getEarliestBookableDate', () => {
    it('should return tomorrow before cutoff', async () => {
      // Monday 3 PM
      vi.setSystemTime(new Date('2025-01-06T15:00:00'))

      const earliest = await getEarliestBookableDate()

      // Should be Tuesday (tomorrow)
      expect(earliest.getDate()).toBe(7)
      expect(earliest.getMonth()).toBe(0) // January
    })

    it('should return day after tomorrow after cutoff', async () => {
      // Monday 7 PM (after 6 PM cutoff)
      vi.setSystemTime(new Date('2025-01-06T19:00:00'))

      const earliest = await getEarliestBookableDate()

      // Should be Wednesday (day after tomorrow)
      expect(earliest.getDate()).toBe(8)
    })

    it('should handle Friday evening (skip weekend if needed)', async () => {
      // Friday 7 PM
      vi.setSystemTime(new Date('2025-01-10T19:00:00'))

      const earliest = await getEarliestBookableDate()

      // Should be at least Sunday (day after tomorrow)
      expect(earliest.getDate()).toBeGreaterThanOrEqual(12)
    })
  })
})

describe('Cutoff Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle exactly at cutoff time', async () => {
    // Monday exactly 6 PM
    vi.setSystemTime(new Date('2025-01-06T18:00:00'))

    const bookingDate = new Date('2025-01-07')
    const result = await isBookingAllowed(bookingDate)

    // Exactly at cutoff should be blocked
    expect(result.allowed).toBe(false)
  })

  it('should handle one minute before cutoff', async () => {
    // Monday 5:59 PM
    const now = new Date('2025-01-06T17:59:00')
    vi.setSystemTime(now)

    const bookingDate = new Date('2025-01-07T10:00:00') // Tuesday
    const result = await isBookingAllowed(bookingDate, now)

    // One minute before should be allowed
    expect(result.allowed).toBe(true)
  })

  it('should handle midnight correctly', async () => {
    // Tuesday 12:01 AM
    vi.setSystemTime(new Date('2025-01-07T00:01:00'))

    const bookingDate = new Date('2025-01-07') // Same day
    const result = await isBookingAllowed(bookingDate)

    // Same day should be blocked
    expect(result.allowed).toBe(false)
  })

  it('should handle year boundary', async () => {
    // December 31st, 7 PM
    vi.setSystemTime(new Date('2024-12-31T19:00:00'))

    const bookingDate = new Date('2025-01-01') // Next year
    const result = await isBookingAllowed(bookingDate)

    // Past cutoff, so Jan 1 should be blocked
    expect(result.allowed).toBe(false)
  })

  it('should allow booking 2 days out after cutoff', async () => {
    // Monday 7 PM
    const now = new Date('2025-01-06T19:00:00')
    vi.setSystemTime(now)

    const bookingDate = new Date('2025-01-08T10:00:00') // Wednesday (2 days out)
    const result = await isBookingAllowed(bookingDate, now)

    expect(result.allowed).toBe(true)
  })
})
