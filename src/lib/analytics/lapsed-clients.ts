import { createAdminClient } from '@/lib/supabase/admin'
import { enrollContact } from '@/lib/marketing/drip/service'

/**
 * Lapsed client data
 */
export interface LapsedClient {
  id: string
  name: string
  email: string
  last_order_date: string
  days_since_order: number
  total_orders: number
  lifetime_value: number
  last_contacted?: string
  active_campaign?: string
}

/**
 * Lapsed client statistics
 */
export interface LapsedClientStats {
  total_lapsed: number
  total_at_risk_revenue: number
  avg_days_lapsed: number
  by_duration: {
    '90_120': number
    '120_180': number
    '180_plus': number
  }
}

/**
 * Client last activity
 */
export interface ClientLastActivity {
  last_order_id: string
  last_order_date: string
  last_order_amount: number
  last_service: string
  days_since_order: number
}

/**
 * Get lapsed clients (no orders in X days)
 */
export async function getLapsedClients(options: {
  days_threshold: number
  exclude_contacted?: boolean
  sort_by?: 'lifetime_value' | 'days_since_order'
  limit?: number
}): Promise<LapsedClient[]> {
  const { days_threshold, exclude_contacted = false, sort_by = 'days_since_order', limit = 100 } = options

  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('agent_activity_summary')
      .select('*')
      .gte('days_since_order', days_threshold)
      .order(sort_by, { ascending: sort_by === 'days_since_order' ? true : false })
      .limit(limit) as { data: LapsedClient[] | null; error: Error | null }

    if (error || !data) {
      return []
    }

    // Filter out contacted if requested
    if (exclude_contacted) {
      return data.filter((c) => !c.last_contacted)
    }

    return data
  } catch (error) {
    console.error('[LapsedClients] Error getting lapsed clients:', error)
    return []
  }
}

/**
 * Get lapsed client statistics
 */
export async function getLapsedClientStats(): Promise<LapsedClientStats | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('agent_activity_summary')
      .select('days_since_order, lifetime_value')
      .gte('days_since_order', 90) as {
        data: Array<{ days_since_order: number; lifetime_value: number }> | null
        error: Error | null
      }

    if (error || !data) {
      return null
    }

    const totalLapsed = data.length
    const totalRevenue = data.reduce((sum, c) => sum + (c.lifetime_value || 0), 0)
    const avgDays = totalLapsed > 0
      ? Math.round(data.reduce((sum, c) => sum + c.days_since_order, 0) / totalLapsed)
      : 0

    // Break down by duration
    const byDuration = {
      '90_120': data.filter((c) => c.days_since_order >= 90 && c.days_since_order < 120).length,
      '120_180': data.filter((c) => c.days_since_order >= 120 && c.days_since_order < 180).length,
      '180_plus': data.filter((c) => c.days_since_order >= 180).length,
    }

    return {
      total_lapsed: totalLapsed,
      total_at_risk_revenue: totalRevenue,
      avg_days_lapsed: avgDays,
      by_duration: byDuration,
    }
  } catch (error) {
    console.error('[LapsedClients] Error getting stats:', error)
    return null
  }
}

/**
 * Mark a client as contacted
 */
export async function markClientContacted(
  clientId: string,
  options: {
    method: 'email' | 'phone' | 'sms'
    notes?: string
  }
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agent_contact_history')
      .insert({
        agent_id: clientId,
        contact_method: options.method,
        contact_notes: options.notes,
        contacted_at: new Date().toISOString(),
      })

    if (error) {
      return {
        success: false,
        error: 'Failed to record contact.',
      }
    }

    // Update last contacted on agent record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('agents')
      .update({
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', clientId)

    return { success: true }
  } catch (error) {
    console.error('[LapsedClients] Error marking contacted:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Enroll a lapsed client in re-engagement campaign
 */
export async function enrollInReengagement(
  clientId: string,
  campaignId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Enroll in drip campaign
    const enrollResult = await enrollContact({
      campaign_id: campaignId,
      contact_id: clientId,
    })

    if (!enrollResult.success) {
      return {
        success: false,
        error: enrollResult.error,
      }
    }

    // Update agent record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('agents')
      .update({
        reengagement_enrolled_at: new Date().toISOString(),
        reengagement_campaign_id: campaignId,
      })
      .eq('id', clientId)

    return { success: true }
  } catch (error) {
    console.error('[LapsedClients] Error enrolling in reengagement:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get client's last activity details
 */
export async function getClientLastActivity(clientId: string): Promise<ClientLastActivity | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('orders')
      .select('id, created_at, total, services')
      .eq('agent_id', clientId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as {
        data: {
          id: string
          created_at: string
          total: number
          services: string[]
        } | null
        error: Error | null
      }

    if (error || !data) {
      return null
    }

    const lastOrderDate = new Date(data.created_at)
    const now = new Date()
    const daysSinceOrder = Math.floor(
      (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      last_order_id: data.id,
      last_order_date: data.created_at,
      last_order_amount: data.total,
      last_service: data.services?.[0] || 'Unknown',
      days_since_order: daysSinceOrder,
    }
  } catch (error) {
    console.error('[LapsedClients] Error getting last activity:', error)
    return null
  }
}

/**
 * Get clients at risk of lapsing (approaching threshold)
 */
export async function getAtRiskClients(options: {
  warning_days: number
  exclude_in_campaigns?: boolean
  limit?: number
}): Promise<LapsedClient[]> {
  const { warning_days, exclude_in_campaigns = false, limit = 50 } = options

  try {
    const supabase = createAdminClient()

    // Get clients between warning_days and 90 days
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('agent_activity_summary')
      .select('*')
      .gte('days_since_order', warning_days)
      .lt('days_since_order', 90)
      .order('lifetime_value', { ascending: false })
      .limit(limit) as { data: LapsedClient[] | null; error: Error | null }

    if (error || !data) {
      return []
    }

    // Filter out those in active campaigns
    if (exclude_in_campaigns) {
      return data.filter((c) => !c.active_campaign)
    }

    return data
  } catch (error) {
    console.error('[LapsedClients] Error getting at-risk clients:', error)
    return []
  }
}

/**
 * Batch process lapsed clients for re-engagement
 */
export async function batchEnrollLapsedClients(options: {
  campaign_id: string
  days_threshold: number
  max_enrollments?: number
}): Promise<{
  success: boolean
  enrolled_count: number
  errors: string[]
}> {
  const { campaign_id, days_threshold, max_enrollments = 50 } = options

  try {
    const lapsedClients = await getLapsedClients({
      days_threshold,
      exclude_contacted: true,
      limit: max_enrollments,
    })

    let enrolledCount = 0
    const errors: string[] = []

    for (const client of lapsedClients) {
      const result = await enrollInReengagement(client.id, campaign_id)
      if (result.success) {
        enrolledCount++
      } else {
        errors.push(`Failed to enroll ${client.email}: ${result.error}`)
      }
    }

    return {
      success: true,
      enrolled_count: enrolledCount,
      errors,
    }
  } catch (error) {
    console.error('[LapsedClients] Error batch enrolling:', error)
    return {
      success: false,
      enrolled_count: 0,
      errors: ['An unexpected error occurred.'],
    }
  }
}
