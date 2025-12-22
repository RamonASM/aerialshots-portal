import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { notes } = body

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      actor_id: staff.id,
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
