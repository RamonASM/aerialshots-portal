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
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts by status
    const { data: readyForQC, count: readyForQCCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc')

    const { data: inProgress, count: inProgressCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'in_qc')

    // Get delivered count for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { count: deliveredTodayCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'delivered')
      .gte('delivered_at', today.toISOString())
      .lt('delivered_at', tomorrow.toISOString())

    // Get photographer workload
    const { data: workloadData } = await supabase
      .from('listings')
      .select('photographer_id')
      .in('ops_status', ['ready_for_qc', 'in_qc'])

    // Count jobs by photographer
    const workloadByPhotographer: Record<string, number> = {}
    workloadData?.forEach(listing => {
      if (listing.photographer_id) {
        workloadByPhotographer[listing.photographer_id] =
          (workloadByPhotographer[listing.photographer_id] || 0) + 1
      }
    })

    // Get photographer names
    const photographerIds = Object.keys(workloadByPhotographer)
    const { data: photographers } = photographerIds.length > 0
      ? await supabase
          .from('staff')
          .select('id, name')
          .in('id', photographerIds)
      : { data: [] }

    const photographerWorkload = photographerIds
      .map(id => ({
        id,
        name: photographers?.find(p => p.id === id)?.name || 'Unknown',
        jobCount: workloadByPhotographer[id],
      }))
      .sort((a, b) => b.jobCount - a.jobCount)

    // Calculate average QC time from job_events table
    // Find pairs of 'status_change' events: ready_for_qc -> delivered
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: qcEvents } = await supabase
      .from('job_events')
      .select('listing_id, event_type, new_value, created_at')
      .eq('event_type', 'status_change')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Calculate QC time for each listing
    const qcTimes: number[] = []
    const listingQCStart: Record<string, Date> = {}

    qcEvents?.forEach(event => {
      if (!event.listing_id || !event.created_at) return

      const newValue = event.new_value as { ops_status?: string } | null
      if (newValue?.ops_status === 'in_qc' || newValue?.ops_status === 'ready_for_qc') {
        // QC started
        listingQCStart[event.listing_id] = new Date(event.created_at)
      } else if (newValue?.ops_status === 'delivered' && listingQCStart[event.listing_id]) {
        // QC completed - calculate duration
        const startTime = listingQCStart[event.listing_id]
        const endTime = new Date(event.created_at)
        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)

        // Only count reasonable QC times (1 minute to 8 hours)
        if (durationMinutes >= 1 && durationMinutes <= 480) {
          qcTimes.push(durationMinutes)
        }
        delete listingQCStart[event.listing_id]
      }
    })

    // Calculate average QC time
    const avgQCTimeMinutes = qcTimes.length > 0
      ? Math.round((qcTimes.reduce((a, b) => a + b, 0) / qcTimes.length) * 10) / 10
      : null // Return null if no data available

    // Calculate additional metrics
    const { count: totalDeliveredThisMonth } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'delivered')
      .gte('delivered_at', thirtyDaysAgo.toISOString())

    // Get stage duration metrics
    const { data: stageEvents } = await supabase
      .from('job_events')
      .select('listing_id, new_value, created_at')
      .eq('event_type', 'status_change')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('listing_id')
      .order('created_at', { ascending: true })

    // Calculate average time per stage
    const stageDurations: Record<string, number[]> = {
      scheduled: [],
      in_progress: [],
      uploading: [],
      editing: [],
      ready_for_qc: [],
      in_qc: [],
    }

    const listingStageStart: Record<string, { stage: string; time: Date }> = {}

    stageEvents?.forEach(event => {
      const newValue = event.new_value as { ops_status?: string } | null
      const newStage = newValue?.ops_status
      if (!newStage || !event.listing_id || !event.created_at) return

      const listingId = event.listing_id
      const eventTime = new Date(event.created_at)

      // If we have a previous stage, calculate its duration
      if (listingStageStart[listingId]) {
        const prevStage = listingStageStart[listingId].stage
        const prevTime = listingStageStart[listingId].time
        const durationMinutes = (eventTime.getTime() - prevTime.getTime()) / (1000 * 60)

        // Only count reasonable durations (under 7 days)
        if (durationMinutes > 0 && durationMinutes < 10080 && stageDurations[prevStage]) {
          stageDurations[prevStage].push(durationMinutes)
        }
      }

      // Set the new stage start
      listingStageStart[listingId] = { stage: newStage, time: eventTime }
    })

    // Calculate averages for each stage
    const avgStageDurations: Record<string, number | null> = {}
    for (const [stage, durations] of Object.entries(stageDurations)) {
      avgStageDurations[stage] = durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
        : null
    }

    return NextResponse.json({
      readyForQC: readyForQCCount || 0,
      inProgress: inProgressCount || 0,
      deliveredToday: deliveredTodayCount || 0,
      deliveredThisMonth: totalDeliveredThisMonth || 0,
      avgQCTimeMinutes,
      qcSampleSize: qcTimes.length,
      avgStageDurations,
      photographerWorkload,
    })
  } catch (error) {
    console.error('Error fetching QC stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
