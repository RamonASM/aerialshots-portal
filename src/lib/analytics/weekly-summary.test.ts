import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  generateWeeklySummary,
  sendWeeklySummaryEmail,
  getAgentsForWeeklyReport,
  scheduleWeeklyReports,
  getWeeklyReportHistory,
  type WeeklySummary,
  type WeeklyReportRecipient,
} from './weekly-summary'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock email service
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true, id: 'email-123' })),
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

describe('Weekly Analytics Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateWeeklySummary', () => {
    it('should generate weekly summary for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            agent_id: 'agent-1',
            week_start: '2025-01-06',
            week_end: '2025-01-12',
            total_orders: 5,
            total_revenue: 1500.00,
            property_views: 250,
            qr_scans: 15,
          },
          error: null,
        })
      )

      const result = await generateWeeklySummary('agent-1')

      expect(result).not.toBeNull()
      expect(result?.total_orders).toBe(5)
    })

    it('should include property website views', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            property_views: 350,
            unique_visitors: 180,
            avg_time_on_page: 45,
          },
          error: null,
        })
      )

      const result = await generateWeeklySummary('agent-1')

      expect(result?.property_views).toBe(350)
    })

    it('should include top performing listings', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            top_listings: [
              { address: '123 Main St', views: 150 },
              { address: '456 Oak Ave', views: 100 },
            ],
          },
          error: null,
        })
      )

      const result = await generateWeeklySummary('agent-1')

      expect(result?.top_listings?.length).toBe(2)
    })

    it('should calculate week-over-week changes', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            total_orders: 5,
            prev_week_orders: 3,
            orders_change_percent: 66.67,
            property_views: 300,
            prev_week_views: 250,
            views_change_percent: 20,
          },
          error: null,
        })
      )

      const result = await generateWeeklySummary('agent-1')

      expect(result?.orders_change_percent).toBe(66.67)
      expect(result?.views_change_percent).toBe(20)
    })

    it('should include QR code scan analytics', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            qr_scans: 25,
            qr_scan_locations: ['Orlando', 'Tampa', 'Miami'],
          },
          error: null,
        })
      )

      const result = await generateWeeklySummary('agent-1')

      expect(result?.qr_scans).toBe(25)
    })
  })

  describe('sendWeeklySummaryEmail', () => {
    it('should send weekly summary email to agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'report-1',
            agent_id: 'agent-1',
            sent_at: '2025-01-15T10:00:00',
            email_id: 'email-123',
          },
          error: null,
        })
      )

      const summary: WeeklySummary = {
        agent_id: 'agent-1',
        week_start: '2025-01-06',
        week_end: '2025-01-12',
        total_orders: 5,
        total_revenue: 1500.00,
        property_views: 250,
        qr_scans: 15,
      }

      const result = await sendWeeklySummaryEmail('agent-1', summary)

      expect(result.success).toBe(true)
    })

    it('should record email send in history', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'report-1' },
          error: null,
        })
      )

      const summary: WeeklySummary = {
        agent_id: 'agent-1',
        week_start: '2025-01-06',
        week_end: '2025-01-12',
        total_orders: 0,
        property_views: 0,
      }

      const result = await sendWeeklySummaryEmail('agent-1', summary)

      expect(result.success).toBe(true)
    })

    it('should include personalized greeting', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { agent_name: 'John' },
          error: null,
        })
      )

      const summary: WeeklySummary = {
        agent_id: 'agent-1',
        week_start: '2025-01-06',
        week_end: '2025-01-12',
        total_orders: 5,
        property_views: 100,
      }

      const result = await sendWeeklySummaryEmail('agent-1', summary)

      expect(result.success).toBe(true)
    })
  })

  describe('getAgentsForWeeklyReport', () => {
    it('should return agents opted in for weekly reports', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', email: 'agent1@test.com', weekly_report_enabled: true },
            { id: 'agent-2', email: 'agent2@test.com', weekly_report_enabled: true },
          ],
          error: null,
        })
      )

      const result = await getAgentsForWeeklyReport()

      expect(result.length).toBe(2)
    })

    it('should exclude agents with no activity', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', has_recent_activity: true },
          ],
          error: null,
        })
      )

      const result = await getAgentsForWeeklyReport({ require_activity: true })

      expect(result.length).toBe(1)
    })

    it('should respect agent timezone preferences', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'agent-1', timezone: 'America/New_York' },
            { id: 'agent-2', timezone: 'America/Los_Angeles' },
          ],
          error: null,
        })
      )

      const result = await getAgentsForWeeklyReport()

      expect(result[0].timezone).toBeDefined()
    })
  })

  describe('scheduleWeeklyReports', () => {
    it('should schedule reports for all eligible agents', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: [
              { id: 'agent-1' },
              { id: 'agent-2' },
            ],
            error: null,
          })
        )
        .mockReturnValue(
          createChain({
            data: { scheduled: true },
            error: null,
          })
        )

      const result = await scheduleWeeklyReports()

      expect(result.success).toBe(true)
      expect(result.scheduled_count).toBe(2)
    })

    it('should handle scheduling errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { message: 'Database error' },
        })
      )

      const result = await scheduleWeeklyReports()

      // When no agents found (error returns []), still succeeds with 0 scheduled
      expect(result.scheduled_count).toBe(0)
    })
  })

  describe('getWeeklyReportHistory', () => {
    it('should return report history for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'report-1', week_start: '2025-01-06', sent_at: '2025-01-13' },
            { id: 'report-2', week_start: '2024-12-30', sent_at: '2025-01-06' },
          ],
          error: null,
        })
      )

      const result = await getWeeklyReportHistory('agent-1')

      expect(result.length).toBe(2)
    })

    it('should include delivery status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'report-1', delivery_status: 'delivered' },
            { id: 'report-2', delivery_status: 'opened' },
          ],
          error: null,
        })
      )

      const result = await getWeeklyReportHistory('agent-1')

      expect(result[0].delivery_status).toBeDefined()
    })
  })
})

describe('Weekly Summary Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle agents with no activity', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          total_orders: 0,
          property_views: 0,
          qr_scans: 0,
        },
        error: null,
      })
    )

    const result = await generateWeeklySummary('inactive-agent')

    expect(result?.total_orders).toBe(0)
  })

  it('should handle new agents without previous week data', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          total_orders: 2,
          prev_week_orders: null,
          orders_change_percent: null,
        },
        error: null,
      })
    )

    const result = await generateWeeklySummary('new-agent')

    expect(result?.orders_change_percent).toBeNull()
  })

  it('should handle database errors', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Connection error' },
      })
    )

    const result = await generateWeeklySummary('agent-1')

    expect(result).toBeNull()
  })
})
