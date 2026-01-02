import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  joinWaitlist,
  leaveWaitlist,
  getWaitlistPosition,
  getWaitlistForDate,
  notifyWaitlistSlotAvailable,
  processWaitlistNotifications,
  getClientWaitlistEntries,
  type WaitlistEntry,
  type WaitlistJoinResult,
} from './waitlist'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  }),
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  sendNotification: vi.fn(() => Promise.resolve({ success: true })),
}))

// Helper to create a chainable Supabase mock that supports any chain length
// Creates a thenable object (can be awaited) with all chain methods
const createChain = (finalResult: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    // Make the chain thenable - this allows `await chain.eq().order()` to work
    then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(finalResult).then(onFulfilled, onRejected)
    },
    // single() explicitly returns a promise
    single() {
      return Promise.resolve(finalResult)
    },
  }

  // All chain methods return the chain itself
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'is', 'gte', 'lt', 'lte', 'order', 'limit', 'contains', 'from']
  methods.forEach((method) => {
    chain[method] = () => chain
  })

  return chain
}

describe('Appointment Waitlist', () => {
  beforeEach(() => {
    vi.resetAllMocks() // Reset mocks including mockReturnValueOnce queue
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
    // Set default mocks to prevent "not a function" errors
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('joinWaitlist', () => {
    it('should add client to waitlist for a date', async () => {
      // First call: get existing entries count
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: [], error: null })
      )
      // Second call: insert new entry
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'waitlist-1',
            client_email: 'agent@realty.com',
            territory_id: 'territory-1',
            requested_date: '2025-01-10',
            status: 'waiting',
            position: 1,
            created_at: '2025-01-06T10:00:00',
          },
          error: null,
        })
      )

      const result = await joinWaitlist({
        client_email: 'agent@realty.com',
        client_name: 'John Agent',
        territory_id: 'territory-1',
        requested_date: new Date('2025-01-10'),
        listing_id: 'listing-123',
      })

      expect(result.success).toBe(true)
      expect(result.entry?.position).toBe(1)
      expect(result.entry?.status).toBe('waiting')
    })

    it('should assign correct position in queue', async () => {
      // First call: get existing entries (2 already exist)
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: [{ id: 'existing-1' }, { id: 'existing-2' }], error: null })
      )
      // Second call: insert at position 3
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'waitlist-3',
            position: 3,
            status: 'waiting',
          },
          error: null,
        })
      )

      const result = await joinWaitlist({
        client_email: 'agent@realty.com',
        client_name: 'John Agent',
        territory_id: 'territory-1',
        requested_date: new Date('2025-01-10'),
        listing_id: 'listing-123',
      })

      expect(result.success).toBe(true)
      expect(result.entry?.position).toBe(3)
    })

    it('should prevent duplicate entries for same date', async () => {
      // Mock for duplicate check - returns existing entry
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'existing', client_email: 'agent@realty.com' }],
          error: null,
        })
      )

      const result = await joinWaitlist({
        client_email: 'agent@realty.com',
        client_name: 'John Agent',
        territory_id: 'territory-1',
        requested_date: new Date('2025-01-10'),
        listing_id: 'listing-123',
        check_duplicates: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already on the waitlist')
    })

    it('should validate date is in the future', async () => {
      const result = await joinWaitlist({
        client_email: 'agent@realty.com',
        client_name: 'John Agent',
        territory_id: 'territory-1',
        requested_date: new Date('2025-01-05'), // Past date
        listing_id: 'listing-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('future')
    })
  })

  describe('leaveWaitlist', () => {
    it('should remove client from waitlist', async () => {
      // First call: get entry details
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'waitlist-1',
            position: 1,
            territory_id: 'territory-1',
            requested_date: '2025-01-10',
          },
          error: null,
        })
      )
      // Second call: delete
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ error: null })
      )
      // Third call: rpc to reorder
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: null, error: null })
      )

      const result = await leaveWaitlist('waitlist-1', 'agent@realty.com')

      expect(result.success).toBe(true)
    })

    it('should update positions of remaining entries', async () => {
      // First call: get entry details
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'waitlist-1',
            position: 2,
            territory_id: 'territory-1',
            requested_date: '2025-01-10',
          },
          error: null,
        })
      )
      // Second call: delete
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ error: null })
      )
      // Third call: rpc to reorder
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: null, error: null })
      )

      const result = await leaveWaitlist('waitlist-1', 'agent@realty.com')

      expect(result.success).toBe(true)
    })
  })

  describe('getWaitlistPosition', () => {
    it('should return current position', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'waitlist-1',
            position: 3,
            status: 'waiting',
          },
          error: null,
        })
      )

      const position = await getWaitlistPosition('waitlist-1')

      expect(position).toBe(3)
    })

    it('should return null for invalid entry', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const position = await getWaitlistPosition('invalid-id')

      expect(position).toBeNull()
    })
  })

  describe('getWaitlistForDate', () => {
    it('should return all entries for a date', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [
            { id: 'waitlist-1', position: 1, client_name: 'Agent 1' },
            { id: 'waitlist-2', position: 2, client_name: 'Agent 2' },
            { id: 'waitlist-3', position: 3, client_name: 'Agent 3' },
          ],
          error: null,
        })
      )

      const entries = await getWaitlistForDate('territory-1', new Date('2025-01-10'))

      expect(entries.length).toBe(3)
      expect(entries[0].position).toBe(1)
    })

    it('should return empty array when no waitlist', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: [], error: null })
      )

      const entries = await getWaitlistForDate('territory-1', new Date('2025-01-10'))

      expect(entries.length).toBe(0)
    })
  })

  describe('notifyWaitlistSlotAvailable', () => {
    it('should notify first person on waitlist', async () => {
      // First call: get first waiting entry
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [
            {
              id: 'waitlist-1',
              client_email: 'first@realty.com',
              client_name: 'First Agent',
              position: 1,
              notification_count: 0,
            },
          ],
          error: null,
        })
      )
      // Second call: update notification count
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ error: null })
      )

      const result = await notifyWaitlistSlotAvailable('territory-1', new Date('2025-01-10'))

      expect(result.notified).toBe(true)
      expect(result.client_email).toBe('first@realty.com')
    })

    it('should return no notification when waitlist empty', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ data: [], error: null })
      )

      const result = await notifyWaitlistSlotAvailable('territory-1', new Date('2025-01-10'))

      expect(result.notified).toBe(false)
    })
  })

  describe('getClientWaitlistEntries', () => {
    it('should return all waitlist entries for a client', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [
            { id: 'waitlist-1', requested_date: '2025-01-10', position: 2 },
            { id: 'waitlist-2', requested_date: '2025-01-12', position: 1 },
          ],
          error: null,
        })
      )

      const entries = await getClientWaitlistEntries('agent@realty.com')

      expect(entries.length).toBe(2)
    })

    it('should only return active entries', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'waitlist-1', status: 'waiting' }],
          error: null,
        })
      )

      const entries = await getClientWaitlistEntries('agent@realty.com')

      expect(entries.length).toBe(1)
    })
  })
})

describe('Waitlist Edge Cases', () => {
  beforeEach(() => {
    vi.resetAllMocks() // Reset mocks including mockReturnValueOnce queue
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
    // Set default mocks to prevent "not a function" errors
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle multiple territories', async () => {
    // First call: get existing entries count
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({ data: [], error: null })
    )
    // Second call: insert new entry
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: {
          id: 'waitlist-1',
          territory_id: 'territory-2',
          position: 1,
          status: 'waiting',
        },
        error: null,
      })
    )

    const result = await joinWaitlist({
      client_email: 'agent@realty.com',
      client_name: 'John Agent',
      territory_id: 'territory-2',
      requested_date: new Date('2025-01-10'),
      listing_id: 'listing-123',
    })

    expect(result.success).toBe(true)
  })

  it('should allow flexible date matching', async () => {
    // First call: get existing entries count
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({ data: [], error: null })
    )
    // Second call: insert new entry with flexible dates
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: {
          id: 'waitlist-1',
          flexible_dates: true,
          date_range_start: '2025-01-10',
          date_range_end: '2025-01-15',
          status: 'waiting',
        },
        error: null,
      })
    )

    const result = await joinWaitlist({
      client_email: 'agent@realty.com',
      client_name: 'John Agent',
      territory_id: 'territory-1',
      requested_date: new Date('2025-01-10'),
      listing_id: 'listing-123',
      flexible_dates: true,
      date_range_end: new Date('2025-01-15'),
    })

    expect(result.success).toBe(true)
  })

  it('should track notification attempts', async () => {
    // First call: get waiting entries
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: [
          {
            id: 'waitlist-1',
            client_email: 'agent@realty.com',
            client_name: 'Test Agent',
            notification_count: 0,
          },
        ],
        error: null,
      })
    )
    // Second call: update notification count
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({ error: null })
    )

    const result = await notifyWaitlistSlotAvailable('territory-1', new Date('2025-01-10'))

    expect(result.notified).toBe(true)
  })

  it('should expire entries after max notification attempts', async () => {
    // Return entry with max notification count reached
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: [
          {
            id: 'waitlist-1',
            notification_count: 3, // Max attempts reached
            status: 'expired',
          },
        ],
        error: null,
      })
    )

    const result = await notifyWaitlistSlotAvailable('territory-1', new Date('2025-01-10'))

    // Should skip expired entries
    expect(result.notified).toBe(false)
  })
})
