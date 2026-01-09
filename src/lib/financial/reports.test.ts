import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getPaymentHistory,
  getRevenueSummary,
  generateTaxReport,
  getMonthlyBreakdown,
  exportFinancialData,
  getPaymentsByDateRange,
  getTopClients,
  type Payment,
  type RevenueSummary,
  type TaxReport,
  type MonthlyBreakdown,
} from './reports'

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

describe('Financial Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getPaymentHistory', () => {
    it('should return paginated payment history for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'pay-1',
              agent_id: 'agent-1',
              amount: 299.00,
              status: 'succeeded',
              created_at: '2025-01-10',
              invoice: { invoice_number: 'ASM-2025-0001' },
            },
            {
              id: 'pay-2',
              agent_id: 'agent-1',
              amount: 449.00,
              status: 'succeeded',
              created_at: '2025-01-05',
              invoice: { invoice_number: 'ASM-2025-0002' },
            },
          ],
          error: null,
        })
      )

      const result = await getPaymentHistory('agent-1', { limit: 10, offset: 0 })

      expect(result.payments.length).toBe(2)
      expect(result.payments[0].status).toBe('succeeded')
    })

    it('should filter by status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'pay-1', status: 'succeeded', amount: 299.00 },
          ],
          error: null,
        })
      )

      const result = await getPaymentHistory('agent-1', { status: 'succeeded' })

      expect(result.payments.every((p) => p.status === 'succeeded')).toBe(true)
    })

    it('should filter by date range', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'pay-1', created_at: '2025-01-10', amount: 299.00 },
          ],
          error: null,
        })
      )

      const result = await getPaymentHistory('agent-1', {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      })

      expect(result.payments.length).toBe(1)
    })

    it('should include total count for pagination', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'pay-1', amount: 299.00 },
            { id: 'pay-2', amount: 449.00 },
          ],
          error: null,
        })
      )

      const result = await getPaymentHistory('agent-1', { limit: 2 })

      expect(result.total).toBeDefined()
    })
  })

  describe('getRevenueSummary', () => {
    it('should return revenue summary for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 449.00, status: 'succeeded', created_at: '2025-01-05' },
            { amount: 199.00, status: 'succeeded', created_at: '2024-12-15' },
          ],
          error: null,
        })
      )

      const result = await getRevenueSummary('agent-1')

      expect(result).not.toBeNull()
      expect(result?.total_spent).toBeGreaterThan(0)
    })

    it('should calculate year-to-date spending', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 449.00, status: 'succeeded', created_at: '2025-01-05' },
          ],
          error: null,
        })
      )

      const result = await getRevenueSummary('agent-1')

      expect(result?.ytd_spent).toBe(748.00)
    })

    it('should calculate average order value', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 300.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 500.00, status: 'succeeded', created_at: '2025-01-05' },
          ],
          error: null,
        })
      )

      const result = await getRevenueSummary('agent-1')

      expect(result?.avg_order_value).toBe(400.00)
    })

    it('should count total orders', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded' },
            { amount: 449.00, status: 'succeeded' },
            { amount: 199.00, status: 'succeeded' },
          ],
          error: null,
        })
      )

      const result = await getRevenueSummary('agent-1')

      expect(result?.total_orders).toBe(3)
    })
  })

  describe('generateTaxReport', () => {
    it('should generate tax report for a year', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2024-03-15' },
            { amount: 449.00, status: 'succeeded', created_at: '2024-06-20' },
            { amount: 199.00, status: 'succeeded', created_at: '2024-09-10' },
          ],
          error: null,
        })
      )

      const result = await generateTaxReport('agent-1', 2024)

      expect(result).not.toBeNull()
      expect(result?.year).toBe(2024)
      expect(result?.total_payments).toBe(947.00)
    })

    it('should break down by quarter', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 100.00, status: 'succeeded', created_at: '2024-01-15' }, // Q1
            { amount: 200.00, status: 'succeeded', created_at: '2024-04-15' }, // Q2
            { amount: 300.00, status: 'succeeded', created_at: '2024-07-15' }, // Q3
            { amount: 400.00, status: 'succeeded', created_at: '2024-10-15' }, // Q4
          ],
          error: null,
        })
      )

      const result = await generateTaxReport('agent-1', 2024)

      expect(result?.quarterly_breakdown).toBeDefined()
      expect(result?.quarterly_breakdown?.Q1).toBe(100.00)
      expect(result?.quarterly_breakdown?.Q2).toBe(200.00)
      expect(result?.quarterly_breakdown?.Q3).toBe(300.00)
      expect(result?.quarterly_breakdown?.Q4).toBe(400.00)
    })

    it('should include payment count', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2024-03-15' },
            { amount: 449.00, status: 'succeeded', created_at: '2024-06-20' },
          ],
          error: null,
        })
      )

      const result = await generateTaxReport('agent-1', 2024)

      expect(result?.payment_count).toBe(2)
    })

    it('should only include succeeded payments', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2024-03-15' },
          ],
          error: null,
        })
      )

      const result = await generateTaxReport('agent-1', 2024)

      expect(result?.total_payments).toBe(299.00)
    })
  })

  describe('getMonthlyBreakdown', () => {
    it('should return spending by month', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 200.00, status: 'succeeded', created_at: '2025-01-20' },
            { amount: 449.00, status: 'succeeded', created_at: '2024-12-15' },
          ],
          error: null,
        })
      )

      const result = await getMonthlyBreakdown('agent-1', 2025)

      expect(result.length).toBeGreaterThan(0)
      const january = result.find((m) => m.month === 1)
      expect(january?.total).toBe(499.00)
    })

    it('should include order count per month', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 200.00, status: 'succeeded', created_at: '2025-01-20' },
          ],
          error: null,
        })
      )

      const result = await getMonthlyBreakdown('agent-1', 2025)

      const january = result.find((m) => m.month === 1)
      expect(january?.order_count).toBe(2)
    })

    it('should return empty months with zero values', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-06-10' },
          ],
          error: null,
        })
      )

      const result = await getMonthlyBreakdown('agent-1', 2025)

      expect(result.length).toBe(12) // All months
      const january = result.find((m) => m.month === 1)
      expect(january?.total).toBe(0)
    })
  })

  describe('exportFinancialData', () => {
    it('should export to CSV format', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'pay-1',
              amount: 299.00,
              status: 'succeeded',
              created_at: '2025-01-10',
              invoice: { invoice_number: 'ASM-2025-0001', listing_address: '123 Main St' },
            },
          ],
          error: null,
        })
      )

      const result = await exportFinancialData('agent-1', {
        format: 'csv',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      })

      expect(result.success).toBe(true)
      expect(result.data).toContain('Date,Invoice,Address,Amount,Status')
    })

    it('should export to JSON format', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'pay-1',
              amount: 299.00,
              status: 'succeeded',
              created_at: '2025-01-10',
            },
          ],
          error: null,
        })
      )

      const result = await exportFinancialData('agent-1', {
        format: 'json',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      })

      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.data!)
      expect(Array.isArray(parsed.payments)).toBe(true)
    })

    it('should include summary in export', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { amount: 299.00, status: 'succeeded', created_at: '2025-01-10' },
            { amount: 449.00, status: 'succeeded', created_at: '2025-01-15' },
          ],
          error: null,
        })
      )

      const result = await exportFinancialData('agent-1', {
        format: 'json',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        include_summary: true,
      })

      const parsed = JSON.parse(result.data!)
      expect(parsed.summary).toBeDefined()
      expect(parsed.summary.total).toBe(748.00)
    })
  })

  describe('getPaymentsByDateRange', () => {
    it('should return payments within date range', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'pay-1', amount: 299.00, created_at: '2025-01-10' },
            { id: 'pay-2', amount: 449.00, created_at: '2025-01-15' },
          ],
          error: null,
        })
      )

      const result = await getPaymentsByDateRange('agent-1', '2025-01-01', '2025-01-31')

      expect(result.length).toBe(2)
    })

    it('should calculate total for date range', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'pay-1', amount: 299.00, status: 'succeeded' },
            { id: 'pay-2', amount: 449.00, status: 'succeeded' },
          ],
          error: null,
        })
      )

      const result = await getPaymentsByDateRange('agent-1', '2025-01-01', '2025-01-31')

      const total = result.reduce((sum, p) => sum + p.amount, 0)
      expect(total).toBe(748.00)
    })
  })

  describe('getTopClients', () => {
    it('should return top spending clients (admin only)', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { agent_id: 'agent-1', total_spent: 5000.00, order_count: 15, agent: { name: 'John Agent' } },
            { agent_id: 'agent-2', total_spent: 3500.00, order_count: 10, agent: { name: 'Jane Realtor' } },
          ],
          error: null,
        })
      )

      const result = await getTopClients({ limit: 10, period: 'year' })

      expect(result.length).toBe(2)
      expect(result[0].total_spent).toBeGreaterThan(result[1].total_spent)
    })

    it('should filter by time period', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { agent_id: 'agent-1', total_spent: 1500.00, order_count: 5 },
          ],
          error: null,
        })
      )

      const result = await getTopClients({ limit: 10, period: 'month' })

      expect(result.length).toBe(1)
    })
  })
})

describe('Financial Report Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle no payments gracefully', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [],
        error: null,
      })
    )

    const result = await getRevenueSummary('agent-1')

    expect(result?.total_spent).toBe(0)
    expect(result?.total_orders).toBe(0)
  })

  it('should handle database errors', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Database error' },
      })
    )

    const result = await getPaymentHistory('agent-1')

    expect(result.payments).toEqual([])
  })

  it('should round currency values correctly', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [
          { amount: 99.99, status: 'succeeded' },
          { amount: 49.99, status: 'succeeded' },
        ],
        error: null,
      })
    )

    const result = await getRevenueSummary('agent-1')

    // Should not have floating point precision issues
    expect(result?.total_spent).toBe(149.98)
  })
})
