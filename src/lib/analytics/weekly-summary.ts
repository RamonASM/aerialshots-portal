import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

/**
 * Weekly summary data
 */
export interface WeeklySummary {
  agent_id: string
  week_start: string
  week_end: string
  total_orders: number
  total_revenue?: number
  property_views: number
  unique_visitors?: number
  avg_time_on_page?: number
  qr_scans?: number
  qr_scan_locations?: string[]
  top_listings?: Array<{ address: string; views: number }>
  prev_week_orders?: number
  orders_change_percent?: number | null
  prev_week_views?: number
  views_change_percent?: number
}

/**
 * Weekly report recipient
 */
export interface WeeklyReportRecipient {
  id: string
  email: string
  name?: string
  weekly_report_enabled: boolean
  has_recent_activity?: boolean
  timezone?: string
}

/**
 * Weekly report record
 */
export interface WeeklyReport {
  id: string
  agent_id: string
  week_start: string
  week_end: string
  sent_at: string
  email_id?: string
  delivery_status?: 'sent' | 'delivered' | 'opened' | 'failed'
}

/**
 * Generate weekly summary for an agent
 */
export async function generateWeeklySummary(agentId: string): Promise<WeeklySummary | null> {
  try {
    const supabase = createAdminClient()

    // Calculate week boundaries
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()) // Last Sunday
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    // Get weekly stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('agent_weekly_stats')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .single() as { data: WeeklySummary | null; error: Error | null }

    if (error) {
      return null
    }

    return data
  } catch (error) {
    console.error('[WeeklySummary] Error generating summary:', error)
    return null
  }
}

/**
 * Send weekly summary email to an agent
 */
export async function sendWeeklySummaryEmail(
  agentId: string,
  summary: WeeklySummary
): Promise<{
  success: boolean
  report_id?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get agent details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent } = await (supabase as any)
      .from('agents')
      .select('email, name')
      .eq('id', agentId)
      .single() as { data: { email: string; name: string } | null }

    if (!agent) {
      return {
        success: false,
        error: 'Agent not found.',
      }
    }

    // Build email content
    const subject = `Your Weekly Performance Report - ${summary.week_start} to ${summary.week_end}`
    const greeting = agent.name ? `Hi ${agent.name},` : 'Hi,'

    // Send email
    const emailResult = await sendEmail({
      to: agent.email,
      subject,
      html: buildWeeklyEmailHtml(greeting, summary),
    })

    if (!emailResult.success) {
      return {
        success: false,
        error: 'Failed to send email.',
      }
    }

    // Record in history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: report, error: reportError } = await (supabase as any)
      .from('weekly_reports')
      .insert({
        agent_id: agentId,
        week_start: summary.week_start,
        week_end: summary.week_end,
        sent_at: new Date().toISOString(),
        email_id: emailResult.id,
        delivery_status: 'sent',
      })
      .select()
      .single() as { data: WeeklyReport | null; error: Error | null }

    if (reportError || !report) {
      return {
        success: false,
        error: 'Failed to record report.',
      }
    }

    return {
      success: true,
      report_id: report.id,
    }
  } catch (error) {
    console.error('[WeeklySummary] Error sending email:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Build HTML for weekly email
 */
function buildWeeklyEmailHtml(greeting: string, summary: WeeklySummary): string {
  const ordersChange = summary.orders_change_percent !== null && summary.orders_change_percent !== undefined
    ? `(${summary.orders_change_percent > 0 ? '+' : ''}${summary.orders_change_percent.toFixed(1)}%)`
    : ''

  const viewsChange = summary.views_change_percent
    ? `(${summary.views_change_percent > 0 ? '+' : ''}${summary.views_change_percent.toFixed(1)}%)`
    : ''

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">${greeting}</h1>
      <p>Here's your weekly performance summary for ${summary.week_start} - ${summary.week_end}:</p>

      <div style="background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Key Metrics</h2>
        <p><strong>Orders:</strong> ${summary.total_orders} ${ordersChange}</p>
        ${summary.total_revenue ? `<p><strong>Revenue:</strong> $${summary.total_revenue.toFixed(2)}</p>` : ''}
        <p><strong>Property Views:</strong> ${summary.property_views} ${viewsChange}</p>
        ${summary.qr_scans ? `<p><strong>QR Code Scans:</strong> ${summary.qr_scans}</p>` : ''}
      </div>

      ${summary.top_listings?.length ? `
        <div style="margin: 20px 0;">
          <h3>Top Performing Listings</h3>
          <ul>
            ${summary.top_listings.map((l) => `<li>${l.address}: ${l.views} views</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <p style="color: #666;">Keep up the great work!</p>
      <p style="color: #666;">- The Aerial Shots Media Team</p>
    </div>
  `
}

/**
 * Get agents eligible for weekly reports
 */
export async function getAgentsForWeeklyReport(options: {
  require_activity?: boolean
} = {}): Promise<WeeklyReportRecipient[]> {
  const { require_activity = false } = options

  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('agents')
      .select('id, email, name, weekly_report_enabled, timezone')
      .eq('weekly_report_enabled', true)

    if (require_activity) {
      query = query.eq('has_recent_activity', true)
    }

    const { data, error } = await query as {
      data: WeeklyReportRecipient[] | null
      error: Error | null
    }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[WeeklySummary] Error getting agents:', error)
    return []
  }
}

/**
 * Schedule weekly reports for all eligible agents
 */
export async function scheduleWeeklyReports(): Promise<{
  success: boolean
  scheduled_count: number
  errors: string[]
}> {
  try {
    const agents = await getAgentsForWeeklyReport()

    if (agents.length === 0) {
      return {
        success: true,
        scheduled_count: 0,
        errors: [],
      }
    }

    let scheduledCount = 0
    const errors: string[] = []

    for (const agent of agents) {
      const summary = await generateWeeklySummary(agent.id)

      if (summary) {
        const result = await sendWeeklySummaryEmail(agent.id, summary)

        if (result.success) {
          scheduledCount++
        } else {
          errors.push(`Failed to send to ${agent.email}: ${result.error}`)
        }
      }
    }

    return {
      success: true,
      scheduled_count: scheduledCount,
      errors,
    }
  } catch (error) {
    console.error('[WeeklySummary] Error scheduling reports:', error)
    return {
      success: false,
      scheduled_count: 0,
      errors: ['An unexpected error occurred.'],
    }
  }
}

/**
 * Get weekly report history for an agent
 */
export async function getWeeklyReportHistory(
  agentId: string,
  limit: number = 10
): Promise<WeeklyReport[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('weekly_reports')
      .select('*')
      .eq('agent_id', agentId)
      .order('sent_at', { ascending: false })
      .limit(limit) as { data: WeeklyReport[] | null; error: Error | null }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[WeeklySummary] Error getting history:', error)
    return []
  }
}

/**
 * Update report delivery status (from webhook)
 */
export async function updateReportDeliveryStatus(
  emailId: string,
  status: 'delivered' | 'opened' | 'failed'
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('weekly_reports')
      .update({ delivery_status: status })
      .eq('email_id', emailId)

    if (error) {
      return {
        success: false,
        error: 'Failed to update status.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[WeeklySummary] Error updating status:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Toggle weekly report preference for an agent
 */
export async function toggleWeeklyReportPreference(
  agentId: string,
  enabled: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('agents')
      .update({ weekly_report_enabled: enabled })
      .eq('id', agentId)

    if (error) {
      return {
        success: false,
        error: 'Failed to update preference.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[WeeklySummary] Error toggling preference:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}
