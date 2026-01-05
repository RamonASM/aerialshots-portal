import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type { ShareLinkType, ShareLinkInsert, ShareLinkRow } from '@/lib/supabase/types'
import { getCurrentUser } from '@/lib/auth/clerk'

/**
 * POST /api/share-links
 * Create a new share link for a listing
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const {
      listing_id,
      client_email,
      client_name,
      link_type = 'media' as ShareLinkType,
      expires_days = 30
    } = body

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    // Verify listing exists and get agent_id
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, agent_id, address')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (!listing.agent_id) {
      return NextResponse.json({ error: 'Listing has no assigned agent' }, { status: 400 })
    }

    const isStaff = ['admin', 'photographer', 'videographer', 'qc'].includes(user.role)

    // Verify ownership: staff can create links for any listing, agents only for their own
    if (!isStaff) {
      if (user.userTable !== 'agents' || user.userId !== listing.agent_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Generate unique share token
    const share_token = randomUUID().replace(/-/g, '')

    // Calculate expiration date
    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + expires_days)

    // Create share link
    const shareLink: ShareLinkInsert = {
      listing_id,
      agent_id: listing.agent_id,
      client_email: client_email || undefined,
      client_name: client_name || undefined,
      share_token,
      link_type,
      expires_at: expires_at.toISOString(),
      is_active: true,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdLink, error: createError } = await (supabase as any)
      .from('share_links')
      .insert(shareLink)
      .select()
      .single() as { data: ShareLinkRow | null; error: Error | null }

    if (createError) {
      console.error('Error creating share link:', createError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    // Generate the full share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    const shareUrl = link_type === 'schedule'
      ? `${baseUrl}/schedule/${share_token}`
      : `${baseUrl}/portal/${share_token}`

    return NextResponse.json({
      success: true,
      share_link: {
        ...createdLink,
        share_url: shareUrl,
      }
    })

  } catch (error) {
    console.error('Share link creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/share-links
 * List share links for a listing or agent
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const isStaff = ['admin', 'photographer', 'videographer', 'qc'].includes(user.role)

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const listing_id = searchParams.get('listing_id')
    const agent_id = searchParams.get('agent_id')
    const include_expired = searchParams.get('include_expired') === 'true'

    // Build query - using as any since share_links isn't in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('share_links')
      .select(`
        *,
        listing:listings(id, address, city, state)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Filter by listing if provided
    if (listing_id) {
      query = query.eq('listing_id', listing_id)
    }

    // Filter by agent if provided (or use current agent)
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    } else if (!isStaff && user.userTable === 'agents') {
      // Non-staff agents can only see their own links
      query = query.eq('agent_id', user.userId)
    }

    // Filter expired links unless explicitly included
    if (!include_expired) {
      query = query.gte('expires_at', new Date().toISOString())
    }

    const { data: links, error: listError } = await query as { data: Array<ShareLinkRow & { listing: { id: string; address: string; city: string; state: string } | null }> | null; error: Error | null }

    if (listError) {
      console.error('Error fetching share links:', listError)
      return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 })
    }

    // Add share URLs to each link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    const linksWithUrls = links?.map(link => ({
      ...link,
      share_url: link.link_type === 'schedule'
        ? `${baseUrl}/schedule/${link.share_token}`
        : `${baseUrl}/portal/${link.share_token}`,
    }))

    return NextResponse.json({
      success: true,
      share_links: linksWithUrls || [],
    })

  } catch (error) {
    console.error('Share links list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
