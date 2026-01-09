import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSubscriptionPlans,
  getAgentSubscriptions,
  createSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  getSubscriptionUsage,
  processSubscriptionRenewal,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock Stripe
vi.mock('@/lib/payments/stripe', () => ({
  createStripeSubscription: vi.fn(() =>
    Promise.resolve({
      success: true,
      subscriptionId: 'sub_test_123',
      clientSecret: 'seti_test_secret',
    })
  ),
  cancelStripeSubscription: vi.fn(() =>
    Promise.resolve({ success: true })
  ),
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
      'single', 'maybeSingle', 'rpc', 'returns'
    ]
    methods.forEach((method) => {
      chain[method] = () => createNestedChain()
    })
    // Terminal methods return a thenable with .returns()
    const terminalMethods = ['single', 'maybeSingle']
    terminalMethods.forEach((method) => {
      chain[method] = () => {
        const result = Promise.resolve(finalResult) as Promise<unknown> & { returns: () => Promise<unknown> }
        result.returns = () => result
        return result
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Subscription Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('getSubscriptionPlans', () => {
    it('should return all available subscription plans', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'plan-basic',
              name: 'Basic',
              price_monthly: 29.99,
              features: ['Feature 1', 'Feature 2'],
              is_active: true,
            },
            {
              id: 'plan-pro',
              name: 'Pro',
              price_monthly: 79.99,
              features: ['Feature 1', 'Feature 2', 'Feature 3'],
              is_active: true,
            },
          ],
          error: null,
        })
      )

      const plans = await getSubscriptionPlans()

      expect(plans.length).toBe(2)
      expect(plans[0].name).toBe('Basic')
    })

    it('should only return active plans', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'plan-1', name: 'Active', is_active: true },
          ],
          error: null,
        })
      )

      const plans = await getSubscriptionPlans()

      expect(plans.every((p) => p.is_active)).toBe(true)
    })
  })

  describe('getAgentSubscriptions', () => {
    it('should return all subscriptions for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'sub-1',
              agent_id: 'agent-1',
              plan_id: 'plan-pro',
              status: 'active',
              current_period_end: '2025-02-06',
            },
          ],
          error: null,
        })
      )

      const subs = await getAgentSubscriptions('agent-1')

      expect(subs.length).toBe(1)
      expect(subs[0].status).toBe('active')
    })

    it('should return empty array when no subscriptions', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [],
          error: null,
        })
      )

      const subs = await getAgentSubscriptions('agent-1')

      expect(subs.length).toBe(0)
    })
  })

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-new',
            agent_id: 'agent-1',
            plan_id: 'plan-pro',
            status: 'active',
            stripe_subscription_id: 'sub_test_123',
            current_period_start: '2025-01-06',
            current_period_end: '2025-02-06',
          },
          error: null,
        })
      )

      const result = await createSubscription({
        agent_id: 'agent-1',
        plan_id: 'plan-pro',
        payment_method_id: 'pm_test_123',
      })

      expect(result.success).toBe(true)
      expect(result.subscription?.status).toBe('active')
    })

    it('should prevent duplicate active subscriptions for same plan', async () => {
      // First check for existing
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'existing-sub', status: 'active' }],
          error: null,
        })
      )

      const result = await createSubscription({
        agent_id: 'agent-1',
        plan_id: 'plan-pro',
        payment_method_id: 'pm_test_123',
        check_existing: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel a subscription', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'sub-1',
            stripe_subscription_id: 'sub_test_123',
            status: 'active',
          },
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'sub-1',
            status: 'cancelled',
            cancelled_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await cancelSubscription('sub-1', { reason: 'User requested' })

      expect(result.success).toBe(true)
    })

    it('should support immediate vs end-of-period cancellation', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'sub-1',
            stripe_subscription_id: 'sub_test_123',
            status: 'active',
          },
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'sub-1',
            status: 'active', // Still active until period end
            cancel_at_period_end: true,
          },
          error: null,
        })
      )

      const result = await cancelSubscription('sub-1', { at_period_end: true })

      expect(result.success).toBe(true)
    })
  })

  describe('pauseSubscription', () => {
    it('should pause a subscription', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-1',
            status: 'paused',
            paused_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await pauseSubscription('sub-1')

      expect(result.success).toBe(true)
      expect(result.subscription?.status).toBe('paused')
    })
  })

  describe('resumeSubscription', () => {
    it('should resume a paused subscription', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-1',
            status: 'active',
            paused_at: null,
          },
          error: null,
        })
      )

      const result = await resumeSubscription('sub-1')

      expect(result.success).toBe(true)
      expect(result.subscription?.status).toBe('active')
    })
  })

  describe('getSubscriptionUsage', () => {
    it('should return usage metrics for a subscription', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-1',
            plan: {
              included_photos: 100,
              included_videos: 10,
            },
            usage: {
              photos_used: 45,
              videos_used: 3,
            },
          },
          error: null,
        })
      )

      const usage = await getSubscriptionUsage('sub-1')

      expect(usage).not.toBeNull()
      expect(usage?.photos_remaining).toBe(55)
      expect(usage?.videos_remaining).toBe(7)
    })
  })
})

describe('Subscription Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('processSubscriptionRenewal', () => {
    it('should process successful renewal', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-1',
            status: 'active',
            current_period_start: '2025-02-06',
            current_period_end: '2025-03-06',
          },
          error: null,
        })
      )

      const result = await processSubscriptionRenewal({
        subscription_id: 'sub-1',
        stripe_invoice_id: 'in_test_123',
        amount_paid: 79.99,
      })

      expect(result.success).toBe(true)
    })

    it('should handle failed renewal payment', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'sub-1',
            status: 'past_due',
          },
          error: null,
        })
      )

      const result = await processSubscriptionRenewal({
        subscription_id: 'sub-1',
        stripe_invoice_id: 'in_test_123',
        amount_paid: 0,
        payment_failed: true,
      })

      expect(result.success).toBe(true)
      expect(result.subscription?.status).toBe('past_due')
    })
  })
})

describe('Subscription Plan Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include plan features in response', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [
          {
            id: 'plan-pro',
            name: 'Pro',
            features: [
              'Unlimited photos',
              'Priority support',
              'Custom branding',
            ],
            price_monthly: 79.99,
            price_yearly: 799.99,
          },
        ],
        error: null,
      })
    )

    const plans = await getSubscriptionPlans()

    expect(plans[0].features).toContain('Priority support')
  })

  it('should support annual pricing discount', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [
          {
            id: 'plan-pro',
            name: 'Pro',
            price_monthly: 79.99,
            price_yearly: 799.99, // ~17% savings
          },
        ],
        error: null,
      })
    )

    const plans = await getSubscriptionPlans()

    expect(plans[0].price_yearly).toBeLessThan(plans[0].price_monthly * 12)
  })
})
