import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Note: staff_time_off table will be created by migration 20260111_001_availability_system.sql
// Using type assertions until migration is applied and types are regenerated

/**
 * POST /api/team/photographer/time-off
 * Create a new time off request
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()
    const body = await request.json()
    const { staff_id, start_date, end_date, reason, reason_details } = body

    // Validate required fields
    if (!staff_id || !start_date || !end_date || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      )
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Verify the user is the staff member making the request
    const { data: staff } = await supabase
      .from('staff')
      .select('id, email')
      .eq('id', staff_id)
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found or unauthorized' },
        { status: 403 }
      )
    }

    // Calculate days requested (unused for now, but kept for future balance checking)
    const _daysRequested = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    // Note: Day balance checking will be enabled after migration
    // For now, allow all requests (admin will manage balances manually)

    // Check for overlapping requests
    const { data: overlapping } = await db
      .from('staff_time_off')
      .select('id')
      .eq('staff_id', staff_id)
      .in('status', ['pending', 'approved'])
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`)
      .limit(1)

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'You already have a time off request for this period' },
        { status: 400 }
      )
    }

    // Check for conflicting assignments
    const { data: conflictingAssignments } = await db
      .from('photographer_assignments')
      .select('id, scheduled_date')
      .eq('photographer_id', staff_id)
      .gte('scheduled_date', start_date)
      .lte('scheduled_date', end_date)
      .in('status', ['assigned', 'confirmed'])

    // Create the time off request
    const { data: timeOff, error: insertError } = await db
      .from('staff_time_off')
      .insert({
        staff_id,
        start_date,
        end_date,
        reason,
        reason_details: reason_details || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create time off request:', insertError)
      return NextResponse.json(
        { error: 'Failed to create request' },
        { status: 500 }
      )
    }

    // Include warning about conflicting assignments
    const response: { success: boolean; data: unknown; warning?: string } = {
      success: true,
      data: timeOff,
    }

    if (conflictingAssignments && conflictingAssignments.length > 0) {
      response.warning = `Note: You have ${conflictingAssignments.length} scheduled assignment(s) during this period that may need to be reassigned.`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Time off request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/team/photographer/time-off
 * Get time off requests for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Get staff ID
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Get time off requests
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let query = db
      .from('staff_time_off')
      .select(`
        *,
        reviewer:reviewed_by (name)
      `)
      .eq('staff_id', staff.id)
      .order('start_date', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: timeOffRequests, error } = await query

    if (error) {
      console.error('Failed to fetch time off requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: timeOffRequests,
    })
  } catch (error) {
    console.error('Get time off error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/team/photographer/time-off
 * Cancel a pending time off request
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Verify staff and ownership
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Cancel the request (only if pending)
    const { data: updated, error: updateError } = await db
      .from('staff_time_off')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('staff_id', staff.id)
      .eq('status', 'pending')
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Request not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Request cancelled successfully',
    })
  } catch (error) {
    console.error('Cancel time off error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
