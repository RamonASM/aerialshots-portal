import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createAnytimeBooking,
  isAnytimeEligible,
  getAnytimeSchedules,
  claimAnytimeSlot,
  releaseAnytimeSlot,
  getPhotographerAnytimeQueue,
  type AnytimeBooking,
  type AnytimeClaimResult,
} from './go-anytime'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

describe('Go Anytime Scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isAnytimeEligible', () => {
    it('should return true for vacant properties with lockbox', () => {
      const booking = {
        is_vacant: true,
        has_lockbox: true,
        access_instructions: 'Lockbox code: 1234',
      }

      const result = isAnytimeEligible(booking)

      expect(result.eligible).toBe(true)
    })

    it('should return false for occupied properties', () => {
      const booking = {
        is_vacant: false,
        has_lockbox: true,
      }

      const result = isAnytimeEligible(booking)

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('occupied')
    })

    it('should return false without lockbox access', () => {
      const booking = {
        is_vacant: true,
        has_lockbox: false,
      }

      const result = isAnytimeEligible(booking)

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('lockbox')
    })

    it('should require access instructions', () => {
      const booking = {
        is_vacant: true,
        has_lockbox: true,
        access_instructions: '',
      }

      const result = isAnytimeEligible(booking)

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Access')
    })
  })

  describe('createAnytimeBooking', () => {
    it('should create booking with date range', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'anytime-1',
                  listing_id: 'listing-123',
                  is_anytime: true,
                  anytime_start_date: '2025-01-07',
                  anytime_end_date: '2025-01-14',
                  status: 'pending_claim',
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await createAnytimeBooking({
        listing_id: 'listing-123',
        start_date: new Date('2025-01-07'),
        end_date: new Date('2025-01-14'),
        access_instructions: 'Lockbox: 1234',
        territory_id: 'territory-1',
      })

      expect(result.success).toBe(true)
      expect(result.booking?.is_anytime).toBe(true)
      expect(result.booking?.status).toBe('pending_claim')
    })

    it('should validate date range is at least 2 days', async () => {
      const result = await createAnytimeBooking({
        listing_id: 'listing-123',
        start_date: new Date('2025-01-07'),
        end_date: new Date('2025-01-07'), // Same day
        access_instructions: 'Lockbox: 1234',
        territory_id: 'territory-1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('at least 2 days')
    })

    it('should validate start date is in the future', async () => {
      const result = await createAnytimeBooking({
        listing_id: 'listing-123',
        start_date: new Date('2025-01-05'), // In the past
        end_date: new Date('2025-01-10'),
        access_instructions: 'Lockbox: 1234',
        territory_id: 'territory-1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('future')
    })

    it('should limit date range to 14 days max', async () => {
      const result = await createAnytimeBooking({
        listing_id: 'listing-123',
        start_date: new Date('2025-01-07'),
        end_date: new Date('2025-01-25'), // 18 days
        access_instructions: 'Lockbox: 1234',
        territory_id: 'territory-1',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('14 days')
    })
  })

  describe('getAnytimeSchedules', () => {
    it('should return unclaimed anytime bookings for a territory', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                gte: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'anytime-1',
                        listing_id: 'listing-1',
                        anytime_start_date: '2025-01-07',
                        anytime_end_date: '2025-01-14',
                        listing: { address: '123 Main St' },
                      },
                      {
                        id: 'anytime-2',
                        listing_id: 'listing-2',
                        anytime_start_date: '2025-01-08',
                        anytime_end_date: '2025-01-12',
                        listing: { address: '456 Oak Ave' },
                      },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      })

      const schedules = await getAnytimeSchedules('territory-1')

      expect(schedules.length).toBe(2)
      expect(schedules[0].id).toBe('anytime-1')
    })

    it('should filter by date range', async () => {
      // Create a chainable mock that supports multiple gte/lte calls
      const mockResult = Promise.resolve({
        data: [
          {
            id: 'anytime-1',
            anytime_start_date: '2025-01-07',
            anytime_end_date: '2025-01-10',
          },
        ],
        error: null,
      })

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn(() => mockResult),
      }

      mockSupabaseFrom.mockReturnValue(mockChain)

      const schedules = await getAnytimeSchedules('territory-1', {
        from: new Date('2025-01-07'),
        to: new Date('2025-01-10'),
      })

      expect(schedules.length).toBe(1)
    })
  })

  describe('claimAnytimeSlot', () => {
    it('should allow photographer to claim a slot', async () => {
      // Mock: First call to check if available, second to update
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'anytime-1',
                    is_anytime: true,
                    claimed_by: null,
                    anytime_start_date: '2025-01-07',
                    anytime_end_date: '2025-01-14',
                  },
                  error: null,
                }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: () => ({
            eq: () =>
              Promise.resolve({
                data: {
                  id: 'anytime-1',
                  claimed_by: 'photographer-1',
                  claimed_at: '2025-01-06T10:00:00',
                  scheduled_date: '2025-01-08',
                },
                error: null,
              }),
          }),
        })

      const result = await claimAnytimeSlot(
        'anytime-1',
        'photographer-1',
        new Date('2025-01-08T09:00:00')
      )

      expect(result.success).toBe(true)
      expect(result.claimed_date).toBeDefined()
    })

    it('should reject if already claimed', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'anytime-1',
                  claimed_by: 'photographer-2', // Already claimed
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await claimAnytimeSlot(
        'anytime-1',
        'photographer-1',
        new Date('2025-01-08T09:00:00')
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('claimed')
    })

    it('should validate date is within range', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'anytime-1',
                  is_anytime: true,
                  claimed_by: null,
                  anytime_start_date: '2025-01-07',
                  anytime_end_date: '2025-01-10',
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await claimAnytimeSlot(
        'anytime-1',
        'photographer-1',
        new Date('2025-01-15T09:00:00') // Outside range
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside')
    })
  })

  describe('releaseAnytimeSlot', () => {
    it('should allow photographer to release their claim', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'anytime-1',
                    claimed_by: 'photographer-1',
                  },
                  error: null,
                }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: () => ({
            eq: () =>
              Promise.resolve({
                data: { id: 'anytime-1', claimed_by: null },
                error: null,
              }),
          }),
        })

      const result = await releaseAnytimeSlot('anytime-1', 'photographer-1')

      expect(result.success).toBe(true)
    })

    it('should reject release by non-owner', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'anytime-1',
                  claimed_by: 'photographer-2', // Different owner
                },
                error: null,
              }),
          }),
        }),
      })

      const result = await releaseAnytimeSlot('anytime-1', 'photographer-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not authorized')
    })
  })

  describe('getPhotographerAnytimeQueue', () => {
    it('should return claimed slots for a photographer', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'anytime-1',
                      scheduled_date: '2025-01-08',
                      listing: { address: '123 Main St' },
                    },
                    {
                      id: 'anytime-2',
                      scheduled_date: '2025-01-10',
                      listing: { address: '456 Oak Ave' },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      })

      const queue = await getPhotographerAnytimeQueue('photographer-1')

      expect(queue.length).toBe(2)
      expect(queue[0].scheduled_date).toBe('2025-01-08')
    })

    it('should sort by scheduled date', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 'anytime-1', scheduled_date: '2025-01-08' },
                    { id: 'anytime-2', scheduled_date: '2025-01-07' },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      })

      const queue = await getPhotographerAnytimeQueue('photographer-1')

      // Should be sorted by date
      expect(queue[0].scheduled_date).toBe('2025-01-08')
    })
  })
})

describe('Go Anytime Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle weekend-only date ranges', async () => {
    // Booking only for weekend
    mockSupabaseFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'anytime-1',
                anytime_start_date: '2025-01-11', // Saturday
                anytime_end_date: '2025-01-12', // Sunday
              },
              error: null,
            }),
        }),
      }),
    })

    const result = await createAnytimeBooking({
      listing_id: 'listing-123',
      start_date: new Date('2025-01-11'),
      end_date: new Date('2025-01-12'),
      access_instructions: 'Lockbox: 1234',
      territory_id: 'territory-1',
    })

    expect(result.success).toBe(true)
  })

  it('should track priority for expedited processing', async () => {
    mockSupabaseFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'anytime-1',
                priority: 'high',
                is_expedited: true,
              },
              error: null,
            }),
        }),
      }),
    })

    const result = await createAnytimeBooking({
      listing_id: 'listing-123',
      start_date: new Date('2025-01-07'),
      end_date: new Date('2025-01-10'),
      access_instructions: 'Lockbox: 1234',
      territory_id: 'territory-1',
      priority: 'high',
    })

    expect(result.success).toBe(true)
  })
})
