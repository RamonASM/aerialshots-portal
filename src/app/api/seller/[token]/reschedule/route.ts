import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendRescheduleNotificationEmail } from '@/lib/email/resend'

interface RouteParams {
  params: Promise<{ token: string }>
}

const rescheduleRequestSchema = z.object({
  requested_slots: z.array(z.object({
    date: z.string(),
    time_preference: z.enum(['morning', 'afternoon', 'anytime']).optional(),
    specific_time: z.string().optional(),
  })).min(1, 'At least one preferred slot is required'),
  reason: z.string().optional(),
  requester_name: z.string().optional(),
  requester_email: z.string().email().optional(),
  requester_phone: z.string().optional(),
})

/**
 * POST /api/seller/[token]/reschedule
 * Submit a reschedule request from seller
 * PUBLIC - token is the auth
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Validate token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shareLink, error: linkError } = await (supabase as any)
      .from('share_links')
      .select('id, listing_id, client_name, client_email, is_active, expires_at')
      .eq('share_token', token)
      .eq('link_type', 'seller')
      .maybeSingle() as { data: { id: string; listing_id: string; client_name: string | null; client_email: string | null; is_active: boolean; expires_at: string | null } | null; error: Error | null }

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'Link revoked' }, { status: 410 })
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = rescheduleRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const { requested_slots, reason, requester_name, requester_email, requester_phone } = parseResult.data

    // Get current listing info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('scheduled_at, ops_status')
      .eq('id', shareLink.listing_id)
      .maybeSingle()

    if (listingError) {
      console.error('Failed to fetch listing:', listingError)
    }

    // Check if already has pending reschedule request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRequest, error: existingError } = await (supabase as any)
      .from('reschedule_requests')
      .select('id')
      .eq('listing_id', shareLink.listing_id)
      .eq('share_link_id', shareLink.id)
      .eq('status', 'pending')
      .maybeSingle() as { data: { id: string } | null; error: Error | null }

    if (existingError) {
      console.error('Failed to check existing reschedule request:', existingError)
    }

    if (existingRequest) {
      return NextResponse.json({
        error: 'A reschedule request is already pending',
        pending_request_id: existingRequest.id,
      }, { status: 409 })
    }

    // Check if shoot hasn't already happened
    if (listing?.ops_status === 'delivered') {
      return NextResponse.json({
        error: 'Cannot reschedule - shoot has already been completed',
      }, { status: 400 })
    }

    // Create reschedule request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rescheduleRequest, error: insertError } = await (supabase as any)
      .from('reschedule_requests')
      .insert({
        listing_id: shareLink.listing_id,
        share_link_id: shareLink.id,
        requester_name: requester_name || shareLink.client_name,
        requester_email: requester_email || shareLink.client_email,
        requester_phone,
        original_date: listing?.scheduled_at,
        requested_slots,
        reason,
        status: 'pending',
      })
      .select()
      .single() as { data: { id: string; status: string; requested_slots: unknown[]; created_at: string } | null; error: Error | null }

    if (insertError || !rescheduleRequest) {
      console.error('Reschedule insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit reschedule request' }, { status: 500 })
    }

    // Send notification to admin/staff about reschedule request
    const { data: listingDetails, error: detailsError } = await supabase
      .from('listings')
      .select('address, city, state')
      .eq('id', shareLink.listing_id)
      .maybeSingle()

    if (detailsError) {
      console.error('Failed to fetch listing details for notification:', detailsError)
    }

    // Get first requested slot for the email
    const firstSlot = requested_slots[0]
    const newDate = firstSlot?.specific_time
      ? `${firstSlot.date}T${firstSlot.specific_time}`
      : `${firstSlot.date}T09:00:00`

    // Notify support/admin team
    await sendRescheduleNotificationEmail({
      to: 'support@aerialshots.media',
      staffName: 'Team',
      sellerName: requester_name || shareLink.client_name || 'Seller',
      propertyAddress: listingDetails
        ? `${listingDetails.address}, ${listingDetails.city}, ${listingDetails.state}`
        : 'Property',
      originalDate: listing?.scheduled_at || new Date().toISOString(),
      newDate,
      reason,
    }).catch((err) => {
      console.error('Failed to send reschedule notification email:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Reschedule request submitted successfully',
      request: {
        id: rescheduleRequest.id,
        status: rescheduleRequest.status,
        requested_slots: rescheduleRequest.requested_slots,
        created_at: rescheduleRequest.created_at,
      },
    })

  } catch (error) {
    console.error('Seller reschedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/seller/[token]/reschedule
 * Cancel a pending reschedule request
 * PUBLIC - token is the auth
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Validate token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shareLink, error: linkError } = await (supabase as any)
      .from('share_links')
      .select('id, listing_id, is_active, expires_at')
      .eq('share_token', token)
      .eq('link_type', 'seller')
      .maybeSingle() as { data: { id: string; listing_id: string; is_active: boolean; expires_at: string | null } | null; error: Error | null }

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'Link revoked' }, { status: 410 })
    }

    // Find pending reschedule request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendingRequest, error: pendingError } = await (supabase as any)
      .from('reschedule_requests')
      .select('id')
      .eq('listing_id', shareLink.listing_id)
      .eq('share_link_id', shareLink.id)
      .eq('status', 'pending')
      .maybeSingle() as { data: { id: string } | null; error: Error | null }

    if (pendingError) {
      console.error('Failed to find pending reschedule request:', pendingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!pendingRequest) {
      return NextResponse.json({ error: 'No pending reschedule request found' }, { status: 404 })
    }

    // Cancel the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('reschedule_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingRequest.id) as { error: Error | null }

    if (updateError) {
      console.error('Reschedule cancel error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule request cancelled',
    })

  } catch (error) {
    console.error('Seller reschedule cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
