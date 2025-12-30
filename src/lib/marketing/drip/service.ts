import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Trigger types for drip campaigns
 */
export type TriggerType =
  | 'new_customer'
  | 'delivery_complete'
  | 'lapsed_90_days'
  | 'lapsed_180_days'
  | 'booking_complete'
  | 'review_request'
  | 'manual'

/**
 * Drip campaign
 */
export interface DripCampaign {
  id: string
  name: string
  description?: string
  trigger_type: TriggerType
  is_active: boolean
  steps?: DripCampaignStep[]
  created_at: string
  updated_at?: string
}

/**
 * Drip campaign step
 */
export interface DripCampaignStep {
  id: string
  campaign_id: string
  step_order: number
  delay_days: number
  delay_hours?: number
  subject: string
  template_id: string
  created_at: string
}

/**
 * Drip enrollment
 */
export interface DripEnrollment {
  id: string
  campaign_id: string
  contact_id: string
  status: 'active' | 'paused' | 'completed' | 'unenrolled'
  current_step: number
  next_step_at?: string
  unenroll_reason?: string
  unenrolled_at?: string
  completed_at?: string
  created_at: string
}

/**
 * Create a new drip campaign
 */
export async function createDripCampaign(params: {
  name: string
  trigger_type: TriggerType
  description?: string
}): Promise<{
  success: boolean
  campaign?: DripCampaign
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaigns')
      .insert({
        name: params.name,
        trigger_type: params.trigger_type,
        description: params.description,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: DripCampaign | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create drip campaign.',
      }
    }

    return {
      success: true,
      campaign: data,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error creating campaign:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get a drip campaign with steps
 */
export async function getDripCampaign(campaignId: string): Promise<DripCampaign | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaigns')
      .select('*, steps:drip_campaign_steps(*)')
      .eq('id', campaignId)
      .single() as { data: DripCampaign | null; error: Error | null }

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[DripCampaigns] Error getting campaign:', error)
    return null
  }
}

/**
 * Update a drip campaign
 */
export async function updateDripCampaign(
  campaignId: string,
  updates: Partial<Pick<DripCampaign, 'name' | 'description' | 'is_active'>>
): Promise<{
  success: boolean
  campaign?: DripCampaign
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select()
      .single() as { data: DripCampaign | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to update drip campaign.',
      }
    }

    return {
      success: true,
      campaign: data,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error updating campaign:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Delete a drip campaign
 */
export async function deleteDripCampaign(campaignId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('drip_campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) {
      return {
        success: false,
        error: 'Failed to delete drip campaign.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[DripCampaigns] Error deleting campaign:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Add a step to a campaign
 */
export async function addCampaignStep(params: {
  campaign_id: string
  step_order: number
  delay_days: number
  delay_hours?: number
  subject: string
  template_id: string
}): Promise<{
  success: boolean
  step?: DripCampaignStep
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaign_steps')
      .insert({
        campaign_id: params.campaign_id,
        step_order: params.step_order,
        delay_days: params.delay_days,
        delay_hours: params.delay_hours || 0,
        subject: params.subject,
        template_id: params.template_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: DripCampaignStep | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to add campaign step.',
      }
    }

    return {
      success: true,
      step: data,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error adding step:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Update a campaign step
 */
export async function updateCampaignStep(
  stepId: string,
  updates: Partial<Pick<DripCampaignStep, 'delay_days' | 'delay_hours' | 'subject' | 'template_id'>>
): Promise<{
  success: boolean
  step?: DripCampaignStep
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaign_steps')
      .update(updates)
      .eq('id', stepId)
      .select()
      .single() as { data: DripCampaignStep | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to update campaign step.',
      }
    }

    return {
      success: true,
      step: data,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error updating step:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Delete a campaign step
 */
export async function deleteCampaignStep(stepId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('drip_campaign_steps')
      .delete()
      .eq('id', stepId)

    if (error) {
      return {
        success: false,
        error: 'Failed to delete campaign step.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[DripCampaigns] Error deleting step:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Enroll a contact in a campaign
 */
export async function enrollContact(params: {
  campaign_id: string
  contact_id: string
  check_existing?: boolean
}): Promise<{
  success: boolean
  enrollment?: DripEnrollment
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Check for existing enrollment
    if (params.check_existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('drip_enrollments')
        .select('id')
        .eq('campaign_id', params.campaign_id)
        .eq('contact_id', params.contact_id)
        .eq('status', 'active')
        .limit(1) as { data: Array<{ id: string }> | null }

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'Contact is already enrolled in this campaign.',
        }
      }
    }

    const now = new Date()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_enrollments')
      .insert({
        campaign_id: params.campaign_id,
        contact_id: params.contact_id,
        status: 'active',
        current_step: 1,
        next_step_at: now.toISOString(),
        created_at: now.toISOString(),
      })
      .select()
      .single() as { data: DripEnrollment | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to enroll contact.',
      }
    }

    return {
      success: true,
      enrollment: data,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error enrolling contact:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Unenroll a contact from a campaign
 */
export async function unenrollContact(
  enrollmentId: string,
  options: { reason?: string } = {}
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('drip_enrollments')
      .update({
        status: 'unenrolled',
        unenroll_reason: options.reason,
        unenrolled_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)

    if (error) {
      return {
        success: false,
        error: 'Failed to unenroll contact.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[DripCampaigns] Error unenrolling contact:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get enrollments for a campaign
 */
export async function getEnrollments(
  campaignId: string,
  options: { status?: DripEnrollment['status'] } = {}
): Promise<DripEnrollment[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('drip_enrollments')
      .select('*')
      .eq('campaign_id', campaignId)

    if (options.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query.order('created_at', { ascending: false }) as {
      data: DripEnrollment[] | null
      error: Error | null
    }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[DripCampaigns] Error getting enrollments:', error)
    return []
  }
}

/**
 * Process an enrollment step (send email and advance)
 */
export async function processEnrollmentStep(enrollmentId: string): Promise<{
  success: boolean
  next_step?: number
  completed?: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get enrollment with campaign steps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enrollment } = await (supabase as any)
      .from('drip_enrollments')
      .select('*, campaign:drip_campaigns(*, steps:drip_campaign_steps(*))')
      .eq('id', enrollmentId)
      .single() as {
        data: DripEnrollment & {
          campaign: DripCampaign & { steps: DripCampaignStep[] }
        } | null
      }

    if (!enrollment) {
      return {
        success: false,
        error: 'Enrollment not found.',
      }
    }

    const steps = enrollment.campaign.steps || []
    const currentStep = enrollment.current_step
    const totalSteps = steps.length

    // Check if this is the last step
    if (currentStep >= totalSteps) {
      // Mark as completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('drip_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)

      return {
        success: true,
        completed: true,
      }
    }

    // Calculate next step time
    const nextStep = currentStep + 1
    const nextStepConfig = steps.find((s) => s.step_order === nextStep)
    const delayMs =
      ((nextStepConfig?.delay_days || 0) * 24 * 60 * 60 * 1000) +
      ((nextStepConfig?.delay_hours || 0) * 60 * 60 * 1000)
    const nextStepAt = new Date(Date.now() + delayMs)

    // Update enrollment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('drip_enrollments')
      .update({
        current_step: nextStep,
        next_step_at: nextStepAt.toISOString(),
      })
      .eq('id', enrollmentId)

    return {
      success: true,
      next_step: nextStep,
    }
  } catch (error) {
    console.error('[DripCampaigns] Error processing step:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get enrollments with due steps (for cron processing)
 */
export async function getDuePendingSteps(options: { limit?: number } = {}): Promise<DripEnrollment[]> {
  const { limit = 100 } = options

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_enrollments')
      .select('*')
      .eq('status', 'active')
      .lte('next_step_at', now)
      .order('next_step_at', { ascending: true })
      .limit(limit) as { data: DripEnrollment[] | null; error: Error | null }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[DripCampaigns] Error getting due steps:', error)
    return []
  }
}

/**
 * Get all active drip campaigns
 */
export async function getActiveCampaigns(): Promise<DripCampaign[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('drip_campaigns')
      .select('*, steps:drip_campaign_steps(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as {
        data: DripCampaign[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[DripCampaigns] Error getting active campaigns:', error)
    return []
  }
}
