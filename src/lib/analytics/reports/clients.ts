/**
 * Client Reports Service
 *
 * Generates client analytics, top clients, and inactive client alerts.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { apiLogger, formatError } from '@/lib/logger'
import type {
  DateRange,
  TimePeriod,
  TopClient,
  TopClientsReport,
  InactiveClient,
  InactiveClientAlert,
  InactiveClientsReport,
  InactiveReason,
  ClientSegment,
} from './types'
import { getDateRangeFromPeriod } from './revenue'

/**
 * Format cents to dollars
 */
function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Calculate days since a date
 */
function daysSince(dateStr: string | null): number {
  if (!dateStr) return 9999
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Get all clients with order data
 */
async function getClientsWithOrders(period: DateRange): Promise<TopClient[]> {
  const supabase = createAdminClient()

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        email,
        phone,
        referral_tier,
        credit_balance,
        created_at
      `)

    if (agentsError) throw agentsError

    // Get all paid orders
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, agent_id, total_cents, paid_at, created_at')
      .eq('payment_status', 'succeeded')

    if (ordersError) throw ordersError

    // Get referral counts
    const { data: referrals } = await supabase
      .from('agents')
      .select('referred_by_id')
      .not('referred_by_id', 'is', null)

    const referralCounts: Record<string, number> = {}
    for (const r of referrals || []) {
      if (r.referred_by_id) {
        referralCounts[r.referred_by_id] = (referralCounts[r.referred_by_id] || 0) + 1
      }
    }

    // Calculate metrics per agent
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const periodStart = new Date(period.start)
    const periodEnd = new Date(period.end)

    const results: TopClient[] = []

    for (const agent of agents || []) {
      const agentOrders = allOrders?.filter(o => o.agent_id === agent.id) || []

      if (agentOrders.length === 0) continue

      // Calculate metrics
      const lifetimeRevenueCents = agentOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0)

      const periodOrders = agentOrders.filter(o =>
        o.paid_at && new Date(o.paid_at) >= periodStart && new Date(o.paid_at) <= periodEnd
      )
      const periodRevenueCents = periodOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0)

      const last30DaysOrders = agentOrders.filter(o =>
        o.paid_at && new Date(o.paid_at) >= thirtyDaysAgo
      )
      const last90DaysOrders = agentOrders.filter(o =>
        o.paid_at && new Date(o.paid_at) >= ninetyDaysAgo
      )

      // Previous period for trend
      const periodDuration = periodEnd.getTime() - periodStart.getTime()
      const prevPeriodStart = new Date(periodStart.getTime() - periodDuration)
      const prevPeriodEnd = new Date(periodEnd.getTime() - periodDuration)
      const prevPeriodOrders = agentOrders.filter(o =>
        o.paid_at && new Date(o.paid_at) >= prevPeriodStart && new Date(o.paid_at) <= prevPeriodEnd
      )
      const prevPeriodRevenueCents = prevPeriodOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0)

      // Determine trend
      let revenueTrend: 'up' | 'down' | 'stable' = 'stable'
      let revenueChangePercent = 0
      if (prevPeriodRevenueCents > 0) {
        revenueChangePercent = Math.round(((periodRevenueCents - prevPeriodRevenueCents) / prevPeriodRevenueCents) * 100)
        if (revenueChangePercent > 10) revenueTrend = 'up'
        else if (revenueChangePercent < -10) revenueTrend = 'down'
      } else if (periodRevenueCents > 0) {
        revenueTrend = 'up'
        revenueChangePercent = 100
      }

      // Get first and last order dates
      const sortedOrders = agentOrders.sort((a, b) =>
        new Date(a.paid_at || a.created_at).getTime() - new Date(b.paid_at || b.created_at).getTime()
      )
      const firstOrderDate = sortedOrders[0]?.paid_at || sortedOrders[0]?.created_at
      const lastOrderDate = sortedOrders[sortedOrders.length - 1]?.paid_at || sortedOrders[sortedOrders.length - 1]?.created_at

      results.push({
        agent_id: agent.id,
        agent_name: agent.name,
        agent_email: agent.email,
        agent_phone: agent.phone,
        company: null, // Not in current schema
        total_revenue_cents: periodRevenueCents,
        total_revenue: centsToDollars(periodRevenueCents),
        lifetime_revenue_cents: lifetimeRevenueCents,
        lifetime_revenue: centsToDollars(lifetimeRevenueCents),
        order_count: periodOrders.length,
        avg_order_value: periodOrders.length > 0 ? centsToDollars(periodRevenueCents / periodOrders.length) : 0,
        first_order_date: firstOrderDate,
        last_order_date: lastOrderDate,
        days_since_last_order: daysSince(lastOrderDate),
        orders_last_30_days: last30DaysOrders.length,
        orders_last_90_days: last90DaysOrders.length,
        referral_tier: agent.referral_tier || 'bronze',
        credit_balance: agent.credit_balance || 0,
        total_referrals: referralCounts[agent.id] || 0,
        revenue_trend: revenueTrend,
        revenue_change_percent: revenueChangePercent,
      })
    }

    return results
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get clients with orders')
    throw error
  }
}

/**
 * Get top clients report
 */
export async function getTopClientsReport(
  period: TimePeriod,
  customRange?: DateRange,
  limit: number = 20
): Promise<TopClientsReport> {
  const dateRange = getDateRangeFromPeriod(period, customRange)
  const clients = await getClientsWithOrders(dateRange)

  // Sort by different criteria
  const byRevenue = [...clients].sort((a, b) => b.total_revenue_cents - a.total_revenue_cents).slice(0, limit)
  const byFrequency = [...clients].sort((a, b) => b.order_count - a.order_count).slice(0, limit)
  const byAvgOrder = [...clients].sort((a, b) => b.avg_order_value - a.avg_order_value).slice(0, limit)

  // New clients (first order in period)
  const periodStart = new Date(dateRange.start)
  const newClients = clients
    .filter(c => c.first_order_date && new Date(c.first_order_date) >= periodStart)
    .sort((a, b) => b.total_revenue_cents - a.total_revenue_cents)
    .slice(0, limit)

  // Growing clients (positive trend)
  const growingClients = clients
    .filter(c => c.revenue_trend === 'up' && c.revenue_change_percent > 20)
    .sort((a, b) => b.revenue_change_percent - a.revenue_change_percent)
    .slice(0, limit)

  // Declining clients (negative trend)
  const decliningClients = clients
    .filter(c => c.revenue_trend === 'down' && c.revenue_change_percent < -20)
    .sort((a, b) => a.revenue_change_percent - b.revenue_change_percent)
    .slice(0, limit)

  // Segments
  const segments: ClientSegment[] = [
    {
      segment_name: 'VIP Clients',
      description: 'Top 10% by lifetime revenue',
      agent_count: Math.ceil(clients.length * 0.1),
      total_revenue_cents: clients.slice(0, Math.ceil(clients.length * 0.1))
        .reduce((sum, c) => sum + c.total_revenue_cents, 0),
      avg_order_value: 0, // Calculated below
      criteria: { min_revenue: 5000 },
    },
    {
      segment_name: 'Regular Clients',
      description: '2+ orders in period',
      agent_count: clients.filter(c => c.order_count >= 2).length,
      total_revenue_cents: clients.filter(c => c.order_count >= 2)
        .reduce((sum, c) => sum + c.total_revenue_cents, 0),
      avg_order_value: 0,
      criteria: { min_orders: 2 },
    },
    {
      segment_name: 'At-Risk Clients',
      description: 'No orders in 60+ days',
      agent_count: clients.filter(c => c.days_since_last_order >= 60).length,
      total_revenue_cents: clients.filter(c => c.days_since_last_order >= 60)
        .reduce((sum, c) => sum + c.lifetime_revenue_cents, 0),
      avg_order_value: 0,
      criteria: { days_since_last_order_min: 60 },
    },
  ]

  // Calculate avg order values for segments
  for (const segment of segments) {
    if (segment.agent_count > 0) {
      segment.avg_order_value = centsToDollars(segment.total_revenue_cents / segment.agent_count)
    }
  }

  return {
    top_by_revenue: byRevenue,
    top_by_frequency: byFrequency,
    top_by_avg_order: byAvgOrder,
    new_clients: newClients,
    growing_clients: growingClients,
    declining_clients: decliningClients,
    segments,
    period: dateRange,
    generated_at: new Date().toISOString(),
  }
}

/**
 * Determine inactive reason and priority
 */
function getInactiveInfo(client: TopClient): {
  reason: InactiveReason
  priority: 'low' | 'medium' | 'high' | 'critical'
  action: string
} {
  const daysSince = client.days_since_last_order

  if (daysSince >= 90) {
    return {
      reason: 'no_orders_90_days',
      priority: client.lifetime_revenue >= 2000 ? 'critical' : 'high',
      action: 'Immediate outreach - high-value client at risk of churn',
    }
  }

  if (daysSince >= 60) {
    return {
      reason: 'no_orders_60_days',
      priority: client.lifetime_revenue >= 1000 ? 'high' : 'medium',
      action: 'Schedule follow-up call to understand needs',
    }
  }

  if (daysSince >= 30) {
    return {
      reason: 'no_orders_30_days',
      priority: client.order_count > 5 ? 'medium' : 'low',
      action: 'Send promotional email with special offer',
    }
  }

  if (client.revenue_trend === 'down' && client.revenue_change_percent < -30) {
    return {
      reason: 'declining_orders',
      priority: 'medium',
      action: 'Reach out to understand declining engagement',
    }
  }

  return {
    reason: 'no_orders_30_days',
    priority: 'low',
    action: 'Add to re-engagement email sequence',
  }
}

/**
 * Get inactive clients report
 */
export async function getInactiveClientsReport(
  inactiveDays: number = 30,
  limit: number = 100
): Promise<InactiveClientsReport> {
  const now = new Date()
  const dateRange: DateRange = {
    start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    end: now.toISOString(),
  }

  const clients = await getClientsWithOrders(dateRange)

  // Filter to inactive clients
  const inactiveClients = clients.filter(c => c.days_since_last_order >= inactiveDays)

  // Build alerts
  const alerts: InactiveClientAlert[] = inactiveClients
    .slice(0, limit)
    .map(client => {
      const { reason, priority, action } = getInactiveInfo(client)

      // Estimate lost revenue (based on monthly avg)
      const monthsActive = Math.max(1, Math.floor(
        (new Date(client.last_order_date).getTime() - new Date(client.first_order_date).getTime()) /
        (30 * 24 * 60 * 60 * 1000)
      ))
      const monthlyAvg = client.lifetime_revenue / monthsActive
      const estimatedLost = monthlyAvg * (client.days_since_last_order / 30)

      const inactiveClient: InactiveClient = {
        agent_id: client.agent_id,
        agent_name: client.agent_name,
        agent_email: client.agent_email,
        agent_phone: client.agent_phone,
        company: client.company,
        total_orders: client.order_count,
        total_revenue_cents: client.total_revenue_cents,
        total_revenue: client.total_revenue,
        avg_order_value: client.avg_order_value,
        first_order_date: client.first_order_date,
        last_order_date: client.last_order_date,
        days_since_last_order: client.days_since_last_order,
        inactive_reason: reason,
        alert_priority: priority,
        estimated_lost_revenue: Math.round(estimatedLost * 100) / 100,
        last_contacted_at: null,
        contact_attempts: 0,
        recommended_action: action,
      }

      return {
        alert_id: `alert_${client.agent_id}_${Date.now()}`,
        agent: inactiveClient,
        created_at: now.toISOString(),
        status: 'new' as const,
        assigned_to: null,
        notes: [],
      }
    })

  // Sort by priority then by estimated lost revenue
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  alerts.sort((a, b) => {
    const pDiff = priorityOrder[a.agent.alert_priority] - priorityOrder[b.agent.alert_priority]
    if (pDiff !== 0) return pDiff
    return b.agent.estimated_lost_revenue - a.agent.estimated_lost_revenue
  })

  // Calculate summary
  const totalEstimatedLost = alerts.reduce((sum, a) => sum + a.agent.estimated_lost_revenue, 0)
  const highPriorityCount = alerts.filter(a =>
    a.agent.alert_priority === 'high' || a.agent.alert_priority === 'critical'
  ).length

  // Count by reason
  const byReason: Record<InactiveReason, number> = {
    no_orders_30_days: 0,
    no_orders_60_days: 0,
    no_orders_90_days: 0,
    declining_orders: 0,
    cancelled_last_order: 0,
    payment_issues: 0,
  }

  const byPriority: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  for (const alert of alerts) {
    byReason[alert.agent.inactive_reason]++
    byPriority[alert.agent.alert_priority]++
  }

  return {
    summary: {
      total_inactive: inactiveClients.length,
      high_priority_count: highPriorityCount,
      estimated_lost_revenue_monthly: Math.round(totalEstimatedLost * 100) / 100,
      reactivation_rate_30_days: 0, // Would need historical data to calculate
    },
    alerts,
    by_reason: byReason,
    by_priority: byPriority,
    period: dateRange,
    generated_at: now.toISOString(),
  }
}

/**
 * Get client lifetime value analysis
 */
export async function getClientLTVAnalysis(): Promise<{
  avg_ltv: number
  median_ltv: number
  top_10_percent_ltv: number
  bottom_50_percent_ltv: number
  ltv_distribution: { range: string; count: number }[]
}> {
  const supabase = createAdminClient()

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('agent_id, total_cents')
      .eq('payment_status', 'succeeded')

    if (error) throw error

    // Calculate LTV per agent
    const agentLTV: Record<string, number> = {}
    for (const order of orders || []) {
      if (order.agent_id) {
        agentLTV[order.agent_id] = (agentLTV[order.agent_id] || 0) + (order.total_cents || 0)
      }
    }

    const ltvValues = Object.values(agentLTV).map(v => centsToDollars(v)).sort((a, b) => a - b)

    if (ltvValues.length === 0) {
      return {
        avg_ltv: 0,
        median_ltv: 0,
        top_10_percent_ltv: 0,
        bottom_50_percent_ltv: 0,
        ltv_distribution: [],
      }
    }

    const avg = ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length
    const median = ltvValues[Math.floor(ltvValues.length / 2)]
    const top10Index = Math.floor(ltvValues.length * 0.9)
    const bottom50Index = Math.floor(ltvValues.length * 0.5)

    // Distribution buckets
    const buckets = [
      { range: '$0-$500', min: 0, max: 500, count: 0 },
      { range: '$500-$1000', min: 500, max: 1000, count: 0 },
      { range: '$1000-$2500', min: 1000, max: 2500, count: 0 },
      { range: '$2500-$5000', min: 2500, max: 5000, count: 0 },
      { range: '$5000-$10000', min: 5000, max: 10000, count: 0 },
      { range: '$10000+', min: 10000, max: Infinity, count: 0 },
    ]

    for (const ltv of ltvValues) {
      for (const bucket of buckets) {
        if (ltv >= bucket.min && ltv < bucket.max) {
          bucket.count++
          break
        }
      }
    }

    return {
      avg_ltv: Math.round(avg * 100) / 100,
      median_ltv: Math.round(median * 100) / 100,
      top_10_percent_ltv: Math.round(ltvValues[top10Index] * 100) / 100,
      bottom_50_percent_ltv: Math.round(ltvValues[bottom50Index] * 100) / 100,
      ltv_distribution: buckets.map(b => ({ range: b.range, count: b.count })),
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get client LTV analysis')
    throw error
  }
}
