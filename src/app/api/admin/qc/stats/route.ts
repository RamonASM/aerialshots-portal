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
    const { data: readyForQC } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'ready_for_qc')

    const { data: inProgress } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('ops_status', 'in_qc')

    // Get delivered count for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: deliveredToday } = await supabase
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

    // Calculate average QC time (simplified - would need job_events table for accurate tracking)
    // For now, we'll return a placeholder
    const avgQCTimeMinutes = 4.2

    return NextResponse.json({
      readyForQC: readyForQC?.length || 0,
      inProgress: inProgress?.length || 0,
      deliveredToday: deliveredToday?.length || 0,
      avgQCTimeMinutes,
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
