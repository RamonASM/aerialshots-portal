import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getLapsedClients,
  getLapsedClientStats,
  markClientContacted,
  enrollInReengagement,
  getClientLastActivity,
  getAtRiskClients,
  type LapsedClient,
  type LapsedClientStats,
} from './lapsed-clients'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock drip campaign enrollment
vi.mock('@/lib/marketing/drip/service', () => ({
  enrollContact: vi.fn(() => Promise.resolve({ success: true })),
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

describe('Lapsed Client Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getLapsedClients', () => {
    it('should return clients with no orders in 90+ days', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'agent-1',
              name: 'John Agent',
              email: 'john@realty.com',
              last_order_date: '2024-09-15',
              days_since_order: 122,
              total_orders: 5,
              lifetime_value: 1500.00,
            },
            {
              id: 'agent-2',
              name: 'Jane Realtor',
              email: 'jane@homes.com',
              last_order_date: '2024-08-01',
              days_since_order: 167,
              total_orders: 3,
              lifetime_value: 900.00,
            },
          ],
          error: null,
        })
      )

      const result = await getLapsedClients({ days_threshold: 90 })

      expect(result.length).toBe(2)
      expect(result[0].days_since_order).toBeGreaterThan(90)
    })

    it('should filter by days threshold', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', days_since_order: 200 },
          ],
          error: null,
        })
      )

      const result = await getLapsedClients({ days_threshold: 180 })

      expect(result[0].days_since_order).toBeGreaterThan(180)
    })

    it('should exclude already contacted clients', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', days_since_order: 100, last_contacted: null },
          ],
          error: null,
        })
      )

      const result = await getLapsedClients({
        days_threshold: 90,
        exclude_contacted: true,
      })

      expect(result.length).toBe(1)
    })

    it('should sort by lifetime value descending', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', lifetime_value: 5000.00 },
            { id: 'agent-2', lifetime_value: 2000.00 },
          ],
          error: null,
        })
      )

      const result = await getLapsedClients({
        days_threshold: 90,
        sort_by: 'lifetime_value',
      })

      expect(result[0].lifetime_value).toBeGreaterThan(result[1].lifetime_value)
    })

    it('should limit results', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1' },
            { id: 'agent-2' },
          ],
          error: null,
        })
      )

      const result = await getLapsedClients({
        days_threshold: 90,
        limit: 2,
      })

      expect(result.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getLapsedClientStats', () => {
    it('should return lapsed client statistics', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { days_since_order: 95, lifetime_value: 1000 },
            { days_since_order: 120, lifetime_value: 2000 },
            { days_since_order: 200, lifetime_value: 3000 },
          ],
          error: null,
        })
      )

      const result = await getLapsedClientStats()

      expect(result).not.toBeNull()
      expect(result?.total_lapsed).toBe(3)
    })

    it('should calculate total at-risk revenue', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { lifetime_value: 1000 },
            { lifetime_value: 2000 },
            { lifetime_value: 3000 },
          ],
          error: null,
        })
      )

      const result = await getLapsedClientStats()

      expect(result?.total_at_risk_revenue).toBe(6000)
    })

    it('should break down by lapse duration', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { days_since_order: 95 },  // 90-120
            { days_since_order: 100 }, // 90-120
            { days_since_order: 150 }, // 120-180
            { days_since_order: 200 }, // 180+
          ],
          error: null,
        })
      )

      const result = await getLapsedClientStats()

      expect(result?.by_duration).toBeDefined()
      expect(result?.by_duration?.['90_120']).toBe(2)
      expect(result?.by_duration?.['120_180']).toBe(1)
      expect(result?.by_duration?.['180_plus']).toBe(1)
    })

    it('should calculate average days since last order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { days_since_order: 100 },
            { days_since_order: 150 },
            { days_since_order: 200 },
          ],
          error: null,
        })
      )

      const result = await getLapsedClientStats()

      expect(result?.avg_days_lapsed).toBe(150)
    })
  })

  describe('markClientContacted', () => {
    it('should mark client as contacted', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'agent-1',
            last_contacted_at: '2025-01-15T10:00:00',
            contact_method: 'email',
          },
          error: null,
        })
      )

      const result = await markClientContacted('agent-1', {
        method: 'email',
        notes: 'Sent re-engagement email',
      })

      expect(result.success).toBe(true)
    })

    it('should record contact method', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { contact_method: 'phone' },
          error: null,
        })
      )

      const result = await markClientContacted('agent-1', { method: 'phone' })

      expect(result.success).toBe(true)
    })

    it('should store contact notes', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { contact_notes: 'Left voicemail' },
          error: null,
        })
      )

      const result = await markClientContacted('agent-1', {
        method: 'phone',
        notes: 'Left voicemail',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('enrollInReengagement', () => {
    it('should enroll lapsed client in drip campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'enrollment-1' },
          error: null,
        })
      )

      const result = await enrollInReengagement('agent-1', 'reengagement-campaign')

      expect(result.success).toBe(true)
    })

    it('should record enrollment in client record', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { reengagement_enrolled_at: '2025-01-15T10:00:00' },
          error: null,
        })
      )

      const result = await enrollInReengagement('agent-1', 'reengagement-campaign')

      expect(result.success).toBe(true)
    })
  })

  describe('getClientLastActivity', () => {
    it('should return client last activity details', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-123',
            created_at: '2024-09-15T10:00:00',
            total: 299.00,
            services: ['Photo Package'],
          },
          error: null,
        })
      )

      const result = await getClientLastActivity('agent-1')

      expect(result).not.toBeNull()
      expect(result?.last_order_date).toBe('2024-09-15T10:00:00')
    })

    it('should include days since last order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-123',
            created_at: '2024-10-15T10:00:00',
            total: 299.00,
            services: ['Photo Package'],
          },
          error: null,
        })
      )

      const result = await getClientLastActivity('agent-1')

      expect(result?.days_since_order).toBe(92) // Jan 15 - Oct 15
    })

    it('should return null for clients with no orders', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: null,
        })
      )

      const result = await getClientLastActivity('new-agent')

      expect(result).toBeNull()
    })
  })

  describe('getAtRiskClients', () => {
    it('should return clients approaching lapse threshold', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', days_since_order: 75, lifetime_value: 2000 },
            { id: 'agent-2', days_since_order: 80, lifetime_value: 1500 },
          ],
          error: null,
        })
      )

      const result = await getAtRiskClients({ warning_days: 75 })

      expect(result.length).toBe(2)
    })

    it('should prioritize high-value clients', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', lifetime_value: 5000 },
            { id: 'agent-2', lifetime_value: 1000 },
          ],
          error: null,
        })
      )

      const result = await getAtRiskClients({ warning_days: 75 })

      expect(result[0].lifetime_value).toBeGreaterThan(result[1].lifetime_value)
    })

    it('should exclude clients in active drip campaigns', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', active_campaign: null },
          ],
          error: null,
        })
      )

      const result = await getAtRiskClients({
        warning_days: 75,
        exclude_in_campaigns: true,
      })

      expect(result.length).toBe(1)
    })
  })
})

describe('Lapsed Client Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle no lapsed clients', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [],
        error: null,
      })
    )

    const result = await getLapsedClients({ days_threshold: 90 })

    expect(result.length).toBe(0)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Database error' },
      })
    )

    const result = await getLapsedClients({ days_threshold: 90 })

    expect(result).toEqual([])
  })

  it('should handle clients with zero lifetime value', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [
          { id: 'agent-1', lifetime_value: 0, days_since_order: 100 },
        ],
        error: null,
      })
    )

    const result = await getLapsedClients({ days_threshold: 90 })

    expect(result[0].lifetime_value).toBe(0)
  })
})
