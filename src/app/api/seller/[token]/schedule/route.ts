import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/seller/[token]/schedule
 * Get shoot schedule information for seller
 * PUBLIC - token is the auth
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Validate token
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('id, listing_id, is_active, expires_at')
      .eq('share_token', token)
      .eq('link_type', 'seller')
      .single()

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'Link revoked' }, { status: 410 })
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }

    // Get listing with schedule info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        zip,
        scheduled_at,
        ops_status,
        is_rush,
        photographer_id
      `)
      .eq('id', shareLink.listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Get photographer name if assigned
    let photographerName = null
    if (listing.photographer_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('name')
        .eq('id', listing.photographer_id)
        .single()
      photographerName = staff?.name
    }

    // Get seller schedule if exists (additional scheduling info)
    const { data: sellerSchedule } = await supabase
      .from('seller_schedules')
      .select(`
        status,
        selected_slot,
        notes
      `)
      .eq('share_link_id', shareLink.id)
      .single()

    // Get any pending reschedule requests
    const { data: rescheduleRequests } = await supabase
      .from('reschedule_requests')
      .select('id, status, requested_slots, reason, created_at, handled_at')
      .eq('listing_id', shareLink.listing_id)
      .eq('share_link_id', shareLink.id)
      .order('created_at', { ascending: false })
      .limit(1)

    // Prep instructions for seller
    const prepInstructions = [
      'Turn on all lights including lamps and under-cabinet lights',
      'Open all blinds and curtains',
      'Remove cars from driveway',
      'Tidy up countertops and personal items',
      'Make all beds and arrange pillows',
      'Close toilet lids',
      'Turn off ceiling fans',
      'Put away pet food bowls and crates if possible',
      'Secure pets during the shoot',
    ]

    // Determine schedule status
    let scheduleStatus: 'not_scheduled' | 'scheduled' | 'confirmed' | 'completed' | 'rescheduling' = 'not_scheduled'

    if (rescheduleRequests?.[0]?.status === 'pending') {
      scheduleStatus = 'rescheduling'
    } else if (listing.ops_status === 'delivered') {
      scheduleStatus = 'completed'
    } else if (sellerSchedule?.status === 'confirmed') {
      scheduleStatus = 'confirmed'
    } else if (listing.scheduled_at) {
      scheduleStatus = 'scheduled'
    }

    return NextResponse.json({
      success: true,
      schedule_status: scheduleStatus,
      listing: {
        id: listing.id,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        scheduled_at: listing.scheduled_at,
        ops_status: listing.ops_status,
        is_rush: listing.is_rush,
      },
      photographer_name: photographerName,
      seller_schedule: sellerSchedule ? {
        selected_slot: sellerSchedule.selected_slot,
        notes: sellerSchedule.notes,
        status: sellerSchedule.status,
      } : null,
      pending_reschedule: rescheduleRequests?.[0]?.status === 'pending' ? {
        id: rescheduleRequests[0].id,
        requested_slots: rescheduleRequests[0].requested_slots,
        reason: rescheduleRequests[0].reason,
        created_at: rescheduleRequests[0].created_at,
      } : null,
      prep_instructions: prepInstructions,
    })

  } catch (error) {
    console.error('Seller schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
