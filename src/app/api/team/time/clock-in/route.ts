import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { clockIn } from '@/lib/time-tracking/service'

/**
 * POST /api/team/time/clock-in
 * Clock in the current staff member
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
      .select('id, payout_type, hourly_rate')
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
