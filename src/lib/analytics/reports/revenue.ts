/**
 * Revenue Reports Service
 *
 * Generates revenue analytics from real order data.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { apiLogger, formatError } from '@/lib/logger'
import type {
  DateRange,
  TimePeriod,
  RevenueReport,
  RevenueSummary,
  RevenueByPhotographer,
  RevenueByTerritory,
  RevenueByPackage,
  MonthlyRevenue,
  DailyRevenue,
  ReportFilters,
} from './types'

/**
 * Get date range from time period
 */
export function getDateRangeFromPeriod(period: TimePeriod, customRange?: DateRange): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return {
        start: today.toISOString(),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      }

    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return {
        start: yesterday.toISOString(),
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      }
    }

    case 'this_week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      return {
        start: startOfWeek.toISOString(),
        end: now.toISOString(),
      }
    }

    case 'last_week': {
      const startOfLastWeek = new Date(today)
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 7)
      return {
        start: startOfLastWeek.toISOString(),
        end: endOfLastWeek.toISOString(),
      }
    }

    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        start: startOfMonth.toISOString(),
        end: now.toISOString(),
      }
    }

    case 'last_month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        start: startOfLastMonth.toISOString(),
        end: endOfLastMonth.toISOString(),
      }
    }

    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
      return {
        start: startOfQuarter.toISOString(),
        end: now.toISOString(),
      }
    }

    case 'this_year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return {
        start: startOfYear.toISOString(),
        end: now.toISOString(),
      }
    }

    case 'custom':
      if (customRange) {
        return customRange
      }
      // Fall through to default

    default:
      // Default to last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      }
  }
}

/**
 * Get previous period for comparison
 */
function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(range.start)
  const end = new Date(range.end)
  const duration = end.getTime() - start.getTime()

  return {
    start: new Date(start.getTime() - duration).toISOString(),
    end: new Date(end.getTime() - duration).toISOString(),
  }
}

/**
 * Format cents to dollars
 */
function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Calculate percent change
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

/**
 * Generate revenue summary
 */
export async function getRevenueSummary(
  period: DateRange,
  filters?: ReportFilters
): Promise<RevenueSummary> {
  const supabase = createAdminClient()
  const previousPeriod = getPreviousPeriod(period)

  try {
    // Current period revenue
    let currentQuery = supabase
      .from('orders')
      .select('total_cents, agent_id')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end)

    if (filters?.agent_ids?.length) {
      currentQuery = currentQuery.in('agent_id', filters.agent_ids)
    }

    const { data: currentOrders, error: currentError } = await currentQuery

    if (currentError) throw currentError

    // Previous period for comparison
    const { data: previousOrders } = await supabase
      .from('orders')
      .select('total_cents')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', previousPeriod.start)
      .lte('paid_at', previousPeriod.end)

    // Get unique photographers count
    const { data: photographerData } = await supabase
      .from('listings')
      .select('photographer_id')
      .not('photographer_id', 'is', null)
      .gte('created_at', period.start)
      .lte('created_at', period.end)

    // YTD revenue
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const { data: ytdOrders } = await supabase
      .from('orders')
      .select('total_cents')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', startOfYear)

    // Calculate metrics
    const totalRevenueCents = currentOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0
    const previousRevenueCents = previousOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0
    const ytdRevenueCents = ytdOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0
    const orderCount = currentOrders?.length || 0
    const uniqueAgents = new Set(currentOrders?.map(o => o.agent_id)).size
    const uniquePhotographers = new Set(photographerData?.map(l => l.photographer_id)).size

    // Project monthly revenue based on current period
    const periodDays = Math.ceil((new Date(period.end).getTime() - new Date(period.start).getTime()) / (24 * 60 * 60 * 1000))
    const dailyAvg = totalRevenueCents / Math.max(periodDays, 1)
    const projectedMonthly = dailyAvg * 30

    return {
      total_revenue_cents: totalRevenueCents,
      total_revenue: centsToDollars(totalRevenueCents),
      order_count: orderCount,
      avg_order_value: orderCount > 0 ? centsToDollars(totalRevenueCents / orderCount) : 0,
      unique_agents: uniqueAgents,
      unique_photographers: uniquePhotographers,
      previous_period_revenue_cents: previousRevenueCents,
      revenue_change_percent: percentChange(totalRevenueCents, previousRevenueCents),
      projected_monthly_revenue: centsToDollars(projectedMonthly),
      ytd_revenue: centsToDollars(ytdRevenueCents),
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get revenue summary')
    throw error
  }
}

/**
 * Get revenue by photographer
 */
export async function getRevenueByPhotographer(
  period: DateRange,
  filters?: ReportFilters
): Promise<RevenueByPhotographer[]> {
  const supabase = createAdminClient()
  const previousPeriod = getPreviousPeriod(period)

  try {
    // Get all paid orders with listing info
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_cents,
        package_key,
        package_name,
        services,
        paid_at,
        listing_id
      `)
      .eq('payment_status', 'succeeded')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end)

    if (error) throw error

    // Get listings with photographer info
    const listingIds = [...new Set(orders?.map(o => o.listing_id).filter((id): id is string => id !== null))]

    const { data: listings } = await supabase
      .from('listings')
      .select('id, photographer_id')
      .in('id', listingIds.length > 0 ? listingIds : ['none'])

    // Get staff info
    const photographerIds = [...new Set(listings?.map(l => l.photographer_id).filter((id): id is string => id !== null))]

    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, email, team_role')
      .in('id', photographerIds.length > 0 ? photographerIds : ['none'])

    // Create lookup maps
    const listingToPhotographer = new Map(listings?.map(l => [l.id, l.photographer_id]))
    const staffMap = new Map(staff?.map(s => [s.id, s]))

    // Aggregate by photographer
    const photographerRevenue: Record<string, {
      photographer_id: string
      total_cents: number
      order_count: number
      job_ids: Set<string>
      by_package: Record<string, number>
      by_service: Record<string, number>
    }> = {}

    for (const order of orders || []) {
      const photographerId = listingToPhotographer.get(order.listing_id) || 'unassigned'

      if (!photographerRevenue[photographerId]) {
        photographerRevenue[photographerId] = {
          photographer_id: photographerId,
          total_cents: 0,
          order_count: 0,
          job_ids: new Set(),
          by_package: {},
          by_service: {},
        }
      }

      const data = photographerRevenue[photographerId]
      data.total_cents += order.total_cents || 0
      data.order_count++
      if (order.listing_id) data.job_ids.add(order.listing_id)

      // Track by package
      const pkg = order.package_key || 'unknown'
      data.by_package[pkg] = (data.by_package[pkg] || 0) + (order.total_cents || 0)

      // Track by service
      const services = order.services as { key?: string; name?: string }[] | null
      if (services) {
        for (const svc of services) {
          const key = svc.key || svc.name || 'unknown'
          data.by_service[key] = (data.by_service[key] || 0) + 1
        }
      }
    }

    // Get previous period for comparison
    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_cents, listing_id')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', previousPeriod.start)
      .lte('paid_at', previousPeriod.end)

    const prevListingIds = [...new Set(prevOrders?.map(o => o.listing_id).filter(Boolean))]
    const { data: prevListings } = await supabase
      .from('listings')
      .select('id, photographer_id')
      .in('id', prevListingIds.length > 0 ? prevListingIds : ['none'])

    const prevListingToPhotographer = new Map(prevListings?.map(l => [l.id, l.photographer_id]))
    const prevPhotographerRevenue: Record<string, number> = {}

    for (const order of prevOrders || []) {
      const photographerId = prevListingToPhotographer.get(order.listing_id) || 'unassigned'
      prevPhotographerRevenue[photographerId] = (prevPhotographerRevenue[photographerId] || 0) + (order.total_cents || 0)
    }

    // Build results
    const results: RevenueByPhotographer[] = []

    for (const [photographerId, data] of Object.entries(photographerRevenue)) {
      const staffInfo = staffMap.get(photographerId)
      const prevRevenue = prevPhotographerRevenue[photographerId] || 0

      results.push({
        photographer_id: photographerId,
        photographer_name: staffInfo?.name || 'Unassigned',
        photographer_email: staffInfo?.email || '',
        team_role: staffInfo?.team_role || 'unknown',
        total_revenue_cents: data.total_cents,
        total_revenue: centsToDollars(data.total_cents),
        order_count: data.order_count,
        job_count: data.job_ids.size,
        avg_order_value: data.order_count > 0 ? centsToDollars(data.total_cents / data.order_count) : 0,
        avg_revenue_per_job: data.job_ids.size > 0 ? centsToDollars(data.total_cents / data.job_ids.size) : 0,
        period_revenue_cents: data.total_cents,
        previous_period_revenue_cents: prevRevenue,
        revenue_change_percent: percentChange(data.total_cents, prevRevenue),
        revenue_by_package: Object.fromEntries(
          Object.entries(data.by_package).map(([k, v]) => [k, centsToDollars(v)])
        ),
        revenue_by_service: data.by_service,
      })
    }

    // Sort by revenue descending
    results.sort((a, b) => b.total_revenue_cents - a.total_revenue_cents)

    return results
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get revenue by photographer')
    throw error
  }
}

/**
 * Get revenue by territory (city/state)
 */
export async function getRevenueByTerritory(
  period: DateRange,
  groupBy: 'city' | 'state' = 'city'
): Promise<RevenueByTerritory[]> {
  const supabase = createAdminClient()

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        total_cents,
        agent_id,
        property_city,
        property_state,
        listing_id
      `)
      .eq('payment_status', 'succeeded')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end)

    if (error) throw error

    // Get listing photographer info
    const listingIds = [...new Set(orders?.map(o => o.listing_id).filter(Boolean))]
    const { data: listings } = await supabase
      .from('listings')
      .select('id, photographer_id')
      .in('id', listingIds.length > 0 ? listingIds : ['none'])

    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')

    const listingToPhotographer = new Map(listings?.map(l => [l.id, l.photographer_id]))
    const staffMap = new Map(staff?.map(s => [s.id, s.name]))

    // Aggregate by territory
    const territoryData: Record<string, {
      revenue_cents: number
      order_count: number
      agents: Set<string>
      photographer_revenue: Record<string, number>
    }> = {}

    for (const order of orders || []) {
      const territory = groupBy === 'city'
        ? `${order.property_city || 'Unknown'}, ${order.property_state || ''}`
        : order.property_state || 'Unknown'

      if (!territoryData[territory]) {
        territoryData[territory] = {
          revenue_cents: 0,
          order_count: 0,
          agents: new Set(),
          photographer_revenue: {},
        }
      }

      const data = territoryData[territory]
      data.revenue_cents += order.total_cents || 0
      data.order_count++
      if (order.agent_id) data.agents.add(order.agent_id)

      const photographerId = listingToPhotographer.get(order.listing_id)
      if (photographerId) {
        data.photographer_revenue[photographerId] =
          (data.photographer_revenue[photographerId] || 0) + (order.total_cents || 0)
      }
    }

    // Build results
    const results: RevenueByTerritory[] = []

    for (const [territory, data] of Object.entries(territoryData)) {
      // Find top photographer
      let topPhotographer: { id: string; name: string; revenue: number } | null = null
      for (const [id, revenue] of Object.entries(data.photographer_revenue)) {
        if (!topPhotographer || revenue > topPhotographer.revenue) {
          topPhotographer = { id, name: staffMap.get(id) || 'Unknown', revenue: centsToDollars(revenue) }
        }
      }

      results.push({
        territory,
        total_revenue_cents: data.revenue_cents,
        total_revenue: centsToDollars(data.revenue_cents),
        order_count: data.order_count,
        unique_agents: data.agents.size,
        avg_order_value: data.order_count > 0 ? centsToDollars(data.revenue_cents / data.order_count) : 0,
        top_photographer: topPhotographer,
      })
    }

    results.sort((a, b) => b.total_revenue_cents - a.total_revenue_cents)

    return results
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get revenue by territory')
    throw error
  }
}

/**
 * Get revenue by package
 */
export async function getRevenueByPackage(period: DateRange): Promise<RevenueByPackage[]> {
  const supabase = createAdminClient()

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_cents, package_key, package_name')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end)

    if (error) throw error

    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0

    // Aggregate by package
    const packageData: Record<string, { name: string; revenue_cents: number; count: number }> = {}

    for (const order of orders || []) {
      const key = order.package_key || 'custom'
      if (!packageData[key]) {
        packageData[key] = { name: order.package_name || key, revenue_cents: 0, count: 0 }
      }
      packageData[key].revenue_cents += order.total_cents || 0
      packageData[key].count++
    }

    const results: RevenueByPackage[] = Object.entries(packageData).map(([key, data]) => ({
      package_key: key,
      package_name: data.name,
      total_revenue_cents: data.revenue_cents,
      total_revenue: centsToDollars(data.revenue_cents),
      order_count: data.count,
      avg_order_value: data.count > 0 ? centsToDollars(data.revenue_cents / data.count) : 0,
      percent_of_total: totalRevenue > 0 ? Math.round((data.revenue_cents / totalRevenue) * 1000) / 10 : 0,
    }))

    results.sort((a, b) => b.total_revenue_cents - a.total_revenue_cents)

    return results
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get revenue by package')
    throw error
  }
}

/**
 * Get monthly revenue trend
 */
export async function getMonthlyRevenueTrend(months: number = 12): Promise<MonthlyRevenue[]> {
  const supabase = createAdminClient()

  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_cents, agent_id, paid_at')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', startDate.toISOString())

    if (error) throw error

    // Group by month
    const monthlyData: Record<string, { revenue_cents: number; count: number; agents: Set<string> }> = {}

    for (const order of orders || []) {
      if (!order.paid_at) continue
      const date = new Date(order.paid_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue_cents: 0, count: 0, agents: new Set() }
      }

      monthlyData[monthKey].revenue_cents += order.total_cents || 0
      monthlyData[monthKey].count++
      if (order.agent_id) monthlyData[monthKey].agents.add(order.agent_id)
    }

    // Build results with proper month names
    const results: MonthlyRevenue[] = Object.entries(monthlyData)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-')
        const date = new Date(parseInt(year), parseInt(monthNum) - 1)
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        return {
          month,
          month_name: monthName,
          revenue_cents: data.revenue_cents,
          revenue: centsToDollars(data.revenue_cents),
          order_count: data.count,
          unique_agents: data.agents.size,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))

    return results
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get monthly revenue trend')
    throw error
  }
}

/**
 * Get daily revenue for a period
 */
export async function getDailyRevenue(period: DateRange): Promise<DailyRevenue[]> {
  const supabase = createAdminClient()

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_cents, paid_at')
      .eq('payment_status', 'succeeded')
      .gte('paid_at', period.start)
      .lte('paid_at', period.end)

    if (error) throw error

    // Group by day
    const dailyData: Record<string, { revenue_cents: number; count: number }> = {}

    for (const order of orders || []) {
      if (!order.paid_at) continue
      const date = order.paid_at.split('T')[0]

      if (!dailyData[date]) {
        dailyData[date] = { revenue_cents: 0, count: 0 }
      }

      dailyData[date].revenue_cents += order.total_cents || 0
      dailyData[date].count++
    }

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        revenue_cents: data.revenue_cents,
        revenue: centsToDollars(data.revenue_cents),
        order_count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to get daily revenue')
    throw error
  }
}

/**
 * Generate full revenue report
 */
export async function generateRevenueReport(
  period: TimePeriod,
  customRange?: DateRange,
  filters?: ReportFilters
): Promise<RevenueReport> {
  const dateRange = getDateRangeFromPeriod(period, customRange)

  const [summary, byPhotographer, byTerritory, byPackage, monthlyTrend, dailyTrend] = await Promise.all([
    getRevenueSummary(dateRange, filters),
    getRevenueByPhotographer(dateRange, filters),
    getRevenueByTerritory(dateRange),
    getRevenueByPackage(dateRange),
    getMonthlyRevenueTrend(12),
    getDailyRevenue(dateRange),
  ])

  return {
    summary,
    by_photographer: byPhotographer,
    by_territory: byTerritory,
    by_package: byPackage,
    by_service: [], // TODO: Implement if needed
    monthly_trend: monthlyTrend,
    daily_trend: dailyTrend,
    period: dateRange,
    generated_at: new Date().toISOString(),
  }
}
