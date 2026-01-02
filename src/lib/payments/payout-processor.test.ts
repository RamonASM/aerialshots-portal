import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before they're used
const {
  mockCreateTransfer,
  mockReverseTransfer,
  mockSupabaseFrom,
  mockSupabaseSelect,
  mockSupabaseInsert,
  mockSupabaseUpdate,
  mockSupabaseEq,
  mockSupabaseSingle,
} = vi.hoisted(() => ({
  mockCreateTransfer: vi.fn(),
  mockReverseTransfer: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseInsert: vi.fn(),
  mockSupabaseUpdate: vi.fn(),
  mockSupabaseEq: vi.fn(),
  mockSupabaseSingle: vi.fn(),
}))

// Mock stripe-connect
vi.mock('./stripe-connect', () => ({
  createTransfer: mockCreateTransfer,
  reverseTransfer: mockReverseTransfer,
}))

// Build chainable mock methods
const buildChainableMock = () => {
  mockSupabaseSelect.mockReturnValue({
    eq: mockSupabaseEq,
    single: mockSupabaseSingle,
  })

  mockSupabaseInsert.mockReturnValue({
    select: mockSupabaseSelect,
    single: mockSupabaseSingle,
  })

  mockSupabaseUpdate.mockReturnValue({
    eq: mockSupabaseEq,
  })

  mockSupabaseEq.mockReturnValue({
    eq: mockSupabaseEq,
    single: mockSupabaseSingle,
  })
}

// Mock Supabase admin
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
  formatError: (e: Error) => ({ message: e.message }),
}))

// Import after mocks
import { processJobPayouts, reverseOrderPayouts, getOrderByListingId } from './payout-processor'

describe('payout-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildChainableMock()
  })

  // Test data factories
  const createOrder = (overrides = {}) => ({
    id: 'order-123',
    listing_id: 'listing-456',
    total_cents: 40000, // $400
    payment_status: 'completed',
    property_address: '123 Main St',
    ...overrides,
  })

  const createListing = (overrides = {}) => ({
    id: 'listing-456',
    photographer_id: 'staff-789',
    agent_id: 'agent-111',
    ...overrides,
  })

  const createStaff = (overrides = {}) => ({
    id: 'staff-789',
    name: 'John Photographer',
    email: 'john@example.com',
    role: 'photographer',
    payout_type: '1099',
    default_payout_percent: 40,
    stripe_connect_id: 'acct_123',
    stripe_payouts_enabled: true,
    partner_id: null,
    ...overrides,
  })

  const createPartner = (overrides = {}) => ({
    id: 'partner-222',
    name: 'Partner Corp',
    email: 'partner@example.com',
    default_profit_percent: 25,
    stripe_connect_id: 'acct_partner',
    stripe_payouts_enabled: true,
    ...overrides,
  })

  const createSettings = () => ({
    photographer_default_percent: 40,
    videographer_default_percent: 20,
    partner_default_percent: 25,
    video_editor_pool_percent: 5,
    qc_pool_percent: 5,
    operating_pool_percent: 5,
    auto_payout_enabled: true,
  })

  describe('processJobPayouts', () => {
    it('processes photographer payout correctly', async () => {
      const order = createOrder()
      const listing = createListing()
      const staff = createStaff()
      const settings = createSettings()

      // Setup mock responses
      let callIndex = 0
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [
                { key: 'photographer_default_percent', value: '40' },
                { key: 'videographer_default_percent', value: '20' },
                { key: 'partner_default_percent', value: '25' },
                { key: 'video_editor_pool_percent', value: '5' },
                { key: 'qc_pool_percent', value: '5' },
                { key: 'operating_pool_percent', value: '5' },
                { key: 'auto_payout_enabled', value: 'true' },
              ],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }), // No videographer
              }),
            }),
          }
        }
        if (table === 'staff_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        }
      })

      mockCreateTransfer.mockResolvedValue({
        success: true,
        transferId: 'tr_123',
      })

      const result = await processJobPayouts(order, listing)

      expect(result.photographerPaid).toBe(true)
      expect(result.poolsAllocated).toBe(true)
      expect(result.errors).toHaveLength(0)

      // Verify transfer was called with correct amount (40% of $400 = $160)
      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 16000, // 40% of 40000
          destinationAccountId: 'acct_123',
        })
      )
    })

    it('skips payout when auto_payout_enabled is false', async () => {
      const order = createOrder()
      const listing = createListing()

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'false' }],
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      const result = await processJobPayouts(order, listing)

      expect(result.success).toBe(true)
      expect(result.photographerPaid).toBe(false)
      expect(mockCreateTransfer).not.toHaveBeenCalled()
    })

    it('handles missing photographer gracefully', async () => {
      const order = createOrder()
      const listing = createListing({ photographer_id: null })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'true' }],
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      const result = await processJobPayouts(order, listing)

      expect(result.errors).toContain('No photographer assigned')
      expect(result.poolsAllocated).toBe(true) // Pools still allocated
    })

    it('records failed payout when Stripe Connect not enabled', async () => {
      const order = createOrder()
      const listing = createListing()
      const staff = createStaff({
        stripe_connect_id: null,
        stripe_payouts_enabled: false,
      })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'true' }],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'staff_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        }
      })

      const result = await processJobPayouts(order, listing)

      expect(result.photographerPaid).toBe(false)
      expect(result.errors).toContain('Failed to process photographer payout')
      expect(mockCreateTransfer).not.toHaveBeenCalled()
    })

    it('handles partner payouts correctly', async () => {
      const order = createOrder()
      const listing = createListing()
      const staff = createStaff({ partner_id: 'partner-222' })
      const partner = createPartner()

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'true' }],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'partners') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: partner }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'staff_payouts' || table === 'partner_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      mockCreateTransfer.mockResolvedValue({
        success: true,
        transferId: 'tr_456',
      })

      const result = await processJobPayouts(order, listing)

      expect(result.photographerPaid).toBe(true)
      expect(result.partnerPaid).toBe(true)

      // Verify partner transfer was called (25% of $400 = $100)
      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 10000, // 25% of 40000
          destinationAccountId: 'acct_partner',
        })
      )
    })

    it('allocates correct pool percentages', async () => {
      const order = createOrder()
      const listing = createListing({ photographer_id: null })
      let insertedPools: { pool_type: string; amount_cents: number }[] = []

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [
                { key: 'auto_payout_enabled', value: 'true' },
                { key: 'video_editor_pool_percent', value: '5' },
                { key: 'qc_pool_percent', value: '5' },
                { key: 'operating_pool_percent', value: '5' },
              ],
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: (entries: typeof insertedPools) => {
              insertedPools = entries
              return { error: null }
            },
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      await processJobPayouts(order, listing)

      // Verify pool allocations (5% each of $400 = $20 each)
      expect(insertedPools).toHaveLength(3)
      expect(insertedPools.find(p => p.pool_type === 'video_editor')?.amount_cents).toBe(2000)
      expect(insertedPools.find(p => p.pool_type === 'qc_fund')?.amount_cents).toBe(2000)
      expect(insertedPools.find(p => p.pool_type === 'operating')?.amount_cents).toBe(2000)
    })

    it('handles Stripe transfer failure gracefully', async () => {
      const order = createOrder()
      const listing = createListing()
      const staff = createStaff()

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'true' }],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'staff_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      mockCreateTransfer.mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      })

      const result = await processJobPayouts(order, listing)

      expect(result.photographerPaid).toBe(false)
      expect(result.errors).toContain('Failed to process photographer payout')
    })
  })

  describe('reverseOrderPayouts', () => {
    it('reverses all completed transfers', async () => {
      const staffPayouts = [
        { id: 'sp-1', stripe_transfer_id: 'tr_staff1', payout_amount_cents: 16000 },
        { id: 'sp-2', stripe_transfer_id: 'tr_staff2', payout_amount_cents: 8000 },
      ]
      const partnerPayouts = [
        { id: 'pp-1', stripe_transfer_id: 'tr_partner1', payout_amount_cents: 10000 },
      ]

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'staff_payouts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  data: staffPayouts,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({ error: null }),
            }),
          }
        }
        if (table === 'partner_payouts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  data: partnerPayouts,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({ error: null }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ eq: () => ({ data: [] }) }) }),
        }
      })

      mockReverseTransfer.mockResolvedValue({ success: true })

      const result = await reverseOrderPayouts('order-123', 'Customer refund')

      expect(result.success).toBe(true)
      expect(result.reversedCount).toBe(3)
      expect(result.errors).toHaveLength(0)

      expect(mockReverseTransfer).toHaveBeenCalledTimes(3)
      expect(mockReverseTransfer).toHaveBeenCalledWith({
        transferId: 'tr_staff1',
        reason: 'Customer refund',
      })
    })

    it('handles partial reversal failure', async () => {
      const staffPayouts = [
        { id: 'sp-1', stripe_transfer_id: 'tr_staff1', payout_amount_cents: 16000 },
        { id: 'sp-2', stripe_transfer_id: 'tr_staff2', payout_amount_cents: 8000 },
      ]

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'staff_payouts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  data: staffPayouts,
                }),
              }),
            }),
            update: () => ({
              eq: () => ({ error: null }),
            }),
          }
        }
        if (table === 'partner_payouts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  data: [],
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ eq: () => ({ data: [] }) }) }),
        }
      })

      mockReverseTransfer
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Transfer already reversed' })

      const result = await reverseOrderPayouts('order-123', 'Refund')

      expect(result.success).toBe(false)
      expect(result.reversedCount).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Transfer already reversed')
    })

    it('returns success when no payouts exist', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              data: [],
            }),
          }),
        }),
      }))

      const result = await reverseOrderPayouts('order-123', 'Refund')

      expect(result.success).toBe(true)
      expect(result.reversedCount).toBe(0)
    })
  })

  describe('getOrderByListingId', () => {
    it('returns order data for listing', async () => {
      const expectedOrder = {
        id: 'order-123',
        listing_id: 'listing-456',
        total_cents: 40000,
        payment_status: 'completed',
        property_address: '123 Main St',
      }

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: expectedOrder,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      const result = await getOrderByListingId('listing-456')

      expect(result).toEqual(expectedOrder)
    })

    it('returns null when order not found', async () => {
      mockSupabaseFrom.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: null,
            }),
          }),
        }),
      }))

      const result = await getOrderByListingId('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('percentage calculations', () => {
    it('calculates correct photographer percentage', async () => {
      const order = createOrder({ total_cents: 50000 }) // $500
      const listing = createListing()
      const staff = createStaff({ default_payout_percent: 45 })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [{ key: 'auto_payout_enabled', value: 'true' }],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'staff_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      mockCreateTransfer.mockResolvedValue({
        success: true,
        transferId: 'tr_789',
      })

      await processJobPayouts(order, listing)

      // Verify transfer amount: 45% of $500 = $225 = 22500 cents
      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 22500,
        })
      )
    })

    it('uses default percentage when staff has no custom percent', async () => {
      const order = createOrder({ total_cents: 40000 })
      const listing = createListing()
      const staff = createStaff({ default_payout_percent: undefined })

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === 'payout_settings') {
          return {
            select: () => ({
              data: [
                { key: 'auto_payout_enabled', value: 'true' },
                { key: 'photographer_default_percent', value: '40' },
              ],
            }),
          }
        }
        if (table === 'staff') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: staff }),
              }),
            }),
          }
        }
        if (table === 'photographer_assignments') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null }),
              }),
            }),
          }
        }
        if (table === 'staff_payouts') {
          return {
            insert: () => ({
              select: () => ({
                single: () => ({ data: { id: 'payout-1' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'company_pool') {
          return {
            insert: () => ({ error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }),
        }
      })

      mockCreateTransfer.mockResolvedValue({
        success: true,
        transferId: 'tr_default',
      })

      await processJobPayouts(order, listing)

      // Should use default 40%: 40% of $400 = $160 = 16000 cents
      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 16000,
        })
      )
    })
  })
})
