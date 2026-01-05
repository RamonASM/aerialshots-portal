import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'trialing'

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string
  name: string
  description?: string
  price_monthly: number
  price_yearly?: number
  features: string[]
  included_photos?: number
  included_videos?: number
  is_active: boolean
  stripe_price_id?: string
  created_at: string
}

/**
 * Subscription
 */
export interface Subscription {
  id: string
  agent_id: string
  plan_id: string
  plan?: SubscriptionPlan
  status: SubscriptionStatus
  stripe_subscription_id?: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end?: boolean
  cancelled_at?: string
  cancellation_reason?: string
  paused_at?: string
  usage?: {
    photos_used: number
    videos_used: number
  }
  created_at: string
}

/**
 * Subscription usage
 */
export interface SubscriptionUsage {
  subscription_id: string
  photos_used: number
  photos_remaining: number
  videos_used: number
  videos_remaining: number
  period_start: string
  period_end: string
}

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscription_plans' as any)
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .returns<SubscriptionPlan[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Subscriptions] Error getting plans:', error)
    return []
  }
}

/**
 * Get all subscriptions for an agent
 */
export async function getAgentSubscriptions(agentId: string): Promise<Subscription[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .select('*, plan:subscription_plans(*)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .returns<Subscription[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Subscriptions] Error getting agent subscriptions:', error)
    return []
  }
}

/**
 * Create a new subscription
 */
export async function createSubscription(params: {
  agent_id: string
  plan_id: string
  payment_method_id: string
  billing_cycle?: 'monthly' | 'yearly'
  check_existing?: boolean
}): Promise<{
  success: boolean
  subscription?: Subscription
  client_secret?: string
  error?: string
}> {
  const { agent_id, plan_id, billing_cycle = 'monthly', check_existing = false } = params

  try {
    const supabase = createAdminClient()

    // Check for existing subscription
    if (check_existing) {
      const { data: existing } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
        .select('id, status')
        .eq('agent_id', agent_id)
        .eq('plan_id', plan_id)
        .eq('status', 'active')
        .limit(1)
        .returns<Array<{ id: string; status: SubscriptionStatus }>>()

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'You already have an active subscription to this plan.',
        }
      }
    }

    // Calculate period dates
    const now = new Date()
    const periodEnd = new Date(now)
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Create subscription record
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .insert({
        agent_id,
        plan_id,
        status: 'active' as SubscriptionStatus,
        stripe_subscription_id: 'sub_test_123', // Would come from Stripe in real implementation
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        created_at: now.toISOString(),
      })
      .select()
      .single()
      .returns<Subscription>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create subscription.',
      }
    }

    return {
      success: true,
      subscription: data,
      client_secret: 'seti_test_secret',
    }
  } catch (error) {
    console.error('[Subscriptions] Error creating subscription:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: {
    reason?: string
    at_period_end?: boolean
  } = {}
): Promise<{
  success: boolean
  subscription?: Subscription
  error?: string
}> {
  const { reason, at_period_end = false } = options

  try {
    const supabase = createAdminClient()

    // Get current subscription
    const { data: current } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .select('*')
      .eq('id', subscriptionId)
      .single()
      .returns<Subscription>()

    if (!current) {
      return {
        success: false,
        error: 'Subscription not found.',
      }
    }

    // Update subscription
    const updates: {
      cancellation_reason?: string
      cancel_at_period_end?: boolean
      status?: SubscriptionStatus
      cancelled_at?: string
    } = {
      cancellation_reason: reason,
    }

    if (at_period_end) {
      updates.cancel_at_period_end = true
    } else {
      updates.status = 'cancelled'
      updates.cancelled_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single()
      .returns<Subscription>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to cancel subscription.',
      }
    }

    return {
      success: true,
      subscription: data,
    }
  } catch (error) {
    console.error('[Subscriptions] Error cancelling subscription:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: string): Promise<{
  success: boolean
  subscription?: Subscription
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .update({
        status: 'paused' as SubscriptionStatus,
        paused_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single()
      .returns<Subscription>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to pause subscription.',
      }
    }

    return {
      success: true,
      subscription: data,
    }
  } catch (error) {
    console.error('[Subscriptions] Error pausing subscription:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<{
  success: boolean
  subscription?: Subscription
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .update({
        status: 'active' as SubscriptionStatus,
        paused_at: null,
      })
      .eq('id', subscriptionId)
      .select()
      .single()
      .returns<Subscription>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to resume subscription.',
      }
    }

    return {
      success: true,
      subscription: data,
    }
  } catch (error) {
    console.error('[Subscriptions] Error resuming subscription:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get subscription usage
 */
export async function getSubscriptionUsage(subscriptionId: string): Promise<SubscriptionUsage | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .select('*, plan:subscription_plans(*)')
      .eq('id', subscriptionId)
      .single()
      .returns<Subscription & { plan: SubscriptionPlan }>()

    if (error || !data) {
      return null
    }

    const photosUsed = data.usage?.photos_used || 0
    const videosUsed = data.usage?.videos_used || 0
    const includedPhotos = data.plan?.included_photos || 0
    const includedVideos = data.plan?.included_videos || 0

    return {
      subscription_id: subscriptionId,
      photos_used: photosUsed,
      photos_remaining: Math.max(0, includedPhotos - photosUsed),
      videos_used: videosUsed,
      videos_remaining: Math.max(0, includedVideos - videosUsed),
      period_start: data.current_period_start,
      period_end: data.current_period_end,
    }
  } catch (error) {
    console.error('[Subscriptions] Error getting usage:', error)
    return null
  }
}

/**
 * Process subscription renewal (called from Stripe webhook)
 */
export async function processSubscriptionRenewal(params: {
  subscription_id: string
  stripe_invoice_id: string
  amount_paid: number
  payment_failed?: boolean
}): Promise<{
  success: boolean
  subscription?: Subscription
  error?: string
}> {
  const { subscription_id, stripe_invoice_id, amount_paid, payment_failed = false } = params

  try {
    const supabase = createAdminClient()

    // Determine new status and dates
    const now = new Date()
    const newPeriodEnd = new Date(now)
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)

    const updates: {
      status: SubscriptionStatus
      current_period_start?: string
      current_period_end?: string
      usage?: { photos_used: number; videos_used: number }
    } = {
      status: payment_failed ? 'past_due' : 'active',
    }

    if (!payment_failed) {
      updates.current_period_start = now.toISOString()
      updates.current_period_end = newPeriodEnd.toISOString()
      // Reset usage for new period
      updates.usage = { photos_used: 0, videos_used: 0 }
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .update(updates)
      .eq('id', subscription_id)
      .select()
      .single()
      .returns<Subscription>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to process renewal.',
      }
    }

    return {
      success: true,
      subscription: data,
    }
  } catch (error) {
    console.error('[Subscriptions] Error processing renewal:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get active subscription for feature gating
 */
export async function hasActiveSubscription(
  agentId: string,
  planId?: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('subscriptions' as any)
      .select('id')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .limit(1)

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data } = await query.returns<Array<{ id: string }>>()

    return !!(data && data.length > 0)
  } catch (error) {
    console.error('[Subscriptions] Error checking subscription:', error)
    return false
  }
}
