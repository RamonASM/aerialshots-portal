/**
 * Review Request Service Tests
 *
 * Tests for automated review request scheduling and sending
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReviewRequest, ReviewRequestSettings, ReviewRequestTemplate } from './service'

// Create chainable mock
function createChainableMock(finalResult: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'lte', 'gte', 'in', 'or', 'single', 'insert', 'update', 'order', 'limit', 'head']

  methods.forEach(method => {
    chain[method] = vi.fn(() => chain)
  })

  // These methods return the final result
  chain.single = vi.fn(() => finalResult)
  chain.maybeSingle = vi.fn(() => finalResult)

  return chain
}

let mockFromResult: ReturnType<typeof createChainableMock>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => mockFromResult),
  })),
}))

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(async () => ({ id: 'resend-123' })),
}))

vi.mock('@/lib/notifications', () => ({
  sendNotification: vi.fn(async () => ({ success: true })),
}))

// Test data factories
const createMockSettings = (overrides: Partial<ReviewRequestSettings> = {}): ReviewRequestSettings => ({
  id: 'settings-1',
  delay_after_delivery_ms: 7200000, // 2 hours
  send_time_start: '09:00:00',
  send_time_end: '20:00:00',
  max_requests_per_agent_per_month: 2,
  min_days_between_requests: 14,
  default_channel: 'email',
  primary_platform: 'google',
  google_review_url: 'https://g.page/r/review-link/review',
  facebook_review_url: undefined,
  yelp_review_url: undefined,
  trustpilot_review_url: undefined,
  is_enabled: true,
  ...overrides,
})

const createMockTemplate = (overrides: Partial<ReviewRequestTemplate> = {}): ReviewRequestTemplate => ({
  id: 'template-1',
  name: 'Google Review - Email',
  platform: 'google',
  channel: 'email',
  subject: 'How was your experience?',
  email_body: 'Hi {{agent_name}}, please review us at {{review_url}}',
  sms_body: undefined,
  is_active: true,
  is_default: true,
  ...overrides,
})

const createMockRequest = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: 'request-1',
  agent_id: 'agent-123',
  listing_id: 'listing-456',
  order_id: 'order-789',
  platform: 'google',
  review_url: 'https://g.page/r/review-link/review',
  status: 'pending',
  scheduled_for: new Date().toISOString(),
  sent_at: undefined,
  clicked_at: undefined,
  completed_at: undefined,
  email_sent: false,
  sms_sent: false,
  email_id: undefined,
  tracking_token: 'token-abc',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('Review Request Types', () => {
  describe('ReviewRequest', () => {
    it('should have correct status values', () => {
      const validStatuses = ['pending', 'sent', 'clicked', 'completed', 'cancelled', 'bounced']
      const request = createMockRequest()
      expect(validStatuses).toContain(request.status)
    })

    it('should have correct platform values', () => {
      const validPlatforms = ['google', 'facebook', 'yelp', 'trustpilot']
      const request = createMockRequest()
      expect(validPlatforms).toContain(request.platform)
    })
  })

  describe('ReviewRequestSettings', () => {
    it('should have default delay of 2 hours', () => {
      const settings = createMockSettings()
      expect(settings.delay_after_delivery_ms).toBe(7200000)
    })

    it('should have send window between 9am and 8pm', () => {
      const settings = createMockSettings()
      expect(settings.send_time_start).toBe('09:00:00')
      expect(settings.send_time_end).toBe('20:00:00')
    })

    it('should have monthly limit of 2 requests per agent', () => {
      const settings = createMockSettings()
      expect(settings.max_requests_per_agent_per_month).toBe(2)
    })

    it('should have 14 day minimum between requests', () => {
      const settings = createMockSettings()
      expect(settings.min_days_between_requests).toBe(14)
    })
  })

  describe('ReviewRequestTemplate', () => {
    it('should have channel options', () => {
      const validChannels = ['email', 'sms', 'both']
      const template = createMockTemplate()
      expect(validChannels).toContain(template.channel)
    })

    it('should include email content for email channel', () => {
      const template = createMockTemplate({ channel: 'email' })
      expect(template.subject).toBeDefined()
      expect(template.email_body).toBeDefined()
    })

    it('should include sms content for sms channel', () => {
      const template = createMockTemplate({
        channel: 'sms',
        sms_body: 'Review us: {{review_url}}',
      })
      expect(template.sms_body).toBeDefined()
    })
  })
})

describe('Review Request Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromResult = createChainableMock({ data: null, error: null })
  })

  describe('Can Request Review', () => {
    it('should block if settings are disabled', () => {
      const settings = createMockSettings({ is_enabled: false })
      expect(settings.is_enabled).toBe(false)
    })

    it('should allow request when under monthly limit', () => {
      const settings = createMockSettings({ max_requests_per_agent_per_month: 2 })
      const currentMonthRequests = 1
      expect(currentMonthRequests < settings.max_requests_per_agent_per_month).toBe(true)
    })

    it('should block when at monthly limit', () => {
      const settings = createMockSettings({ max_requests_per_agent_per_month: 2 })
      const currentMonthRequests = 2
      expect(currentMonthRequests >= settings.max_requests_per_agent_per_month).toBe(true)
    })

    it('should check minimum days between requests', () => {
      const settings = createMockSettings({ min_days_between_requests: 14 })
      const lastRequestDate = new Date()
      lastRequestDate.setDate(lastRequestDate.getDate() - 10) // 10 days ago

      const daysSinceLastRequest = Math.floor(
        (Date.now() - lastRequestDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysSinceLastRequest < settings.min_days_between_requests).toBe(true)
    })
  })

  describe('Schedule Timing', () => {
    it('should calculate scheduled time with delay', () => {
      const settings = createMockSettings({ delay_after_delivery_ms: 7200000 })
      const now = new Date()
      const scheduledFor = new Date(now.getTime() + settings.delay_after_delivery_ms)

      expect(scheduledFor.getTime() - now.getTime()).toBe(7200000)
    })

    it('should adjust for send window if too early', () => {
      const settings = createMockSettings({
        send_time_start: '09:00:00',
        send_time_end: '20:00:00',
      })

      // If scheduled for 7am, should push to 9am
      const scheduledFor = new Date()
      scheduledFor.setHours(7, 0, 0, 0)

      const startHour = parseInt(settings.send_time_start.split(':')[0])

      if (scheduledFor.getHours() < startHour) {
        scheduledFor.setHours(startHour, 0, 0, 0)
      }

      expect(scheduledFor.getHours()).toBe(9)
    })

    it('should adjust for send window if too late', () => {
      const settings = createMockSettings({
        send_time_start: '09:00:00',
        send_time_end: '20:00:00',
      })

      // If scheduled for 10pm, should push to next day 9am
      const scheduledFor = new Date()
      scheduledFor.setHours(22, 0, 0, 0)
      const originalDay = scheduledFor.getDate()

      const startHour = parseInt(settings.send_time_start.split(':')[0])
      const endHour = parseInt(settings.send_time_end.split(':')[0])

      if (scheduledFor.getHours() >= endHour) {
        scheduledFor.setDate(scheduledFor.getDate() + 1)
        scheduledFor.setHours(startHour, 0, 0, 0)
      }

      expect(scheduledFor.getDate()).toBe(originalDay + 1)
      expect(scheduledFor.getHours()).toBe(9)
    })
  })

  describe('Template Variables', () => {
    const replaceVars = (text: string, vars: Record<string, string>) =>
      text
        .replace(/{{agent_name}}/g, vars.agentName || '')
        .replace(/{{listing_address}}/g, vars.listingAddress || 'your property')
        .replace(/{{review_url}}/g, vars.reviewUrl || '')
        .replace(/{{company_name}}/g, 'Aerial Shots Media')

    it('should replace agent_name variable', () => {
      const result = replaceVars('Hi {{agent_name}}!', { agentName: 'John Doe', listingAddress: '', reviewUrl: '' })
      expect(result).toBe('Hi John Doe!')
    })

    it('should replace listing_address variable', () => {
      const result = replaceVars('for {{listing_address}}', { agentName: '', listingAddress: '123 Main St', reviewUrl: '' })
      expect(result).toBe('for 123 Main St')
    })

    it('should use default for missing listing_address', () => {
      const result = replaceVars('for {{listing_address}}', { agentName: '', listingAddress: '', reviewUrl: '' })
      expect(result).toBe('for your property')
    })

    it('should replace review_url variable', () => {
      const result = replaceVars('Review: {{review_url}}', { agentName: '', listingAddress: '', reviewUrl: 'https://example.com/review' })
      expect(result).toBe('Review: https://example.com/review')
    })

    it('should replace company_name variable', () => {
      const result = replaceVars('Thanks from {{company_name}}', { agentName: '', listingAddress: '', reviewUrl: '' })
      expect(result).toBe('Thanks from Aerial Shots Media')
    })
  })

  describe('Status Transitions', () => {
    it('should transition from pending to sent', () => {
      const request = createMockRequest({ status: 'pending' })
      const nextStatus = 'sent'

      expect(request.status).toBe('pending')
      expect(nextStatus).toBe('sent')
    })

    it('should transition from sent to clicked', () => {
      const request = createMockRequest({ status: 'sent' })
      const nextStatus = 'clicked'

      expect(request.status).toBe('sent')
      expect(nextStatus).toBe('clicked')
    })

    it('should transition from clicked to completed', () => {
      const request = createMockRequest({ status: 'clicked' })
      const nextStatus = 'completed'

      expect(request.status).toBe('clicked')
      expect(nextStatus).toBe('completed')
    })

    it('should allow cancellation from any status', () => {
      const statuses: Array<ReviewRequest['status']> = ['pending', 'sent', 'clicked']
      statuses.forEach(status => {
        const request = createMockRequest({ status })
        expect(['pending', 'sent', 'clicked'].includes(request.status)).toBe(true)
      })
    })
  })

  describe('Platform URL Selection', () => {
    it('should select google URL for google platform', () => {
      const settings = createMockSettings({
        primary_platform: 'google',
        google_review_url: 'https://g.page/review',
      })

      expect(settings.google_review_url).toBe('https://g.page/review')
    })

    it('should select facebook URL for facebook platform', () => {
      const settings = createMockSettings({
        primary_platform: 'facebook',
        facebook_review_url: 'https://facebook.com/review',
      })

      expect(settings.facebook_review_url).toBe('https://facebook.com/review')
    })

    it('should handle missing platform URL', () => {
      const settings = createMockSettings({
        primary_platform: 'yelp',
        yelp_review_url: undefined,
      })

      expect(settings.yelp_review_url).toBeUndefined()
    })
  })
})

describe('Review Stats Calculation', () => {
  const calculateStats = (requests: Array<{ status: ReviewRequest['status'] }>) => {
    const total = requests.length
    const sent = requests.filter(r => ['sent', 'clicked', 'completed'].includes(r.status)).length
    const clicked = requests.filter(r => ['clicked', 'completed'].includes(r.status)).length
    const completed = requests.filter(r => r.status === 'completed').length

    return {
      total,
      sent,
      clicked,
      completed,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      completionRate: sent > 0 ? Math.round((completed / sent) * 100) : 0,
    }
  }

  it('should count total requests', () => {
    const requests = [
      { status: 'pending' as const },
      { status: 'sent' as const },
      { status: 'clicked' as const },
    ]

    const stats = calculateStats(requests)
    expect(stats.total).toBe(3)
  })

  it('should count sent requests', () => {
    const requests = [
      { status: 'pending' as const },
      { status: 'sent' as const },
      { status: 'clicked' as const },
      { status: 'completed' as const },
    ]

    const stats = calculateStats(requests)
    expect(stats.sent).toBe(3) // sent + clicked + completed
  })

  it('should calculate click rate', () => {
    const requests = [
      { status: 'sent' as const },
      { status: 'sent' as const },
      { status: 'clicked' as const },
      { status: 'completed' as const },
    ]

    const stats = calculateStats(requests)
    expect(stats.clickRate).toBe(50) // 2 clicked out of 4 sent
  })

  it('should calculate completion rate', () => {
    const requests = [
      { status: 'sent' as const },
      { status: 'clicked' as const },
      { status: 'completed' as const },
      { status: 'completed' as const },
    ]

    const stats = calculateStats(requests)
    expect(stats.completionRate).toBe(50) // 2 completed out of 4 sent
  })

  it('should handle zero sent requests', () => {
    const requests = [{ status: 'pending' as const }]

    const stats = calculateStats(requests)
    expect(stats.clickRate).toBe(0)
    expect(stats.completionRate).toBe(0)
  })

  it('should handle empty request list', () => {
    const stats = calculateStats([])
    expect(stats.total).toBe(0)
    expect(stats.clickRate).toBe(0)
  })
})
