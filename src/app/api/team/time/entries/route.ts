import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTimeEntries, getTodaySummary, getCurrentPayPeriod, getTimesheetForPeriod } from '@/lib/time-tracking/service'

/**
 * GET /api/team/time/entries
 * Get time entries for the current staff member
 *
 * Query params:
 * - view: 'today' | 'week' | 'period' | 'all' (default: 'today')
 * - periodId: specific pay period ID (when view='period')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff record
    const { data: staff } = await supabase
      .from('staff')
      .select('id, payout_type, hourly_rate')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'today'
    const periodId = searchParams.get('periodId')

    if (view === 'today') {
      const summary = await getTodaySummary(staff.id)
      return NextResponse.json({
        view: 'today',
        ...summary,
        hourlyRate: staff.hourly_rate,
      })
    }

    if (view === 'period' && periodId) {
      const { entries, totalMinutes, totalPayCents } = await getTimesheetForPeriod(staff.id, periodId)
      return NextResponse.json({
        view: 'period',
        periodId,
        entries,
        totalMinutes,
        totalPayCents,
        totalHours: totalMinutes / 60,
      })
    }

    if (view === 'week') {
      // Get start of week (Monday)
      const today = new Date()
      const dayOfWeek = today.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + mondayOffset)
      weekStart.setHours(0, 0, 0, 0)

      const entries = await getTimeEntries(staff.id, weekStart.toISOString())
      const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
      const totalPayCents = entries.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0)

      return NextResponse.json({
        view: 'week',
        weekStart: weekStart.toISOString(),
        entries,
        totalMinutes,
        totalPayCents,
        totalHours: totalMinutes / 60,
      })
    }

    // Default: all recent entries
    const entries = await getTimeEntries(staff.id)
    return NextResponse.json({
      view: 'all',
      entries,
    })
  } catch (error) {
    console.error('[Time] Error getting entries:', error)
    return NextResponse.json(
      { error: 'Failed to get time entries' },
      { status: 500 }
    )
  }
}
