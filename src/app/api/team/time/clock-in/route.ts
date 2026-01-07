import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess } from '@/lib/auth/server-access'
import { clockIn } from '@/lib/time-tracking/service'
import type { StaffWithPayoutInfo } from '@/lib/supabase/types-custom'

/**
 * POST /api/team/time/clock-in
 * Clock in the current staff member
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

    // Check if staff is hourly
    if (staff.payout_type !== 'hourly') {
      return NextResponse.json(
        { error: 'Time tracking is only available for hourly staff' },
        { status: 400 }
      )
    }

    // Check if hourly rate is configured
    if (!staff.hourly_rate) {
      return NextResponse.json(
        { error: 'Hourly rate not configured. Please contact admin.' },
        { status: 400 }
      )
    }

    // Parse request body for optional notes
    let notes: string | undefined
    try {
      const body = await request.json()
      notes = body.notes
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Clock in
    const result = await clockIn(staff.id, notes)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      entry: result.entry,
    })
  } catch (error) {
    console.error('[Time] Error clocking in:', error)
    return NextResponse.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    )
  }
}
