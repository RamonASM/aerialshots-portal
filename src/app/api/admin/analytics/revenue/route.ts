import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/analytics/revenue - Get revenue analytics
export async function GET(request: Request) {
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
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse year parameter
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const adminSupabase = createAdminClient()

    // Date ranges
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get all listings for the year with photographer info
    const { data: listings } = await adminSupabase
      .from('listings')
      .select('id, photographer_id, agent_id, city, created_at, ops_status')
      .gte('created_at', yearStart.toISOString())
      .lt('created_at', yearEnd.toISOString())

    // Get photographer names
    const photographerIds = [
      ...new Set(
        (listings || [])
          .map((l) => l.photographer_id)
          .filter((id): id is string => id !== null && id !== undefined)
      ),
    ]
    const { data: photographers } = photographerIds.length > 0
      ? await adminSupabase.from('staff').select('id, name').in('id', photographerIds)
      : { data: [] }

    const photographerMap = new Map(
      (photographers || []).map((p) => [p.id, p.name])
    )

    // Get agent names and company
    const agentIds = [
      ...new Set(
        (listings || [])
          .map((l) => l.agent_id)
          .filter((id): id is string => id !== null && id !== undefined)
      ),
    ]
    const { data: agents } = agentIds.length > 0
      ? await adminSupabase.from('agents').select('id, name').in('id', agentIds)
      : { data: [] }

    const agentMap = new Map(
      (agents || []).map((a) => [a.id, { name: a.name, company: '' }])
    )

    // Average job value estimate (would come from orders in production)
    const AVG_JOB_VALUE = 400

    // Calculate totals
    const totalListings = listings?.length || 0
    const totalRevenue = totalListings * AVG_JOB_VALUE

    // This month's revenue
    const thisMonthListings = (listings || []).filter(
      (l) => new Date(l.created_at) >= thisMonthStart
    )
    const revenueThisMonth = thisMonthListings.length * AVG_JOB_VALUE

    // Last month's revenue
    const lastMonthListings = (listings || []).filter((l) => {
      const date = new Date(l.created_at)
      return date >= lastMonthStart && date <= lastMonthEnd
    })
    const revenueLastMonth = lastMonthListings.length * AVG_JOB_VALUE

    // Calculate growth
    const revenueGrowth = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0

    // Revenue by photographer
    const photographerRevenue = new Map<
      string,
      { jobs: number; revenue: number }
    >()
    for (const listing of listings || []) {
      if (!listing.photographer_id) continue
      const current = photographerRevenue.get(listing.photographer_id) || {
        jobs: 0,
        revenue: 0,
      }
      current.jobs++
      current.revenue += AVG_JOB_VALUE
      photographerRevenue.set(listing.photographer_id, current)
    }

    const revenueByPhotographer = Array.from(photographerRevenue.entries())
      .map(([id, data]) => ({
        id,
        name: photographerMap.get(id) || 'Unknown',
        revenue: data.revenue,
        jobs: data.jobs,
        avgPerJob: data.jobs > 0 ? data.revenue / data.jobs : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Revenue by month
    const monthlyRevenue = new Map<string, { revenue: number; jobs: number }>()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Initialize all months
    for (const month of months) {
      monthlyRevenue.set(month, { revenue: 0, jobs: 0 })
    }

    for (const listing of listings || []) {
      const date = new Date(listing.created_at)
      const monthName = months[date.getMonth()]
      const current = monthlyRevenue.get(monthName)!
      current.jobs++
      current.revenue += AVG_JOB_VALUE
    }

    const revenueByMonth = months.map((month) => ({
      month,
      ...monthlyRevenue.get(month)!,
    }))

    // Top agents by spend
    const agentSpend = new Map<string, { orderCount: number; totalSpend: number }>()
    for (const listing of listings || []) {
      if (!listing.agent_id) continue
      const current = agentSpend.get(listing.agent_id) || {
        orderCount: 0,
        totalSpend: 0,
      }
      current.orderCount++
      current.totalSpend += AVG_JOB_VALUE
      agentSpend.set(listing.agent_id, current)
    }

    const topAgents = Array.from(agentSpend.entries())
      .map(([id, data]) => ({
        id,
        name: agentMap.get(id)?.name || 'Unknown',
        company: agentMap.get(id)?.company || '',
        ...data,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10)

    // Revenue by service (placeholder - would need order_items)
    const revenueByService = [
      { service: 'Photography', revenue: Math.round(totalRevenue * 0.45), count: Math.round(totalListings * 0.9) },
      { service: 'Drone/Aerial', revenue: Math.round(totalRevenue * 0.2), count: Math.round(totalListings * 0.6) },
      { service: 'Video', revenue: Math.round(totalRevenue * 0.15), count: Math.round(totalListings * 0.3) },
      { service: '3D Tours', revenue: Math.round(totalRevenue * 0.1), count: Math.round(totalListings * 0.25) },
      { service: 'Floor Plans', revenue: Math.round(totalRevenue * 0.05), count: Math.round(totalListings * 0.2) },
      { service: 'Other', revenue: Math.round(totalRevenue * 0.05), count: Math.round(totalListings * 0.1) },
    ]

    // Calculate metrics
    const averageOrderValue = totalListings > 0 ? totalRevenue / totalListings : 0
    const monthsElapsed = now.getMonth() + 1
    const averageJobsPerMonth = monthsElapsed > 0 ? totalListings / monthsElapsed : 0

    // Project based on current month's pace
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysElapsed = now.getDate()
    const projectedMonthlyRevenue = daysElapsed > 0
      ? (revenueThisMonth / daysElapsed) * daysInMonth
      : 0

    return NextResponse.json({
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      revenueGrowth,
      revenueByPhotographer,
      revenueByService,
      revenueByMonth,
      topAgents,
      averageOrderValue,
      averageJobsPerMonth,
      projectedMonthlyRevenue,
    })
  } catch (error) {
    console.error('Revenue analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
