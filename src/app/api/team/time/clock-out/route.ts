import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clockOut } from '@/lib/time-tracking/service'

/**
 * POST /api/team/time/clock-out
 * Clock out the current staff member
 */
export async function POST(request: NextRequest) {
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
      .select('id, payout_type')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

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
