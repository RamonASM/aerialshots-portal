import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveMediaUrl } from '@/lib/storage/resolve-url'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/seller/[token]/deliverables
 * Get media deliverables for seller
 * Only returns media if seller has access (agent granted or paid)
 * PUBLIC - token is the auth
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Validate token
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

    // Check media access permissions
    const { data: accessControl } = await supabase
      .from('seller_access_controls')
      .select('media_access_enabled, granted_at, notes')
      .eq('listing_id', shareLink.listing_id)
      .single()

    let hasMediaAccess = accessControl?.media_access_enabled || false
    let accessReason: 'agent_granted' | 'payment' | 'none' = 'none'

    if (accessControl?.media_access_enabled) {
      accessReason = 'agent_granted'
    }

    // Also check if paid via order
    if (!hasMediaAccess) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('listing_id', shareLink.listing_id)
        .eq('payment_status', 'paid')

      if ((count || 0) > 0) {
        hasMediaAccess = true
        accessReason = 'payment'
      }
    }

    // If no access, return locked state
    if (!hasMediaAccess) {
      // Check listing status for better messaging
      const { data: listing } = await supabase
        .from('listings')
        .select('ops_status, delivered_at')
        .eq('id', shareLink.listing_id)
        .single()

      let lockMessage = 'Media access has not been granted for this listing.'

      if (listing?.ops_status === 'delivered') {
        lockMessage = 'Media has been delivered. Please contact your real estate agent for access.'
      } else if (!listing?.ops_status || listing.ops_status === 'scheduled') {
        lockMessage = 'Photos are not yet available. Check back after the shoot.'
      } else {
        lockMessage = 'Photos are being processed. Access will be available once your agent approves.'
      }

      return NextResponse.json({
        success: true,
        has_access: false,
        lock_reason: 'no_access_granted',
        lock_message: lockMessage,
        listing_status: listing?.ops_status,
      })
    }

    // Fetch approved media assets
    const { data: mediaAssets, error: mediaError } = await supabase
      .from('media_assets')
      .select(`
        id,
        media_url,
        storage_path,
        processed_storage_path,
        type,
        category,
        qc_status,
        sort_order
      `)
      .eq('listing_id', shareLink.listing_id)
      .eq('qc_status', 'approved') // Only show approved assets
      .order('sort_order', { ascending: true })

    if (mediaError) {
      console.error('Media fetch error:', mediaError)
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
    }

    // Group by type
    const photos = mediaAssets?.filter(a => a.type === 'photo') || []
    const videos = mediaAssets?.filter(a => a.type === 'video') || []
    const tours = mediaAssets?.filter(a => a.type === '3d_tour') || []
    const floorPlans = mediaAssets?.filter(a => a.type === 'floor_plan') || []

    // Get listing info for context
    const { data: listing } = await supabase
      .from('listings')
      .select('address, city, state, delivered_at')
      .eq('id', shareLink.listing_id)
      .single()

    return NextResponse.json({
      success: true,
      has_access: true,
      access_reason: accessReason,
      granted_at: accessControl?.granted_at,
      listing: {
        address: listing?.address,
        city: listing?.city,
        state: listing?.state,
        delivered_at: listing?.delivered_at,
      },
      media: {
        photos: photos.map(p => ({
          id: p.id,
          url: p.processed_storage_path || resolveMediaUrl(p) || p.storage_path,
          category: p.category,
          sort_order: p.sort_order,
        })),
        videos: videos.map(v => ({
          id: v.id,
          url: resolveMediaUrl(v) || v.storage_path,
          category: v.category,
        })),
        tours: tours.map(t => ({
          id: t.id,
          url: resolveMediaUrl(t) || t.storage_path,
        })),
        floor_plans: floorPlans.map(f => ({
          id: f.id,
          url: resolveMediaUrl(f) || f.storage_path,
        })),
      },
      counts: {
        photos: photos.length,
        videos: videos.length,
        tours: tours.length,
        floor_plans: floorPlans.length,
        total: (mediaAssets?.length || 0),
      },
    })

  } catch (error) {
    console.error('Seller deliverables error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
