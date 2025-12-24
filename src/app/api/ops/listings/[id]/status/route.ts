import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyQCComplete, notifyStatusUpdate } from '@/lib/notifications'

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['scheduled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['staged', 'cancelled'],
  staged: ['awaiting_editing', 'processing'],
  awaiting_editing: ['in_editing'],
  in_editing: ['ready_for_qc', 'awaiting_editing'], // Can go back if issues
  processing: ['ready_for_qc'],
  ready_for_qc: ['in_qc'],
  in_qc: ['delivered', 'in_editing'], // Can go back if edits needed
  delivered: [],
  cancelled: [],
  on_hold: ['scheduled', 'in_progress', 'staged', 'awaiting_editing', 'in_editing', 'ready_for_qc'],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is staff
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
    }

    const body = await request.json()
    const { status, notes, editorId } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Get current listing with agent info for notifications
    const { data: listingData, error: fetchError } = await supabase
      .from('listings')
      .select(`
        ops_status,
        address,
        agent_id,
        agents (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !listingData) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Type assertion for fields that may not be in generated types yet
    const listing = listingData as {
      ops_status: string
      address: string
      agent_id: string
      editor_id?: string | null
      agents: { id: string; name: string; email: string; phone?: string } | null
    }

    // Validate transition (admins can skip validation)
    if (staff.role !== 'admin') {
      const allowedTransitions = VALID_TRANSITIONS[listing.ops_status] || []
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${listing.ops_status} to ${status}` },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      ops_status: status,
    }

    // Set timestamps based on status
    if (status === 'in_editing') {
      updateData.editing_started_at = new Date().toISOString()
      if (editorId) {
        updateData.editor_id = editorId
      } else if (!listing.editor_id) {
        updateData.editor_id = staff.id // Assign current user if no editor set
      }
    }

    if (status === 'ready_for_qc' && listing.ops_status === 'in_editing') {
      updateData.editing_completed_at = new Date().toISOString()
    }

    if (status === 'staged') {
      updateData.staged_at = new Date().toISOString()
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Update listing
    const { error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Status update error:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Log activity (commented until migration is applied)
    // TODO: Uncomment after running 20241224_010_editor_workflow.sql migration
    // await supabase.from('ops_activity_log').insert({
    //   listing_id: id,
    //   actor_id: staff.id,
    //   actor_type: 'staff',
    //   action: 'status_change',
    //   details: {
    //     from: listing.ops_status,
    //     to: status,
    //     notes: notes || null,
    //   },
    // })

    // Send notifications based on status change
    if (listing.agents) {
      const agent = listing.agents

      // Notify agent when delivery is complete
      if (status === 'delivered') {
        const deliveryUrl = `https://portal.aerialshots.media/delivery/${id}`

        // Get asset counts for the notification
        const { data: assets } = await supabase
          .from('media_assets')
          .select('type')
          .eq('listing_id', id)

        const assetSummary = {
          photos: assets?.filter(a => a.type === 'photo').length || 0,
          videos: assets?.filter(a => a.type === 'video').length || 0,
          floorPlans: assets?.filter(a => a.type === 'floorplan').length || 0,
          tours: assets?.filter(a => a.type === '3d_tour').length || 0,
        }

        // Send QC complete notification (async, don't wait)
        notifyQCComplete(
          { email: agent.email, phone: agent.phone, name: agent.name },
          {
            agentName: agent.name,
            listingAddress: listing.address,
            deliveryUrl,
            assetSummary,
          }
        ).catch(err => console.error('Notification error:', err))
      }

      // Notify agent of other status updates (except internal statuses)
      const notifyStatuses = ['scheduled', 'in_progress', 'delivered']
      if (notifyStatuses.includes(status) && status !== 'delivered') {
        notifyStatusUpdate(
          { email: agent.email, name: agent.name },
          {
            agentName: agent.name,
            listingAddress: listing.address,
            previousStatus: listing.ops_status,
            newStatus: status,
          }
        ).catch(err => console.error('Notification error:', err))
      }
    }

    return NextResponse.json({
      success: true,
      previousStatus: listing.ops_status,
      newStatus: status,
    })
  } catch (error) {
    console.error('Status update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET current status and available transitions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: listingData, error } = await supabase
      .from('listings')
      .select('ops_status')
      .eq('id', id)
      .single()

    if (error || !listingData) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Type assertion for new fields that may not be in generated types yet
    const listing = listingData as {
      ops_status: string
      editor_id?: string | null
      editing_started_at?: string | null
      editing_completed_at?: string | null
    }

    const availableTransitions = VALID_TRANSITIONS[listing.ops_status] || []

    return NextResponse.json({
      currentStatus: listing.ops_status,
      availableTransitions,
      editorId: listing.editor_id || null,
      editingStartedAt: listing.editing_started_at || null,
      editingCompletedAt: listing.editing_completed_at || null,
    })
  } catch (error) {
    console.error('Status GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
