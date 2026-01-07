import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/seller/[token]
 * Main seller portal data endpoint
 * Returns listing info, photographer status, access permissions
 * PUBLIC - token is the auth
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    // Find the share link by token - must be 'seller' type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shareLink, error: linkError } = await (supabase as any)
      .from('share_links')
      .select(`
        id,
        listing_id,
        link_type,
        client_name,
        client_email,
        expires_at,
        is_active,
        access_count
      `)
      .eq('share_token', token)
      .eq('link_type', 'seller')
      .maybeSingle() as { data: { id: string; listing_id: string; link_type: string; client_name: string | null; client_email: string | null; expires_at: string | null; is_active: boolean; access_count: number } | null; error: Error | null }

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Check if link is active
    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'This link has been revoked' }, { status: 410 })
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    // Update access count and last accessed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('share_links')
      .update({
        access_count: (shareLink.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id)

    // Fetch listing with agent and photographer info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        zip,
        beds,
        baths,
        sqft,
        scheduled_at,
        ops_status,
        delivered_at,
        is_rush,
        photographer_id,
        agent:agents(
          id,
          name,
          email,
          phone,
          headshot_url,
          logo_url,
          brand_color
        )
      `)
      .eq('id', shareLink.listing_id)
      .maybeSingle()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Fetch photographer info if assigned
    let photographer = null
    let photographerLocation = null

    if (listing.photographer_id) {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, phone')
        .eq('id', listing.photographer_id)
        .maybeSingle()

      if (staffError) {
        console.error('Failed to fetch photographer:', staffError)
      } else {
        photographer = staff
      }

      // Fetch photographer location if en_route or on_site
      const { data: location, error: locationError } = await supabase
        .from('photographer_locations')
        .select('latitude, longitude, status, eta_minutes, last_updated_at')
        .eq('staff_id', listing.photographer_id)
        .eq('listing_id', listing.id)
        .maybeSingle()

      if (locationError) {
        console.error('Failed to fetch photographer location:', locationError)
      } else if (location) {
        photographerLocation = location
      }
    }

    // Check media access permissions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accessControl } = await (supabase as any)
      .from('seller_access_controls')
      .select('media_access_enabled, granted_at')
      .eq('listing_id', listing.id)
      .maybeSingle() as { data: { media_access_enabled: boolean; granted_at: string | null } | null }

    let hasMediaAccess = accessControl?.media_access_enabled || false

    // Also check if paid via order
    if (!hasMediaAccess) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('listing_id', listing.id)
        .eq('payment_status', 'paid')

      hasMediaAccess = (count || 0) > 0
    }

    // Get pending reschedule requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rescheduleRequests } = await (supabase as any)
      .from('reschedule_requests')
      .select('id, status, requested_slots, created_at')
      .eq('listing_id', listing.id)
      .eq('share_link_id', shareLink.id)
      .order('created_at', { ascending: false })
      .limit(5) as { data: Array<{ id: string; status: string; requested_slots: unknown; created_at: string }> | null }

    // Determine overall status for UI
    let portalStatus: 'scheduled' | 'en_route' | 'on_site' | 'shooting' | 'processing' | 'delivered' = 'scheduled'

    if (listing.ops_status === 'delivered') {
      portalStatus = 'delivered'
    } else if (['editing', 'in_qc', 'ready_for_qc'].includes(listing.ops_status || '')) {
      portalStatus = 'processing'
    } else if (photographerLocation?.status === 'shooting') {
      portalStatus = 'shooting'
    } else if (photographerLocation?.status === 'on_site') {
      portalStatus = 'on_site'
    } else if (['en_route', 'arriving'].includes(photographerLocation?.status || '')) {
      portalStatus = 'en_route'
    }

    return NextResponse.json({
      success: true,
      token_info: {
        id: shareLink.id,
        client_name: shareLink.client_name,
        client_email: shareLink.client_email,
        expires_at: shareLink.expires_at,
      },
      listing: {
        id: listing.id,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        scheduled_at: listing.scheduled_at,
        ops_status: listing.ops_status,
        delivered_at: listing.delivered_at,
        is_rush: listing.is_rush,
      },
      agent: listing.agent,
      photographer: photographer,
      photographer_location: photographerLocation,
      portal_status: portalStatus,
      has_media_access: hasMediaAccess,
      reschedule_requests: rescheduleRequests || [],
    })

  } catch (error) {
    console.error('Seller portal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
