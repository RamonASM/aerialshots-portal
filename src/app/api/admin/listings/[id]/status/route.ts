import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { z } from 'zod'

const StatusUpdateSchema = z.object({
  status: z.enum([
    'scheduled',
    'in_progress',
    'staged',
    'awaiting_editing',
    'in_editing',
    'processing',
    'ready_for_qc',
    'in_qc',
    'delivered',
    'cancelled',
  ]),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/listings/[id]/status
 * Update listing ops_status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    // Parse and validate request
    const rawBody = await request.json()
    const parseResult = StatusUpdateSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { status } = parseResult.data

    // Verify listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, ops_status')
      .eq('id', id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Update listing status
    const updateData: Record<string, unknown> = {
      ops_status: status,
      updated_at: new Date().toISOString(),
    }

    // Add delivered_at timestamp if marking as delivered
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Log the status change event
    await supabase.from('job_events').insert({
      listing_id: id,
      event_type: 'status_change',
      new_value: { status, previous_status: listing.ops_status },
      actor_type: 'staff',
      actor_id: access.id,
    })

    return NextResponse.json({
      success: true,
      status,
      previousStatus: listing.ops_status,
    })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
