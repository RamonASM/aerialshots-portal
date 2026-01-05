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
      .eq('auth_user_id', user.id)
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

    // Calculate totals - counts only (revenue requires orders table with prices)
    const totalListings = listings?.length || 0
    // Revenue data unavailable - requires orders table with line items
    const totalRevenue = null

    // This month's jobs
    const thisMonthListings = (listings || []).filter(
      (l) => l.created_at && new Date(l.created_at) >= thisMonthStart
    )
    const revenueThisMonth = null // No data - requires orders table

    // Last month's jobs
    const lastMonthListings = (listings || []).filter((l) => {
      if (!l.created_at) return false
      const date = new Date(l.created_at)
      return date >= lastMonthStart && date <= lastMonthEnd
    })
    const revenueLastMonth = null // No data - requires orders table

    // Growth unavailable without revenue data
    const revenueGrowth = null

    // Jobs by photographer (revenue unavailable without orders)
    const photographerJobs = new Map<string, number>()
    for (const listing of listings || []) {
      if (!listing.photographer_id) continue
      const current = photographerJobs.get(listing.photographer_id) || 0
      photographerJobs.set(listing.photographer_id, current + 1)
    }

    const revenueByPhotographer = Array.from(photographerJobs.entries())
      .map(([id, jobs]) => ({
        id,
        name: photographerMap.get(id) || 'Unknown',
        revenue: null, // No data - requires orders table
        jobs,
        avgPerJob: null, // No data - requires orders table
      }))
      .sort((a, b) => b.jobs - a.jobs)

    // Jobs by month (revenue unavailable without orders)
    const monthlyJobs = new Map<string, number>()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Initialize all months
    for (const month of months) {
      monthlyJobs.set(month, 0)
    }

    for (const listing of listings || []) {
      if (!listing.created_at) continue
      const date = new Date(listing.created_at)
      const monthName = months[date.getMonth()]
      const current = monthlyJobs.get(monthName) || 0
      monthlyJobs.set(monthName, current + 1)
    }

    const revenueByMonth = months.map((month) => ({
      month,
      jobs: monthlyJobs.get(month) || 0,
      revenue: null, // No data - requires orders table
    }))

    // Top agents by job count (spend unavailable without orders)
    const agentJobs = new Map<string, number>()
    for (const listing of listings || []) {
      if (!listing.agent_id) continue
      const current = agentJobs.get(listing.agent_id) || 0
      agentJobs.set(listing.agent_id, current + 1)
    }

    const topAgents = Array.from(agentJobs.entries())
      .map(([id, orderCount]) => ({
        id,
        name: agentMap.get(id)?.name || 'Unknown',
        company: agentMap.get(id)?.company || '',
        orderCount,
        totalSpend: null, // No data - requires orders table
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10)

    // Revenue by service - unavailable (requires order_items table)
    const revenueByService = null

    // Calculate metrics (jobs only, revenue unavailable)
    const averageOrderValue = null // No data - requires orders table
    const monthsElapsed = now.getMonth() + 1
    const averageJobsPerMonth = monthsElapsed > 0 ? totalListings / monthsElapsed : 0

    // Projected revenue unavailable without real revenue data
    const projectedMonthlyRevenue = null // No data - requires orders table

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
