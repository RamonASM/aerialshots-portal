import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  trackCampaignEvent,
  getCampaignAnalytics,
  getCampaignPerformance,
  getEmailDeliverability,
  getClickHeatmap,
  getUnsubscribeReasons,
  exportCampaignReport,
  type CampaignEvent,
  type CampaignEventType,
  type CampaignAnalytics,
  type CampaignPerformance,
} from './analytics'

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

describe('Campaign Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('trackCampaignEvent', () => {
    it('should track email sent event', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'sent' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'sent',
      })

      expect(result.success).toBe(true)
    })

    it('should track email opened event', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'opened' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'opened',
        metadata: { user_agent: 'Mozilla/5.0', ip_address: '192.168.1.1' },
      })

      expect(result.success).toBe(true)
    })

    it('should track link clicked event with URL', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'clicked' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'clicked',
        metadata: { url: 'https://example.com/offer', link_id: 'cta-button' },
      })

      expect(result.success).toBe(true)
    })

    it('should track bounce event', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'bounced' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'bounced',
        metadata: { bounce_type: 'hard', reason: 'invalid_email' },
      })

      expect(result.success).toBe(true)
    })

    it('should track unsubscribe event', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'unsubscribed' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'unsubscribed',
        metadata: { reason: 'too_frequent' },
      })

      expect(result.success).toBe(true)
    })

    it('should track spam complaint', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'event-1', event_type: 'complained' },
          error: null,
        })
      )

      const result = await trackCampaignEvent({
        campaign_id: 'campaign-1',
        recipient_id: 'agent-1',
        event_type: 'complained',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getCampaignAnalytics', () => {
    it('should return campaign analytics summary', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'sent', count: 1000 },
            { event_type: 'delivered', count: 980 },
            { event_type: 'opened', count: 350 },
            { event_type: 'clicked', count: 120 },
            { event_type: 'bounced', count: 20 },
            { event_type: 'unsubscribed', count: 5 },
          ],
          error: null,
        })
      )

      const result = await getCampaignAnalytics('campaign-1')

      expect(result).not.toBeNull()
      expect(result?.sent).toBe(1000)
      expect(result?.delivered).toBe(980)
      expect(result?.opened).toBe(350)
      expect(result?.clicked).toBe(120)
    })

    it('should calculate open rate', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'delivered', count: 1000 },
            { event_type: 'opened', count: 350 },
          ],
          error: null,
        })
      )

      const result = await getCampaignAnalytics('campaign-1')

      expect(result?.open_rate).toBe(35) // 350/1000 * 100
    })

    it('should calculate click-through rate', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'delivered', count: 1000 },
            { event_type: 'clicked', count: 100 },
          ],
          error: null,
        })
      )

      const result = await getCampaignAnalytics('campaign-1')

      expect(result?.click_rate).toBe(10) // 100/1000 * 100
    })

    it('should calculate bounce rate', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'sent', count: 1000 },
            { event_type: 'bounced', count: 50 },
          ],
          error: null,
        })
      )

      const result = await getCampaignAnalytics('campaign-1')

      expect(result?.bounce_rate).toBe(5) // 50/1000 * 100
    })

    it('should calculate unsubscribe rate', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'delivered', count: 1000 },
            { event_type: 'unsubscribed', count: 10 },
          ],
          error: null,
        })
      )

      const result = await getCampaignAnalytics('campaign-1')

      expect(result?.unsubscribe_rate).toBe(1) // 10/1000 * 100
    })
  })

  describe('getCampaignPerformance', () => {
    it('should return performance over time', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { date: '2025-01-10', event_type: 'opened', count: 100 },
            { date: '2025-01-11', event_type: 'opened', count: 150 },
            { date: '2025-01-12', event_type: 'opened', count: 75 },
          ],
          error: null,
        })
      )

      const result = await getCampaignPerformance('campaign-1', {
        date_from: '2025-01-10',
        date_to: '2025-01-15',
      })

      expect(result.length).toBe(3)
    })

    it('should group by hour for recent campaigns', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { hour: '2025-01-15T08:00:00', event_type: 'opened', count: 25 },
            { hour: '2025-01-15T09:00:00', event_type: 'opened', count: 45 },
            { hour: '2025-01-15T10:00:00', event_type: 'opened', count: 30 },
          ],
          error: null,
        })
      )

      const result = await getCampaignPerformance('campaign-1', {
        date_from: '2025-01-15',
        date_to: '2025-01-15',
        granularity: 'hour',
      })

      expect(result.length).toBe(3)
    })

    it('should include all event types', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { date: '2025-01-10', event_type: 'opened', count: 100 },
            { date: '2025-01-10', event_type: 'clicked', count: 30 },
          ],
          error: null,
        })
      )

      const result = await getCampaignPerformance('campaign-1', {
        date_from: '2025-01-10',
        date_to: '2025-01-10',
      })

      expect(result.some((r) => r.event_type === 'opened')).toBe(true)
      expect(result.some((r) => r.event_type === 'clicked')).toBe(true)
    })
  })

  describe('getEmailDeliverability', () => {
    it('should return deliverability metrics', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'sent', count: 1000 },
            { event_type: 'delivered', count: 950 },
            { event_type: 'bounced', count: 30 },
            { event_type: 'complained', count: 2 },
          ],
          error: null,
        })
      )

      const result = await getEmailDeliverability('campaign-1')

      expect(result).not.toBeNull()
      expect(result?.delivery_rate).toBeGreaterThan(90)
    })

    it('should categorize bounce types', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: [
              { event_type: 'sent', count: 1000 },
              { event_type: 'bounced', count: 50 },
            ],
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: [
              { bounce_type: 'hard', count: 30 },
              { bounce_type: 'soft', count: 20 },
            ],
            error: null,
          })
        )

      const result = await getEmailDeliverability('campaign-1')

      expect(result?.hard_bounces).toBe(30)
      expect(result?.soft_bounces).toBe(20)
    })

    it('should calculate spam complaint rate', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'delivered', count: 1000 },
            { event_type: 'complained', count: 5 },
          ],
          error: null,
        })
      )

      const result = await getEmailDeliverability('campaign-1')

      expect(result?.complaint_rate).toBe(0.5) // 5/1000 * 100
    })
  })

  describe('getClickHeatmap', () => {
    it('should return click counts by link', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { link_id: 'cta-button', url: 'https://example.com/offer', clicks: 150 },
            { link_id: 'footer-link', url: 'https://example.com/unsubscribe', clicks: 25 },
            { link_id: 'header-logo', url: 'https://example.com', clicks: 80 },
          ],
          error: null,
        })
      )

      const result = await getClickHeatmap('campaign-1')

      expect(result.length).toBe(3)
      expect(result[0].clicks).toBeGreaterThan(result[1].clicks)
    })

    it('should calculate click percentage per link', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { link_id: 'cta', url: 'https://example.com/cta', clicks: 100 },
            { link_id: 'secondary', url: 'https://example.com/other', clicks: 50 },
          ],
          error: null,
        })
      )

      const result = await getClickHeatmap('campaign-1')

      const total = result.reduce((sum, r) => sum + r.clicks, 0)
      expect(total).toBe(150)
      expect(result[0].percentage).toBeCloseTo(66.67, 1)
    })
  })

  describe('getUnsubscribeReasons', () => {
    it('should return unsubscribe reasons breakdown', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { reason: 'too_frequent', count: 25 },
            { reason: 'not_relevant', count: 15 },
            { reason: 'other', count: 10 },
          ],
          error: null,
        })
      )

      const result = await getUnsubscribeReasons('campaign-1')

      expect(result.length).toBe(3)
      expect(result[0].reason).toBe('too_frequent')
    })

    it('should handle campaigns with no unsubscribes', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [],
          error: null,
        })
      )

      const result = await getUnsubscribeReasons('campaign-1')

      expect(result.length).toBe(0)
    })
  })

  describe('exportCampaignReport', () => {
    it('should export campaign report as CSV', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { recipient_email: 'agent@test.com', event_type: 'opened', created_at: '2025-01-10T10:00:00' },
            { recipient_email: 'agent@test.com', event_type: 'clicked', created_at: '2025-01-10T10:05:00' },
          ],
          error: null,
        })
      )

      const result = await exportCampaignReport('campaign-1', { format: 'csv' })

      expect(result.success).toBe(true)
      expect(result.data).toContain('Email,Event,Timestamp')
    })

    it('should export campaign report as JSON', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { recipient_email: 'agent@test.com', event_type: 'opened', created_at: '2025-01-10' },
          ],
          error: null,
        })
      )

      const result = await exportCampaignReport('campaign-1', { format: 'json' })

      expect(result.success).toBe(true)
      const parsed = JSON.parse(result.data!)
      expect(Array.isArray(parsed.events)).toBe(true)
    })

    it('should include analytics summary in export', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { event_type: 'sent', count: 1000 },
            { event_type: 'opened', count: 350 },
          ],
          error: null,
        })
      )

      const result = await exportCampaignReport('campaign-1', {
        format: 'json',
        include_summary: true,
      })

      const parsed = JSON.parse(result.data!)
      expect(parsed.summary).toBeDefined()
    })
  })
})

describe('Campaign Analytics Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty campaign gracefully', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [],
        error: null,
      })
    )

    const result = await getCampaignAnalytics('empty-campaign')

    expect(result?.sent).toBe(0)
    expect(result?.open_rate).toBe(0)
  })

  it('should handle database errors', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Database error' },
      })
    )

    const result = await getCampaignAnalytics('campaign-1')

    expect(result).toBeNull()
  })

  it('should prevent division by zero in rate calculations', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: [
          { event_type: 'sent', count: 0 },
          { event_type: 'opened', count: 0 },
        ],
        error: null,
      })
    )

    const result = await getCampaignAnalytics('campaign-1')

    expect(result?.open_rate).toBe(0)
    expect(result?.click_rate).toBe(0)
  })
})
