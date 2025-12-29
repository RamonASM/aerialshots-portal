import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type { ShareLinkType, ShareLinkInsert } from '@/lib/supabase/types'

/**
 * POST /api/share-links
 * Create a new share link for a listing
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get agent to verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    // Allow if user is agent owner or staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!agent && !staff) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
      client_email: client_email || null,
      client_name: client_name || null,
      share_token,
      link_type,
      expires_at: expires_at.toISOString(),
      is_active: true,
      access_count: 0,
    }

    const { data: createdLink, error: createError } = await supabase
      .from('share_links')
      .insert(shareLink)
      .select()
      .single()

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
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listing_id = searchParams.get('listing_id')
    const agent_id = searchParams.get('agent_id')
    const include_expired = searchParams.get('include_expired') === 'true'

    // Get agent to verify access
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    // Allow if user is agent owner or staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!agent && !staff) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
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
    } else if (agent && !staff) {
      // Non-staff agents can only see their own links
      query = query.eq('agent_id', agent.id)
    }

    // Filter expired links unless explicitly included
    if (!include_expired) {
      query = query.gte('expires_at', new Date().toISOString())
    }

    const { data: links, error: listError } = await query

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
