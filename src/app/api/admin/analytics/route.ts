import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Time periods
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Overview stats
    const [
      { count: totalListings },
      { count: activeAgents },
      { count: totalStaff },
      { count: deliveredThisMonth },
      { count: deliveredLastMonth },
      { count: deliveredThisWeek },
      { count: deliveredToday },
    ] = await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('ops_status', 'delivered')
        .gte('delivered_at', thisMonthStart.toISOString()),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('ops_status', 'delivered')
        .gte('delivered_at', lastMonthStart.toISOString())
        .lt('delivered_at', lastMonthEnd.toISOString()),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('ops_status', 'delivered')
        .gte('delivered_at', thisWeekStart.toISOString()),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('ops_status', 'delivered')
        .gte('delivered_at', today.toISOString()),
    ])

    // Jobs by status
    const { data: statusCounts } = await supabase
      .from('listings')
      .select('ops_status')

    const jobsByStatus: Record<string, number> = {}
    statusCounts?.forEach(listing => {
      const status = listing.ops_status || 'unknown'
      jobsByStatus[status] = (jobsByStatus[status] || 0) + 1
    })

    // Team performance - photographers
    const { data: photographerStats } = await supabase
      .from('listings')
      .select('photographer_id, ops_status, delivered_at')
      .not('photographer_id', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const photographerMetrics: Record<string, {
      total: number
      delivered: number
      inProgress: number
    }> = {}

    photographerStats?.forEach(listing => {
      const id = listing.photographer_id
      if (!id) return

      if (!photographerMetrics[id]) {
        photographerMetrics[id] = { total: 0, delivered: 0, inProgress: 0 }
      }

      photographerMetrics[id].total++
      if (listing.ops_status === 'delivered') {
        photographerMetrics[id].delivered++
      } else if (['scheduled', 'in_progress', 'uploading'].includes(listing.ops_status || '')) {
        photographerMetrics[id].inProgress++
      }
    })

    // Get photographer names
    const photographerIds = Object.keys(photographerMetrics)
    const { data: photographers } = photographerIds.length > 0
      ? await supabase.from('staff').select('id, name').in('id', photographerIds)
      : { data: [] }

    const teamPerformance = photographerIds.map(id => ({
      id,
      name: photographers?.find(p => p.id === id)?.name || 'Unknown',
      ...photographerMetrics[id],
      completionRate: photographerMetrics[id].total > 0
        ? Math.round((photographerMetrics[id].delivered / photographerMetrics[id].total) * 100)
        : 0,
    })).sort((a, b) => b.delivered - a.delivered)

    // Revenue metrics - unavailable (requires orders table with prices)
    // Returns 0 to indicate no data rather than fabricated estimates
    const revenueThisMonth = 0
    const revenueLastMonth = 0
    const agentOrderCounts: Record<string, number> = {}

    // Count listings by agent as a proxy for orders
    const { data: recentListings } = await supabase
      .from('listings')
      .select('agent_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    recentListings?.forEach(listing => {
      if (listing.agent_id) {
        agentOrderCounts[listing.agent_id] = (agentOrderCounts[listing.agent_id] || 0) + 1
      }
    })

    const topAgentIds = Object.entries(agentOrderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    const { data: topAgentsData } = topAgentIds.length > 0
      ? await supabase.from('agents').select('id, name').in('id', topAgentIds)
      : { data: [] }

    const topAgents = topAgentIds.map(id => ({
      id,
      name: topAgentsData?.find(a => a.id === id)?.name || 'Unknown',
      orderCount: agentOrderCounts[id],
    }))

    // Daily deliveries for the last 14 days
    const dailyDeliveries: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('ops_status', 'delivered')
        .gte('delivered_at', date.toISOString())
        .lt('delivered_at', nextDay.toISOString())

      dailyDeliveries.push({
        date: date.toISOString().split('T')[0],
        count: count || 0,
      })
    }

    // Integration success rates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrationData } = await (supabase as any)
      .from('listings')
      .select('cubicasa_status, zillow_3d_status')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const integrationStats = {
      cubicasa: { total: 0, delivered: 0, failed: 0 },
      zillow_3d: { total: 0, delivered: 0, failed: 0 },
    }

    integrationData?.forEach((listing: { cubicasa_status?: string | null; zillow_3d_status?: string | null }) => {
      if (listing.cubicasa_status && listing.cubicasa_status !== 'not_applicable') {
        integrationStats.cubicasa.total++
        if (listing.cubicasa_status === 'delivered') integrationStats.cubicasa.delivered++
        if (listing.cubicasa_status === 'failed') integrationStats.cubicasa.failed++
      }
      if (listing.zillow_3d_status && listing.zillow_3d_status !== 'not_applicable') {
        integrationStats.zillow_3d.total++
        if (listing.zillow_3d_status === 'live') integrationStats.zillow_3d.delivered++
        if (listing.zillow_3d_status === 'failed') integrationStats.zillow_3d.failed++
      }
    })

    // Calculate month-over-month changes
    const deliveryChange = deliveredLastMonth && deliveredLastMonth > 0
      ? Math.round(((deliveredThisMonth || 0) - deliveredLastMonth) / deliveredLastMonth * 100)
      : 0

    const revenueChange = revenueLastMonth > 0
      ? Math.round((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100)
      : 0

    return NextResponse.json({
      overview: {
        totalListings: totalListings || 0,
        activeAgents: activeAgents || 0,
        totalStaff: totalStaff || 0,
        deliveredThisMonth: deliveredThisMonth || 0,
        deliveredLastMonth: deliveredLastMonth || 0,
        deliveredThisWeek: deliveredThisWeek || 0,
        deliveredToday: deliveredToday || 0,
        deliveryChange,
        revenueThisMonth,
        revenueLastMonth,
        revenueChange,
      },
      jobsByStatus,
      teamPerformance,
      topAgents,
      dailyDeliveries,
      integrationStats,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
