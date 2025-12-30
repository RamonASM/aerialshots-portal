import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateCoupon,
  applyCoupon,
  getCouponByCode,
  createCoupon,
  deactivateCoupon,
  getCouponUsage,
  getCouponStats,
  type Coupon,
  type CouponType,
  type CouponValidationResult,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Helper to create fully chainable mock
const createChain = (finalResult: unknown) => {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'is', 'in', 'contains',
      'gte', 'gt', 'lt', 'lte',
      'order', 'limit', 'range',
      'single', 'maybeSingle', 'rpc'
    ]
    methods.forEach((method) => {
      chain[method] = () => {
        if (method === 'single' || method === 'maybeSingle') {
          return Promise.resolve(finalResult)
        }
        return createNestedChain()
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Coupon Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('validateCoupon', () => {
    it('should validate a valid percentage coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'SAVE20',
            type: 'percentage',
            value: 20,
            is_active: true,
            expires_at: '2025-12-31',
            max_uses: 100,
            current_uses: 10,
          },
          error: null,
        })
      )

      const result = await validateCoupon('SAVE20', { order_total: 100 })

      expect(result.valid).toBe(true)
      expect(result.discount_amount).toBe(20) // 20% of 100
    })

    it('should validate a valid fixed amount coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'FLAT50',
            type: 'fixed',
            value: 50,
            is_active: true,
            expires_at: '2025-12-31',
          },
          error: null,
        })
      )

      const result = await validateCoupon('FLAT50', { order_total: 200 })

      expect(result.valid).toBe(true)
      expect(result.discount_amount).toBe(50)
    })

    it('should reject expired coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'EXPIRED',
            type: 'percentage',
            value: 20,
            is_active: true,
            expires_at: '2024-12-31', // Expired
          },
          error: null,
        })
      )

      const result = await validateCoupon('EXPIRED', { order_total: 100 })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should reject inactive coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'INACTIVE',
            type: 'percentage',
            value: 20,
            is_active: false,
          },
          error: null,
        })
      )

      const result = await validateCoupon('INACTIVE', { order_total: 100 })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('inactive')
    })

    it('should reject coupon exceeding max uses', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'MAXED',
            type: 'percentage',
            value: 20,
            is_active: true,
            max_uses: 100,
            current_uses: 100, // All used up
          },
          error: null,
        })
      )

      const result = await validateCoupon('MAXED', { order_total: 100 })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('limit')
    })

    it('should reject coupon below minimum order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'MINORDER',
            type: 'percentage',
            value: 20,
            is_active: true,
            min_order_amount: 200,
          },
          error: null,
        })
      )

      const result = await validateCoupon('MINORDER', { order_total: 100 })

      expect(result.valid).toBe(false)
      expect(result.error?.toLowerCase()).toContain('minimum')
    })

    it('should return error for invalid coupon code', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const result = await validateCoupon('INVALID', { order_total: 100 })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should cap percentage discount at order total', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'BIG100',
            type: 'percentage',
            value: 100,
            is_active: true,
          },
          error: null,
        })
      )

      const result = await validateCoupon('BIG100', { order_total: 50 })

      expect(result.valid).toBe(true)
      expect(result.discount_amount).toBe(50) // Capped at order total
    })

    it('should cap fixed discount at order total', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'HUGE200',
            type: 'fixed',
            value: 200,
            is_active: true,
          },
          error: null,
        })
      )

      const result = await validateCoupon('HUGE200', { order_total: 100 })

      expect(result.valid).toBe(true)
      expect(result.discount_amount).toBe(100) // Capped at order total
    })
  })

  describe('applyCoupon', () => {
    it('should record coupon usage', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'coupon-1',
              code: 'SAVE20',
              type: 'percentage',
              value: 20,
              is_active: true,
              current_uses: 10,
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { id: 'usage-1' },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { current_uses: 11 },
            error: null,
          })
        )

      const result = await applyCoupon({
        code: 'SAVE20',
        order_id: 'order-1',
        agent_id: 'agent-1',
        discount_amount: 20,
      })

      expect(result.success).toBe(true)
    })

    it('should prevent same user using coupon twice if restricted', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'coupon-1',
              code: 'ONCE',
              is_active: true,
              one_per_user: true,
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: [{ id: 'usage-1' }], // Already used
            error: null,
          })
        )

      const result = await applyCoupon({
        code: 'ONCE',
        order_id: 'order-2',
        agent_id: 'agent-1',
        discount_amount: 20,
        check_one_per_user: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already used')
    })
  })

  describe('createCoupon', () => {
    it('should create a new percentage coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-new',
            code: 'NEWCODE',
            type: 'percentage',
            value: 15,
            is_active: true,
            created_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await createCoupon({
        code: 'NEWCODE',
        type: 'percentage',
        value: 15,
        expires_at: '2025-12-31',
      })

      expect(result.success).toBe(true)
      expect(result.coupon?.code).toBe('NEWCODE')
    })

    it('should create a fixed amount coupon with max uses', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-new',
            code: 'FLAT25',
            type: 'fixed',
            value: 25,
            max_uses: 50,
            is_active: true,
          },
          error: null,
        })
      )

      const result = await createCoupon({
        code: 'FLAT25',
        type: 'fixed',
        value: 25,
        max_uses: 50,
      })

      expect(result.success).toBe(true)
      expect(result.coupon?.max_uses).toBe(50)
    })

    it('should reject duplicate coupon codes', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        })
      )

      const result = await createCoupon({
        code: 'EXISTING',
        type: 'percentage',
        value: 10,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })
  })

  describe('deactivateCoupon', () => {
    it('should deactivate a coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'DEACTIVATED',
            is_active: false,
          },
          error: null,
        })
      )

      const result = await deactivateCoupon('coupon-1')

      expect(result.success).toBe(true)
    })
  })

  describe('getCouponUsage', () => {
    it('should return usage history for a coupon', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'usage-1', agent_id: 'agent-1', order_id: 'order-1', discount_amount: 20 },
            { id: 'usage-2', agent_id: 'agent-2', order_id: 'order-2', discount_amount: 20 },
          ],
          error: null,
        })
      )

      const usage = await getCouponUsage('coupon-1')

      expect(usage.length).toBe(2)
    })
  })

  describe('getCouponStats', () => {
    it('should return coupon statistics', async () => {
      // First call: get coupon
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            current_uses: 50,
            total_discount_given: 1000,
          },
          error: null,
        })
      )
      // Second call: get usages for unique users
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [
            { agent_id: 'agent-1' },
            { agent_id: 'agent-2' },
            { agent_id: 'agent-1' }, // Duplicate
          ],
          error: null,
        })
      )

      const stats = await getCouponStats('coupon-1')

      expect(stats).not.toBeNull()
      expect(stats?.total_uses).toBe(50)
      expect(stats?.total_discount).toBe(1000)
    })
  })
})

describe('Coupon Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-06T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle case-insensitive coupon codes', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'coupon-1',
          code: 'SAVE20',
          type: 'percentage',
          value: 20,
          is_active: true,
        },
        error: null,
      })
    )

    const result = await validateCoupon('save20', { order_total: 100 })

    expect(result.valid).toBe(true)
  })

  it('should handle first-time customer coupons', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'FIRSTORDER',
            type: 'percentage',
            value: 25,
            is_active: true,
            first_order_only: true,
          },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChain({
          data: [], // No previous orders
          error: null,
        })
      )

    const result = await validateCoupon('FIRSTORDER', {
      order_total: 100,
      agent_id: 'new-agent',
      check_first_order: true,
    })

    expect(result.valid).toBe(true)
  })

  it('should reject first-time coupon for returning customer', async () => {
    mockSupabaseFrom
      .mockReturnValueOnce(
        createChain({
          data: {
            id: 'coupon-1',
            code: 'FIRSTORDER',
            type: 'percentage',
            value: 25,
            is_active: true,
            first_order_only: true,
          },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChain({
          data: [{ id: 'order-1' }], // Has previous orders
          error: null,
        })
      )

    const result = await validateCoupon('FIRSTORDER', {
      order_total: 100,
      agent_id: 'returning-agent',
      check_first_order: true,
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('first')
  })
})
