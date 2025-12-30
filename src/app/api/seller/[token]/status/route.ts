import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/seller/[token]/status
 * Get real-time photographer status and location
 * PUBLIC - token is the auth
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Validate token and get listing
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('listing_id, is_active, expires_at')
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

    // Get listing with photographer assignment
    const { data: listing } = await supabase
      .from('listings')
      .select(`
        id,
        ops_status,
        scheduled_at,
        delivered_at,
        photographer_id
      `)
      .eq('id', shareLink.listing_id)
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Get photographer info and location
    let photographer = null
    let location = null

    if (listing.photographer_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, name, phone')
        .eq('id', listing.photographer_id)
        .single()

      photographer = staff

      // Get latest location for this photographer and listing
      const { data: loc } = await supabase
        .from('photographer_locations')
        .select(`
          latitude,
          longitude,
          status,
          eta_minutes,
          last_updated_at
        `)
        .eq('staff_id', listing.photographer_id)
        .single()

      if (loc) {
        location = loc
      }
    }

    // Determine status message based on ops_status and location
    let statusMessage = 'Shoot scheduled'
    let statusType: 'scheduled' | 'en_route' | 'arriving' | 'on_site' | 'shooting' | 'processing' | 'delivered' = 'scheduled'

    if (listing.ops_status === 'delivered') {
      statusMessage = 'Photos delivered!'
      statusType = 'delivered'
    } else if (['editing', 'in_qc', 'ready_for_qc'].includes(listing.ops_status || '')) {
      statusMessage = 'Photos being processed'
      statusType = 'processing'
    } else if (location?.status === 'shooting') {
      statusMessage = 'Photographer is capturing your property'
      statusType = 'shooting'
    } else if (location?.status === 'on_site') {
      statusMessage = 'Photographer has arrived'
      statusType = 'on_site'
    } else if (location?.status === 'arriving') {
      statusMessage = `Photographer arriving in ${location.eta_minutes || 'a few'} minutes`
      statusType = 'arriving'
    } else if (location?.status === 'en_route') {
      if (location.eta_minutes) {
        statusMessage = `Photographer is on the way - ETA ${location.eta_minutes} min`
      } else {
        statusMessage = 'Photographer is on the way'
      }
      statusType = 'en_route'
    } else if (listing.scheduled_at) {
      const scheduledDate = new Date(listing.scheduled_at)
      const now = new Date()
      const diffMs = scheduledDate.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      if (diffHours < 0) {
        statusMessage = 'Shoot in progress'
      } else if (diffHours < 1) {
        statusMessage = 'Photographer will arrive soon'
      } else if (diffHours < 24) {
        statusMessage = `Shoot scheduled for today at ${scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      } else {
        statusMessage = `Shoot scheduled for ${scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
      }
    }

    return NextResponse.json({
      success: true,
      ops_status: listing.ops_status,
      status_type: statusType,
      status_message: statusMessage,
      scheduled_at: listing.scheduled_at,
      delivered_at: listing.delivered_at,
      photographer: photographer ? {
        name: photographer.name,
        phone: photographer.phone,
      } : null,
      location: location && ['en_route', 'arriving'].includes(location.status || '') ? {
        latitude: location.latitude,
        longitude: location.longitude,
        eta_minutes: location.eta_minutes,
        last_updated_at: location.last_updated_at,
      } : null,
    })

  } catch (error) {
    console.error('Seller status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
