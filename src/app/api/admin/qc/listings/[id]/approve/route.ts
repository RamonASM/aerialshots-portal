import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // Update listing status to delivered
    const { data: listing, error: updateError } = await supabase
      .from('listings')
      .update({
        ops_status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update all media assets to approved
    const { error: assetsError } = await supabase
      .from('media_assets')
      .update({
        qc_status: 'approved',
      })
      .eq('listing_id', id)

    if (assetsError) {
      console.error('Error updating media assets:', assetsError)
    }

    // Log the event
    await supabase.from('job_events').insert({
      listing_id: id,
      event_type: 'qc_approved',
      new_value: { ops_status: 'delivered' },
      actor_id: staff.id,
      actor_type: 'staff',
    })

    return NextResponse.json({
      success: true,
      listing,
    })
  } catch (error) {
    console.error('Error approving listing:', error)
    return NextResponse.json(
      { error: 'Failed to approve listing' },
      { status: 500 }
    )
  }
}
