import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/time/periods/[id]/timesheets
 * Get all timesheets for a pay period (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff (admin)
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pay period
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: period, error: periodError } = await (supabase as any)
      .from('pay_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: 'Pay period not found' }, { status: 404 })
    }

    // Get all time entries for this period
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entries, error: entriesError } = await (supabase as any)
      .from('time_entries')
      .select(`
        *,
        staff:staff_id (
          id,
          name,
          email,
          hourly_rate
        )
      `)
      .gte('clock_in', period.start_date)
      .lte('clock_in', period.end_date + 'T23:59:59.999Z')
      .order('clock_in', { ascending: true })

    if (entriesError) {
      throw entriesError
    }

    // Group by staff member
    const staffTimesheets: Record<string, {
      staffId: string
      staffName: string
      staffEmail: string
      hourlyRate: number
      entries: typeof entries
      totalMinutes: number
      totalPayCents: number
    }> = {}

    for (const entry of entries || []) {
      const staffInfo = entry.staff as { id: string; name: string; email: string; hourly_rate: number } | null
      if (!staffInfo) continue

      if (!staffTimesheets[staffInfo.id]) {
        staffTimesheets[staffInfo.id] = {
          staffId: staffInfo.id,
          staffName: staffInfo.name,
          staffEmail: staffInfo.email,
          hourlyRate: staffInfo.hourly_rate,
          entries: [],
          totalMinutes: 0,
          totalPayCents: 0,
        }
      }

      staffTimesheets[staffInfo.id].entries.push(entry)
      staffTimesheets[staffInfo.id].totalMinutes += entry.duration_minutes || 0
      staffTimesheets[staffInfo.id].totalPayCents += entry.total_pay_cents || 0
    }

    return NextResponse.json({
      period,
      timesheets: Object.values(staffTimesheets),
      totalEntries: entries?.length || 0,
    })
  } catch (error) {
    console.error('[Admin Time] Error getting timesheets:', error)
    return NextResponse.json(
      { error: 'Failed to get timesheets' },
      { status: 500 }
    )
  }
}
