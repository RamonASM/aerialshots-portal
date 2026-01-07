import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStaffAccess } from '@/lib/auth/server-access'
import { notifyStatusUpdate } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    // Check authentication via Clerk (or Supabase fallback)
    const staff = await getStaffAccess()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const body = await request.json()
    const { assignmentId, listingId, type, lat, lng } = body

    if (!assignmentId || !type) {
      return NextResponse.json(
        { error: 'Assignment ID and type are required' },
        { status: 400 }
      )
    }

    // Verify the assignment belongs to this staff member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('photographer_assignments')
      .select('id, photographer_id, status, listing_id')
      .eq('id', assignmentId)
      .maybeSingle() as { data: { id: string; photographer_id: string; status: string; listing_id: string } | null; error: Error | null }

    if (assignmentError) {
      console.error('Assignment lookup error:', assignmentError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    if (assignment.photographer_id !== staff.id) {
      return NextResponse.json(
        { error: 'Not authorized for this assignment' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    if (type === 'checkin') {
      // Check in - start the job
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('photographer_assignments')
        .update({
          status: 'in_progress',
          check_in_time: now,
          check_in_lat: lat,
          check_in_lng: lng,
        })
        .eq('id', assignmentId) as { error: Error | null }

      if (updateError) {
        throw updateError
      }

      // Update listing status
      if (listingId) {
        await supabase
          .from('listings')
          .update({ ops_status: 'in_progress' })
          .eq('id', listingId)

        // Send notification to agent that shoot has started
        try {
          const { data: listing, error: listingFetchError } = await supabase
            .from('listings')
            .select('address, agents(name, email)')
            .eq('id', listingId)
            .maybeSingle()

          if (listingFetchError) {
            console.error('Failed to fetch listing for notification:', listingFetchError)
          } else if (listing) {
            const agent = listing.agents as { name: string; email: string } | null
            if (agent?.email) {
              notifyStatusUpdate(
                { email: agent.email, name: agent.name },
                {
                  agentName: agent.name,
                  listingAddress: listing.address || 'Your property',
                  previousStatus: 'scheduled',
                  newStatus: 'in_progress',
                  message: 'Your photographer has arrived and the shoot is now in progress.',
                }
              ).catch(err => console.error('Notification error:', err))
            }
          }
        } catch (notifyError) {
          console.error('Failed to send check-in notification:', notifyError)
        }
      }

      // Log activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('portal_activity_log').insert({
        staff_id: staff.id,
        activity_type: 'job_check_in',
        entity_type: 'photographer_assignment',
        entity_id: assignmentId,
        details: { lat, lng, listing_id: listingId },
      })

      return NextResponse.json({
        success: true,
        message: 'Checked in successfully',
        status: 'in_progress',
      })
    } else if (type === 'checkout') {
      // Check out - complete the job
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('photographer_assignments')
        .update({
          status: 'completed',
          check_out_time: now,
          check_out_lat: lat,
          check_out_lng: lng,
        })
        .eq('id', assignmentId) as { error: Error | null }

      if (updateError) {
        throw updateError
      }

      // Update listing status to staged (ready for editing)
      if (listingId) {
        await supabase
          .from('listings')
          .update({ ops_status: 'staged' })
          .eq('id', listingId)

        // Send notification to agent that shoot is complete
        try {
          const { data: listing, error: listingFetchError } = await supabase
            .from('listings')
            .select('address, agents(name, email)')
            .eq('id', listingId)
            .maybeSingle()

          if (listingFetchError) {
            console.error('Failed to fetch listing for notification:', listingFetchError)
          } else if (listing) {
            const agent = listing.agents as { name: string; email: string } | null
            if (agent?.email) {
              notifyStatusUpdate(
                { email: agent.email, name: agent.name },
                {
                  agentName: agent.name,
                  listingAddress: listing.address || 'Your property',
                  previousStatus: 'in_progress',
                  newStatus: 'staged',
                  message: 'The photoshoot is complete! Your photos are now being uploaded and will go into editing shortly.',
                }
              ).catch(err => console.error('Notification error:', err))
            }
          }
        } catch (notifyError) {
          console.error('Failed to send check-out notification:', notifyError)
        }
      }

      // Log activity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('portal_activity_log').insert({
        staff_id: staff.id,
        activity_type: 'job_check_out',
        entity_type: 'photographer_assignment',
        entity_id: assignmentId,
        details: { lat, lng, listing_id: listingId },
      })

      return NextResponse.json({
        success: true,
        message: 'Checked out successfully',
        status: 'completed',
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid check-in type' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    )
  }
}
