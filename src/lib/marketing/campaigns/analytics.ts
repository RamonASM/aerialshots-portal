import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Campaign event types
 */
export type CampaignEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'unsubscribed'
  | 'complained'

/**
 * Campaign event
 */
export interface CampaignEvent {
  id: string
  campaign_id: string
  recipient_id: string
  event_type: CampaignEventType
  metadata?: Record<string, unknown>
  created_at: string
}

/**
 * Campaign analytics summary
 */
export interface CampaignAnalytics {
  campaign_id: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  complained: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  unsubscribe_rate: number
}

/**
 * Campaign performance data point
 */
export interface CampaignPerformance {
  date?: string
  hour?: string
  event_type: CampaignEventType
  count: number
}

/**
 * Email deliverability metrics
 */
export interface EmailDeliverability {
  delivery_rate: number
  hard_bounces: number
  soft_bounces: number
  complaint_rate: number
}

/**
 * Click heatmap entry
 */
export interface ClickHeatmapEntry {
  link_id: string
  url: string
  clicks: number
  percentage: number
}

/**
 * Unsubscribe reason
 */
export interface UnsubscribeReason {
  reason: string
  count: number
  percentage: number
}

/**
 * Track a campaign event
 */
export async function trackCampaignEvent(params: {
  campaign_id: string
  recipient_id: string
  event_type: CampaignEventType
  metadata?: Record<string, unknown>
}): Promise<{
  success: boolean
  event?: CampaignEvent
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .insert({
        campaign_id: params.campaign_id,
        recipient_id: params.recipient_id,
        event_type: params.event_type,
        metadata: params.metadata || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: CampaignEvent | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to track event.',
      }
    }

    return {
      success: true,
      event: data,
    }
  } catch (error) {
    console.error('[CampaignAnalytics] Error tracking event:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get campaign analytics summary
 */
export async function getCampaignAnalytics(
  campaignId: string
): Promise<CampaignAnalytics | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .select('event_type, count')
      .eq('campaign_id', campaignId) as {
        data: Array<{ event_type: CampaignEventType; count: number }> | null
        error: Error | null
      }

    if (error) {
      return null
    }

    const events = data || []

    // Aggregate counts by event type
    const counts: Record<CampaignEventType, number> = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
    }

    events.forEach((e) => {
      counts[e.event_type] = e.count
    })

    // Calculate rates
    const deliveredOrSent = counts.delivered || counts.sent
    const openRate = deliveredOrSent > 0 ? (counts.opened / deliveredOrSent) * 100 : 0
    const clickRate = deliveredOrSent > 0 ? (counts.clicked / deliveredOrSent) * 100 : 0
    const bounceRate = counts.sent > 0 ? (counts.bounced / counts.sent) * 100 : 0
    const unsubscribeRate = deliveredOrSent > 0 ? (counts.unsubscribed / deliveredOrSent) * 100 : 0

    return {
      campaign_id: campaignId,
      sent: counts.sent,
      delivered: counts.delivered,
      opened: counts.opened,
      clicked: counts.clicked,
      bounced: counts.bounced,
      unsubscribed: counts.unsubscribed,
      complained: counts.complained,
      open_rate: Math.round(openRate * 100) / 100,
      click_rate: Math.round(clickRate * 100) / 100,
      bounce_rate: Math.round(bounceRate * 100) / 100,
      unsubscribe_rate: Math.round(unsubscribeRate * 100) / 100,
    }
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting analytics:', error)
    return null
  }
}

/**
 * Get campaign performance over time
 */
export async function getCampaignPerformance(
  campaignId: string,
  options: {
    date_from: string
    date_to: string
    granularity?: 'hour' | 'day'
  }
): Promise<CampaignPerformance[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .gte('created_at', options.date_from)
      .lte('created_at', options.date_to)
      .order('created_at', { ascending: true }) as {
        data: Array<{
          date?: string
          hour?: string
          event_type: CampaignEventType
          count: number
        }> | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting performance:', error)
    return []
  }
}

/**
 * Get email deliverability metrics
 */
export async function getEmailDeliverability(
  campaignId: string
): Promise<EmailDeliverability | null> {
  try {
    const supabase = createAdminClient()

    // Get main event counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventData, error: eventError } = await (supabase as any)
      .from('campaign_events')
      .select('event_type, count')
      .eq('campaign_id', campaignId) as {
        data: Array<{ event_type: CampaignEventType; count: number }> | null
        error: Error | null
      }

    if (eventError) {
      return null
    }

    const events = eventData || []
    const counts: Record<string, number> = {}
    events.forEach((e) => {
      counts[e.event_type] = e.count
    })

    // Get bounce breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bounceData } = await (supabase as any)
      .from('campaign_events')
      .select('metadata->bounce_type as bounce_type, count')
      .eq('campaign_id', campaignId)
      .eq('event_type', 'bounced') as {
        data: Array<{ bounce_type: string; count: number }> | null
      }

    const bounces = bounceData || []
    let hardBounces = 0
    let softBounces = 0

    bounces.forEach((b) => {
      if (b.bounce_type === 'hard') hardBounces = b.count
      else if (b.bounce_type === 'soft') softBounces = b.count
    })

    const sent = counts.sent || 0
    const delivered = counts.delivered || 0
    const complained = counts.complained || 0

    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
    const complaintRate = delivered > 0 ? (complained / delivered) * 100 : 0

    return {
      delivery_rate: Math.round(deliveryRate * 100) / 100,
      hard_bounces: hardBounces,
      soft_bounces: softBounces,
      complaint_rate: Math.round(complaintRate * 100) / 100,
    }
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting deliverability:', error)
    return null
  }
}

/**
 * Get click heatmap data
 */
export async function getClickHeatmap(campaignId: string): Promise<ClickHeatmapEntry[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .select('metadata->link_id as link_id, metadata->url as url, count')
      .eq('campaign_id', campaignId)
      .eq('event_type', 'clicked')
      .order('count', { ascending: false }) as {
        data: Array<{ link_id: string; url: string; clicks: number }> | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0)

    return data.map((d) => ({
      link_id: d.link_id,
      url: d.url,
      clicks: d.clicks,
      percentage: totalClicks > 0 ? Math.round((d.clicks / totalClicks) * 10000) / 100 : 0,
    }))
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting click heatmap:', error)
    return []
  }
}

/**
 * Get unsubscribe reasons breakdown
 */
export async function getUnsubscribeReasons(campaignId: string): Promise<UnsubscribeReason[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .select('metadata->reason as reason, count')
      .eq('campaign_id', campaignId)
      .eq('event_type', 'unsubscribed')
      .order('count', { ascending: false }) as {
        data: Array<{ reason: string; count: number }> | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    const total = data.reduce((sum, d) => sum + d.count, 0)

    return data.map((d) => ({
      reason: d.reason,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 10000) / 100 : 0,
    }))
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting unsubscribe reasons:', error)
    return []
  }
}

/**
 * Export campaign report
 */
export async function exportCampaignReport(
  campaignId: string,
  options: {
    format: 'csv' | 'json'
    include_summary?: boolean
  }
): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true }) as {
        data: Array<{
          recipient_email?: string
          event_type: CampaignEventType
          created_at: string
          count?: number
        }> | null
        error: Error | null
      }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to fetch campaign data.',
      }
    }

    if (options.format === 'csv') {
      const header = 'Email,Event,Timestamp'
      const rows = data.map((e) => {
        const email = e.recipient_email || ''
        const event = e.event_type
        const timestamp = e.created_at
        return `${email},${event},${timestamp}`
      })

      return {
        success: true,
        data: [header, ...rows].join('\n'),
      }
    } else {
      const result: {
        events: typeof data
        summary?: {
          total_events: number
          by_type: Record<string, number>
        }
      } = { events: data }

      if (options.include_summary) {
        const byType: Record<string, number> = {}
        data.forEach((e) => {
          if (e.count) {
            byType[e.event_type] = (byType[e.event_type] || 0) + e.count
          }
        })

        result.summary = {
          total_events: data.length,
          by_type: byType,
        }
      }

      return {
        success: true,
        data: JSON.stringify(result, null, 2),
      }
    }
  } catch (error) {
    console.error('[CampaignAnalytics] Error exporting report:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get real-time campaign stats (for live dashboard)
 */
export async function getRealtimeCampaignStats(campaignId: string): Promise<{
  opens_last_hour: number
  clicks_last_hour: number
  trend: 'up' | 'down' | 'stable'
} | null> {
  try {
    const supabase = createAdminClient()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // Get last hour stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastHour } = await (supabase as any)
      .from('campaign_events')
      .select('event_type, count')
      .eq('campaign_id', campaignId)
      .gte('created_at', oneHourAgo)
      .in('event_type', ['opened', 'clicked']) as {
        data: Array<{ event_type: string; count: number }> | null
      }

    // Get previous hour stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevHour } = await (supabase as any)
      .from('campaign_events')
      .select('event_type, count')
      .eq('campaign_id', campaignId)
      .gte('created_at', twoHoursAgo)
      .lt('created_at', oneHourAgo)
      .in('event_type', ['opened', 'clicked']) as {
        data: Array<{ event_type: string; count: number }> | null
      }

    const lastHourOpens = lastHour?.find((e) => e.event_type === 'opened')?.count || 0
    const lastHourClicks = lastHour?.find((e) => e.event_type === 'clicked')?.count || 0
    const prevHourOpens = prevHour?.find((e) => e.event_type === 'opened')?.count || 0

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (lastHourOpens > prevHourOpens * 1.1) trend = 'up'
    else if (lastHourOpens < prevHourOpens * 0.9) trend = 'down'

    return {
      opens_last_hour: lastHourOpens,
      clicks_last_hour: lastHourClicks,
      trend,
    }
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting realtime stats:', error)
    return null
  }
}
