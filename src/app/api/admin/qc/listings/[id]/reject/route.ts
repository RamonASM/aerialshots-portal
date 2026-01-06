import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireStaffAccess()
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { notes } = body

    // Update listing status back to processing
    const { data: listing, error: updateError } = await supabase
      .from('listings')
      .update({
        ops_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update media assets to needs_revision if notes provided
    if (notes) {
      const { error: assetsError } = await supabase
        .from('media_assets')
        .update({
          qc_status: 'needs_revision',
          qc_notes: notes,
        })
        .eq('listing_id', id)

      if (assetsError) {
        console.error('Error updating media assets:', assetsError)
      }
    }

    // Log the event
    await supabase.from('job_events').insert({
      listing_id: id,
      event_type: 'qc_rejected',
      new_value: {
        ops_status: 'processing',
        notes
      },
      actor_id: access.id,
      actor_type: 'staff',
    })

    return NextResponse.json({
      success: true,
      listing,
    })
  } catch (error) {
    console.error('Error rejecting listing:', error)
    return NextResponse.json(
      { error: 'Failed to reject listing' },
      { status: 500 }
    )
  }
}
