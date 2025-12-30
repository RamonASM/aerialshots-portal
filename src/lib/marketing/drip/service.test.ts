import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createDripCampaign,
  getDripCampaign,
  updateDripCampaign,
  deleteDripCampaign,
  addCampaignStep,
  updateCampaignStep,
  deleteCampaignStep,
  enrollContact,
  unenrollContact,
  getEnrollments,
  processEnrollmentStep,
  getDuePendingSteps,
  type DripCampaign,
  type DripCampaignStep,
  type DripEnrollment,
  type TriggerType,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock email service
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
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

describe('Drip Campaign Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T10:00:00'))
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createDripCampaign', () => {
    it('should create a new drip campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'drip-1',
            name: 'Welcome Series',
            trigger_type: 'new_customer',
            is_active: true,
          },
          error: null,
        })
      )

      const result = await createDripCampaign({
        name: 'Welcome Series',
        trigger_type: 'new_customer',
        description: 'Welcome new customers with onboarding emails',
      })

      expect(result.success).toBe(true)
      expect(result.campaign?.name).toBe('Welcome Series')
    })

    it('should create campaign with event-based trigger', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'drip-1',
            name: 'Post-Delivery Series',
            trigger_type: 'delivery_complete',
            is_active: true,
          },
          error: null,
        })
      )

      const result = await createDripCampaign({
        name: 'Post-Delivery Series',
        trigger_type: 'delivery_complete',
      })

      expect(result.success).toBe(true)
      expect(result.campaign?.trigger_type).toBe('delivery_complete')
    })

    it('should create campaign with lapsed trigger', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'drip-1',
            name: 'Re-engagement Series',
            trigger_type: 'lapsed_90_days',
            is_active: true,
          },
          error: null,
        })
      )

      const result = await createDripCampaign({
        name: 'Re-engagement Series',
        trigger_type: 'lapsed_90_days',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getDripCampaign', () => {
    it('should return campaign with steps', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'drip-1',
            name: 'Welcome Series',
            steps: [
              { id: 'step-1', delay_days: 0, subject: 'Welcome!' },
              { id: 'step-2', delay_days: 1, subject: 'Getting Started' },
              { id: 'step-3', delay_days: 3, subject: 'Pro Tips' },
            ],
          },
          error: null,
        })
      )

      const result = await getDripCampaign('drip-1')

      expect(result).not.toBeNull()
      expect(result?.steps?.length).toBe(3)
    })

    it('should return null for non-existent campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const result = await getDripCampaign('invalid-id')

      expect(result).toBeNull()
    })
  })

  describe('updateDripCampaign', () => {
    it('should update campaign settings', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'drip-1',
            name: 'Updated Welcome Series',
            is_active: false,
          },
          error: null,
        })
      )

      const result = await updateDripCampaign('drip-1', {
        name: 'Updated Welcome Series',
        is_active: false,
      })

      expect(result.success).toBe(true)
    })

    it('should toggle campaign active status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: { id: 'drip-1', is_active: true },
          error: null,
        })
      )

      const result = await updateDripCampaign('drip-1', { is_active: true })

      expect(result.success).toBe(true)
    })
  })

  describe('deleteDripCampaign', () => {
    it('should delete a campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: null,
        })
      )

      const result = await deleteDripCampaign('drip-1')

      expect(result.success).toBe(true)
    })
  })

  describe('addCampaignStep', () => {
    it('should add a step to campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'step-1',
            campaign_id: 'drip-1',
            step_order: 1,
            delay_days: 0,
            subject: 'Welcome to ASM!',
            template_id: 'welcome-email',
          },
          error: null,
        })
      )

      const result = await addCampaignStep({
        campaign_id: 'drip-1',
        step_order: 1,
        delay_days: 0,
        subject: 'Welcome to ASM!',
        template_id: 'welcome-email',
      })

      expect(result.success).toBe(true)
      expect(result.step?.delay_days).toBe(0)
    })

    it('should add step with delay', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'step-2',
            campaign_id: 'drip-1',
            step_order: 2,
            delay_days: 3,
            delay_hours: 0,
            subject: 'How was your experience?',
          },
          error: null,
        })
      )

      const result = await addCampaignStep({
        campaign_id: 'drip-1',
        step_order: 2,
        delay_days: 3,
        subject: 'How was your experience?',
        template_id: 'feedback-request',
      })

      expect(result.success).toBe(true)
      expect(result.step?.delay_days).toBe(3)
    })

    it('should add step with hour-based delay', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'step-1',
            delay_days: 0,
            delay_hours: 2,
          },
          error: null,
        })
      )

      const result = await addCampaignStep({
        campaign_id: 'drip-1',
        step_order: 1,
        delay_days: 0,
        delay_hours: 2,
        subject: 'Quick follow-up',
        template_id: 'quick-follow-up',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('enrollContact', () => {
    it('should enroll contact in campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'enroll-1',
            campaign_id: 'drip-1',
            contact_id: 'agent-1',
            status: 'active',
            current_step: 1,
          },
          error: null,
        })
      )

      const result = await enrollContact({
        campaign_id: 'drip-1',
        contact_id: 'agent-1',
      })

      expect(result.success).toBe(true)
      expect(result.enrollment?.status).toBe('active')
    })

    it('should prevent duplicate enrollment', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'existing-enrollment' }],
          error: null,
        })
      )

      const result = await enrollContact({
        campaign_id: 'drip-1',
        contact_id: 'agent-1',
        check_existing: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already enrolled')
    })

    it('should set initial next step time', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'enroll-1',
            next_step_at: '2025-01-15T10:00:00',
          },
          error: null,
        })
      )

      const result = await enrollContact({
        campaign_id: 'drip-1',
        contact_id: 'agent-1',
      })

      expect(result.success).toBe(true)
      expect(result.enrollment?.next_step_at).toBeDefined()
    })
  })

  describe('unenrollContact', () => {
    it('should unenroll contact from campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'enroll-1',
            status: 'unenrolled',
            unenrolled_at: '2025-01-15T10:00:00',
          },
          error: null,
        })
      )

      const result = await unenrollContact('enroll-1', { reason: 'user_request' })

      expect(result.success).toBe(true)
    })

    it('should record unenroll reason', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'enroll-1',
            status: 'unenrolled',
            unenroll_reason: 'unsubscribed',
          },
          error: null,
        })
      )

      const result = await unenrollContact('enroll-1', { reason: 'unsubscribed' })

      expect(result.success).toBe(true)
    })
  })

  describe('getEnrollments', () => {
    it('should return active enrollments for campaign', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'enroll-1', contact_id: 'agent-1', status: 'active' },
            { id: 'enroll-2', contact_id: 'agent-2', status: 'active' },
          ],
          error: null,
        })
      )

      const result = await getEnrollments('drip-1', { status: 'active' })

      expect(result.length).toBe(2)
    })

    it('should return completed enrollments', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'enroll-1', status: 'completed' },
          ],
          error: null,
        })
      )

      const result = await getEnrollments('drip-1', { status: 'completed' })

      expect(result[0].status).toBe('completed')
    })
  })

  describe('processEnrollmentStep', () => {
    it('should process and advance to next step', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'enroll-1',
              current_step: 1,
              campaign: {
                steps: [
                  { step_order: 1, delay_days: 0 },
                  { step_order: 2, delay_days: 1 },
                ],
              },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { id: 'enroll-1', current_step: 2 },
            error: null,
          })
        )

      const result = await processEnrollmentStep('enroll-1')

      expect(result.success).toBe(true)
      expect(result.next_step).toBe(2)
    })

    it('should complete enrollment after last step', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'enroll-1',
              current_step: 3,
              campaign: {
                steps: [
                  { step_order: 1 },
                  { step_order: 2 },
                  { step_order: 3 },
                ],
              },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { id: 'enroll-1', status: 'completed' },
            error: null,
          })
        )

      const result = await processEnrollmentStep('enroll-1')

      expect(result.success).toBe(true)
      expect(result.completed).toBe(true)
    })

    it('should calculate next step time based on delay', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'enroll-1',
              current_step: 1,
              campaign: {
                steps: [
                  { step_order: 1, delay_days: 0 },
                  { step_order: 2, delay_days: 3 },
                ],
              },
            },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'enroll-1',
              current_step: 2,
              next_step_at: '2025-01-18T10:00:00',
            },
            error: null,
          })
        )

      const result = await processEnrollmentStep('enroll-1')

      expect(result.success).toBe(true)
    })
  })

  describe('getDuePendingSteps', () => {
    it('should return enrollments with due steps', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'enroll-1',
              next_step_at: '2025-01-15T09:00:00',
              status: 'active',
            },
            {
              id: 'enroll-2',
              next_step_at: '2025-01-15T08:00:00',
              status: 'active',
            },
          ],
          error: null,
        })
      )

      const result = await getDuePendingSteps()

      expect(result.length).toBe(2)
    })

    it('should not return future steps', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [],
          error: null,
        })
      )

      const result = await getDuePendingSteps()

      expect(result.length).toBe(0)
    })

    it('should limit results', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'enroll-1' },
            { id: 'enroll-2' },
          ],
          error: null,
        })
      )

      const result = await getDuePendingSteps({ limit: 2 })

      expect(result.length).toBeLessThanOrEqual(2)
    })
  })
})

describe('Drip Campaign Triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should support new_customer trigger', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: { id: 'drip-1', trigger_type: 'new_customer' },
        error: null,
      })
    )

    const result = await createDripCampaign({
      name: 'Welcome',
      trigger_type: 'new_customer',
    })

    expect(result.success).toBe(true)
  })

  it('should support delivery_complete trigger', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: { id: 'drip-1', trigger_type: 'delivery_complete' },
        error: null,
      })
    )

    const result = await createDripCampaign({
      name: 'Post-Delivery',
      trigger_type: 'delivery_complete',
    })

    expect(result.success).toBe(true)
  })

  it('should support lapsed_90_days trigger', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: { id: 'drip-1', trigger_type: 'lapsed_90_days' },
        error: null,
      })
    )

    const result = await createDripCampaign({
      name: 'Re-engagement',
      trigger_type: 'lapsed_90_days',
    })

    expect(result.success).toBe(true)
  })

  it('should support manual trigger', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: { id: 'drip-1', trigger_type: 'manual' },
        error: null,
      })
    )

    const result = await createDripCampaign({
      name: 'Special Promotion',
      trigger_type: 'manual',
    })

    expect(result.success).toBe(true)
  })
})
