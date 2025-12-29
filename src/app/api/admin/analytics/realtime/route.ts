import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get orders today
    const { count: ordersToday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)

    // Get orders yesterday (for comparison)
    const { count: ordersYesterday } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${yesterday}T00:00:00`)
      .lt('created_at', `${today}T00:00:00`)

    // Get revenue today
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_cents')
      .gte('created_at', `${today}T00:00:00`)

    const revenueToday = revenueData?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0

    // Get revenue yesterday
    const { data: revenueYesterday } = await supabase
      .from('orders')
      .select('total_cents')
      .gte('created_at', `${yesterday}T00:00:00`)
      .lt('created_at', `${today}T00:00:00`)

    const revenuePrev = revenueYesterday?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0

    // Get active shoots (in_progress or shooting status)
    const { count: activeShoots } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .in('ops_status', ['in_progress', 'uploading'])

    // Get pending QC
    const { count: pendingQC } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc')

    // Get leads today
    const { count: leadsToday } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)

    // Get leads yesterday
    const { count: leadsYesterday } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${yesterday}T00:00:00`)
      .lt('created_at', `${today}T00:00:00`)

    // Get active jobs with details
    const { data: activeJobs } = await supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        ops_status,
        scheduled_at,
        photographer:staff(name)
      `)
      .in('ops_status', ['in_progress', 'uploading', 'editing'])
      .order('scheduled_at', { ascending: true })
      .limit(10)

    // Get recent activity
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, created_at, listing:listings(address)')
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentDeliveries } = await supabase
      .from('listings')
      .select('id, address, delivered_at')
      .eq('ops_status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(5)

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, name, created_at, listing:listings(address)')
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate changes
    const ordersTodayChange = ordersYesterday && ordersYesterday > 0
      ? Math.round(((ordersToday || 0) - ordersYesterday) / ordersYesterday * 100)
      : 0

    const revenueTodayChange = revenuePrev > 0
      ? Math.round((revenueToday - revenuePrev) / revenuePrev * 100)
      : 0

    const leadsTodayChange = leadsYesterday && leadsYesterday > 0
      ? Math.round(((leadsToday || 0) - leadsYesterday) / leadsYesterday * 100)
      : 0

    // Combine recent activities
    const activities = [
      ...(recentOrders?.map(o => ({
        id: o.id,
        type: 'order' as const,
        message: `New order: ${(o.listing as { address?: string })?.address || 'Unknown'}`,
        timestamp: o.created_at,
      })) || []),
      ...(recentDeliveries?.map(d => ({
        id: d.id,
        type: 'delivery' as const,
        message: `Delivered: ${d.address}`,
        timestamp: d.delivered_at || '',
      })) || []),
      ...(recentLeads?.map(l => ({
        id: l.id,
        type: 'lead' as const,
        message: `New lead: ${l.name} for ${(l.listing as { address?: string })?.address || 'Unknown'}`,
        timestamp: l.created_at,
      })) || []),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)

    // Format active jobs
    const formattedJobs = activeJobs?.map(job => ({
      id: job.id,
      address: job.address,
      city: job.city,
      status: job.ops_status,
      photographer: (job.photographer as { name?: string })?.name || 'Unassigned',
      startedAt: job.scheduled_at || '',
      estimatedCompletion: 'TBD',
    })) || []

    return NextResponse.json({
      metrics: {
        ordersToday: ordersToday || 0,
        ordersTodayChange,
        revenueToday: Math.round(revenueToday / 100),
        revenueTodayChange,
        activeShoots: activeShoots || 0,
        pendingQC: pendingQC || 0,
        leadsToday: leadsToday || 0,
        leadsTodayChange,
        avgQCTime: 45, // Placeholder - would calculate from actual data
        avgDeliveryTime: 1440, // 24 hours in minutes - placeholder
        lastUpdated: now.toISOString(),
      },
      activities,
      activeJobs: formattedJobs,
    })
  } catch (error) {
    console.error('Error fetching realtime analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
