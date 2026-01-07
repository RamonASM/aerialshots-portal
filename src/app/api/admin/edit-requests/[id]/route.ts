import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

type EditRequestStatus = 'pending' | 'reviewing' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // Get edit request with all related data
    // Using separate queries to avoid deep type instantiation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: editRequestData, error } = await (supabase as any)
      .from('edit_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Edit request not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Fetch related data separately
    const [agentResult, listingResult, orderResult, assignedStaffResult, resolverResult] = await Promise.all([
      editRequestData.agent_id
        ? supabase.from('agents').select('id, name, email, phone').eq('id', editRequestData.agent_id).maybeSingle()
        : { data: null },
      editRequestData.listing_id
        ? supabase.from('listings').select('id, address, city, state, mls_id').eq('id', editRequestData.listing_id).maybeSingle()
        : { data: null },
      editRequestData.order_id
        ? supabase.from('orders').select('id, created_at, total').eq('id', editRequestData.order_id).maybeSingle()
        : { data: null },
      editRequestData.assigned_to
        ? supabase.from('staff').select('id, name, email, avatar_url').eq('id', editRequestData.assigned_to).maybeSingle()
        : { data: null },
      editRequestData.resolved_by
        ? supabase.from('staff').select('id, name').eq('id', editRequestData.resolved_by).maybeSingle()
        : { data: null },
    ])

    const editRequest = {
      ...editRequestData,
      agent: agentResult.data,
      listing: listingResult.data,
      order: orderResult.data,
      assigned_staff: assignedStaffResult.data,
      resolver: resolverResult.data,
    }

    // Get comments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comments } = await (supabase as any)
      .from('edit_request_comments')
      .select('*')
      .eq('edit_request_id', id)
      .order('created_at', { ascending: true })

    // Get affected assets if any
    let assets = null
    if (editRequest.asset_ids && editRequest.asset_ids.length > 0) {
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('id, aryeo_url, type, category')
        .in('id', editRequest.asset_ids)

      assets = mediaAssets
    }

    return NextResponse.json({
      editRequest,
      comments: comments || [],
      assets,
    })
  } catch (error) {
    console.error('Error fetching edit request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit request' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    // Only include provided fields
    if (body.status !== undefined) {
      updateData.status = body.status

      // Set resolved fields when completing/rejecting
      if (['completed', 'rejected'].includes(body.status)) {
        updateData.resolved_by = access.id
        updateData.resolved_at = new Date().toISOString()
      }
    }

    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to || null
      if (body.assigned_to) {
        updateData.assigned_at = new Date().toISOString()
      }
    }

    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.is_rush !== undefined) updateData.is_rush = body.is_rush
    if (body.resolution_notes !== undefined) updateData.resolution_notes = body.resolution_notes
    if (body.is_billable !== undefined) updateData.is_billable = body.is_billable
    if (body.estimated_cost !== undefined) updateData.estimated_cost = body.estimated_cost
    if (body.actual_cost !== undefined) updateData.actual_cost = body.actual_cost
    if (body.due_date !== undefined) updateData.due_date = body.due_date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedRequest, error } = await (supabase as any)
      .from('edit_requests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    // Fetch related data separately to avoid deep type issues
    const [agentResult, assignedStaffResult, resolverResult] = await Promise.all([
      updatedRequest.agent_id
        ? supabase.from('agents').select('id, name, email').eq('id', updatedRequest.agent_id).maybeSingle()
        : { data: null },
      updatedRequest.assigned_to
        ? supabase.from('staff').select('id, name, avatar_url').eq('id', updatedRequest.assigned_to).maybeSingle()
        : { data: null },
      updatedRequest.resolved_by
        ? supabase.from('staff').select('id, name').eq('id', updatedRequest.resolved_by).maybeSingle()
        : { data: null },
    ])

    const editRequest = {
      ...updatedRequest,
      agent: agentResult.data,
      assigned_staff: assignedStaffResult.data,
      resolver: resolverResult.data,
    }

    return NextResponse.json({ editRequest })
  } catch (error) {
    console.error('Error updating edit request:', error)
    return NextResponse.json(
      { error: 'Failed to update edit request' },
      { status: 500 }
    )
  }
}

// Add comment to edit request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    if (!body.content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Create comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error } = await (supabase as any)
      .from('edit_request_comments')
      .insert({
        edit_request_id: id,
        author_type: 'staff',
        author_id: access.id,
        content: body.content,
        attachments: body.attachments || [],
        is_internal: body.is_internal || false,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
