import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Note: staff_time_off table will be created by migration 20260111_001_availability_system.sql
// Using type assertions until migration is applied and types are regenerated

/**
 * GET /api/admin/team/time-off
 * Get all time off requests (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()
    const supabase = createAdminClient()

    // Verify admin access
    const { data: admin } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', email)
      .eq('is_active', true)
      .in('role', ['admin', 'owner'])
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const staffId = searchParams.get('staff_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    let query = db
      .from('staff_time_off')
      .select(`
        *,
        staff:staff_id (
          name,
          email,
          team_role
        ),
        reviewer:reviewed_by (
          name
        )
      `)
      .order('requested_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (staffId) {
      query = query.eq('staff_id', staffId)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Failed to fetch time off requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    })
  } catch (error) {
    console.error('Admin get time off error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/team/time-off
 * Approve or reject a time off request
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.emailAddresses[0].emailAddress.toLowerCase()
    const body = await request.json()
    const { request_id, action, review_notes } = body

    if (!request_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Verify admin access
    const { data: admin } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', email)
      .eq('is_active', true)
      .in('role', ['admin', 'owner'])
      .maybeSingle()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get the request to verify it's pending
    const { data: timeOffRequest } = await db
      .from('staff_time_off')
      .select('id, status')
      .eq('id', request_id)
      .single()

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    if (timeOffRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    // Update the request
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data: updated, error: updateError } = await db
      .from('staff_time_off')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        review_notes: review_notes || null,
      })
      .eq('id', request_id)
      .select(`
        *,
        staff:staff_id (
          name,
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Failed to update time off request:', updateError)
      return NextResponse.json(
        { error: 'Failed to update request' },
        { status: 500 }
      )
    }

    // TODO: Send notification to staff member about the decision

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Request ${newStatus} successfully`,
    })
  } catch (error) {
    console.error('Admin review time off error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
