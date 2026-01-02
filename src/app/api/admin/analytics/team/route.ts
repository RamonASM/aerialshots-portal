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
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get all active staff
    const { data: allStaff } = await supabase
      .from('staff')
      .select('id, name, email, role, phone, is_active, created_at')
      .eq('is_active', true)
      .order('name')

    // Get photographer assignments and completions
    const { data: photographerListings } = await supabase
      .from('listings')
      .select('id, photographer_id, ops_status, created_at, delivered_at, scheduled_at')
      .not('photographer_id', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Build photographer metrics
    const photographerMetrics: Record<string, {
      assigned: number
      delivered: number
      inProgress: number
      avgDeliveryDays: number[]
      thisWeek: number
      lastWeek: number
    }> = {}

    const photographers = allStaff?.filter(s => s.role === 'photographer') || []

    photographers.forEach(p => {
      photographerMetrics[p.id] = {
        assigned: 0,
        delivered: 0,
        inProgress: 0,
        avgDeliveryDays: [],
        thisWeek: 0,
        lastWeek: 0,
      }
    })

    photographerListings?.forEach(listing => {
      const pid = listing.photographer_id
      if (!pid || !photographerMetrics[pid]) return

      photographerMetrics[pid].assigned++

      if (listing.ops_status === 'delivered') {
        photographerMetrics[pid].delivered++

        // Calculate delivery time
        if (listing.scheduled_at && listing.delivered_at) {
          const scheduled = new Date(listing.scheduled_at)
          const delivered = new Date(listing.delivered_at)
          const days = (delivered.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24)
          if (days > 0 && days < 30) {
            photographerMetrics[pid].avgDeliveryDays.push(days)
          }
        }

        // Weekly breakdown
        const deliveredDate = new Date(listing.delivered_at!)
        if (deliveredDate >= sevenDaysAgo) {
          photographerMetrics[pid].thisWeek++
        } else {
          photographerMetrics[pid].lastWeek++
        }
      } else if (['scheduled', 'in_progress', 'uploading'].includes(listing.ops_status || '')) {
        photographerMetrics[pid].inProgress++
      }
    })

    // Build response data for photographers
    const photographerData = photographers.map(p => {
      const metrics = photographerMetrics[p.id]
      const avgDays = metrics.avgDeliveryDays.length > 0
        ? Math.round((metrics.avgDeliveryDays.reduce((a, b) => a + b, 0) / metrics.avgDeliveryDays.length) * 10) / 10
        : null

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: 'photographer',
        stats: {
          assigned: metrics.assigned,
          delivered: metrics.delivered,
          inProgress: metrics.inProgress,
          completionRate: metrics.assigned > 0 ? Math.round((metrics.delivered / metrics.assigned) * 100) : 0,
          avgDeliveryDays: avgDays,
          thisWeek: metrics.thisWeek,
          lastWeek: metrics.lastWeek,
          weeklyChange: metrics.lastWeek > 0
            ? Math.round(((metrics.thisWeek - metrics.lastWeek) / metrics.lastWeek) * 100)
            : 0,
        },
      }
    }).sort((a, b) => b.stats.delivered - a.stats.delivered)

    // Get editor/QC metrics
    const { data: qcEvents } = await supabase
      .from('job_events')
      .select('listing_id, new_value, actor_id, created_at')
      .eq('event_type', 'status_change')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Track QC approvals by staff
    const qcMetrics: Record<string, {
      approved: number
      rejected: number
      thisWeek: number
    }> = {}

    const qcStaff = allStaff?.filter(s => ['qc', 'editor', 'admin'].includes(s.role)) || []

    qcStaff.forEach(s => {
      qcMetrics[s.id] = { approved: 0, rejected: 0, thisWeek: 0 }
    })

    qcEvents?.forEach(event => {
      const actorId = event.actor_id
      const newValue = event.new_value as { ops_status?: string } | null

      if (!actorId || !qcMetrics[actorId]) return

      if (newValue?.ops_status === 'delivered') {
        qcMetrics[actorId].approved++
        if (event.created_at && new Date(event.created_at) >= sevenDaysAgo) {
          qcMetrics[actorId].thisWeek++
        }
      }
    })

    // Build QC staff data
    const qcData = qcStaff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      stats: {
        approved: qcMetrics[s.id].approved,
        rejected: qcMetrics[s.id].rejected,
        thisWeek: qcMetrics[s.id].thisWeek,
        totalReviewed: qcMetrics[s.id].approved + qcMetrics[s.id].rejected,
      },
    })).filter(s => s.stats.totalReviewed > 0).sort((a, b) => b.stats.approved - a.stats.approved)

    // Calculate overall team stats
    const totalDelivered = photographerData.reduce((sum, p) => sum + p.stats.delivered, 0)
    const totalAssigned = photographerData.reduce((sum, p) => sum + p.stats.assigned, 0)
    const avgCompletionRate = photographerData.length > 0
      ? Math.round(photographerData.reduce((sum, p) => sum + p.stats.completionRate, 0) / photographerData.length)
      : 0

    const allDeliveryDays = photographerData
      .filter(p => p.stats.avgDeliveryDays !== null)
      .map(p => p.stats.avgDeliveryDays!)

    const avgTeamDeliveryDays = allDeliveryDays.length > 0
      ? Math.round((allDeliveryDays.reduce((a, b) => a + b, 0) / allDeliveryDays.length) * 10) / 10
      : null

    return NextResponse.json({
      overview: {
        totalStaff: allStaff?.length || 0,
        photographers: photographers.length,
        qcStaff: qcStaff.length,
        totalDelivered,
        totalAssigned,
        avgCompletionRate,
        avgDeliveryDays: avgTeamDeliveryDays,
      },
      photographers: photographerData,
      qcTeam: qcData,
    })
  } catch (error) {
    console.error('Error fetching team analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team analytics' },
      { status: 500 }
    )
  }
}
