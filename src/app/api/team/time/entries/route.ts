import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'
import { getTimeEntries, getTodaySummary, getTimesheetForPeriod } from '@/lib/time-tracking/service'
import type { StaffWithPayoutInfo } from '@/lib/supabase/types-custom'

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
    // Check authentication via Clerk (or Supabase fallback)
    const staffAccess = await getStaffAccess()

    if (!staffAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get staff record with payout info
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staff, error: staffError } = await (supabase as any)
      .from('staff')
      .select('id, payout_type, hourly_rate')
      .eq('id', staffAccess.id)
      .maybeSingle() as { data: Pick<StaffWithPayoutInfo, 'id' | 'payout_type' | 'hourly_rate'> | null; error: Error | null }

    if (staffError) {
      console.error('[Time] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

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
