import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'
import { clockOut } from '@/lib/time-tracking/service'
import type { StaffWithPayoutInfo } from '@/lib/supabase/types-custom'

/**
 * POST /api/team/time/clock-out
 * Clock out the current staff member
 */
export async function POST(request: NextRequest) {
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
      .select('id, payout_type')
      .eq('id', staffAccess.id)
      .maybeSingle() as { data: Pick<StaffWithPayoutInfo, 'id' | 'payout_type'> | null; error: Error | null }

    if (staffError) {
      console.error('[Time] Staff lookup error:', staffError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if staff is hourly
    if (staff.payout_type !== 'hourly') {
      return NextResponse.json(
        { error: 'Time tracking is only available for hourly staff' },
        { status: 400 }
      )
    }

    // Parse request body
    let entryId: string | undefined
    let breakMinutes: number = 0
    try {
      const body = await request.json()
      entryId = body.entryId
      breakMinutes = body.breakMinutes || 0
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Clock out
    const result = await clockOut(staff.id, entryId, breakMinutes)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      entry: result.entry,
      duration_minutes: result.duration_minutes,
      total_pay_cents: result.total_pay_cents,
    })
  } catch (error) {
    console.error('[Time] Error clocking out:', error)
    return NextResponse.json(
      { error: 'Failed to clock out' },
      { status: 500 }
    )
  }
}
