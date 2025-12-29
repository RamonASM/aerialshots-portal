import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/share-links/[token]
 * Validate a share token and return listing data
 * This is PUBLIC - no auth required (token IS the auth)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Find the share link by token
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select(`
        *,
        listing:listings(
          id, address, city, state, zip,
          beds, baths, sqft, price,
          ops_status, scheduled_at, delivered_at,
          agent:agents(id, name, email, logo_url, headshot_url, brand_color, phone)
        ),
        agent:agents(id, name, email, logo_url, headshot_url, brand_color)
      `)
      .eq('share_token', token)
      .single()

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

    // Update access count and last accessed timestamp
    await supabase
      .from('share_links')
      .update({
        access_count: (shareLink.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id)

    // Fetch portal settings for white-label customization
    let portalSettings = null
    if (shareLink.agent_id) {
      const { data: settings } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('agent_id', shareLink.agent_id)
        .single()
      portalSettings = settings
    }

    // For media links, also fetch media assets
    let mediaAssets = null
    if (shareLink.link_type === 'media' && shareLink.listing_id) {
      const { data: assets } = await supabase
        .from('media_assets')
        .select('*')
        .eq('listing_id', shareLink.listing_id)
        .order('sort_order', { ascending: true })
      mediaAssets = assets
    }

    // For schedule links, fetch seller schedule if exists
    let sellerSchedule = null
    if (shareLink.link_type === 'schedule') {
      const { data: schedule } = await supabase
        .from('seller_schedules')
        .select('*')
        .eq('share_link_id', shareLink.id)
        .single()
      sellerSchedule = schedule
    }

    return NextResponse.json({
      success: true,
      share_link: {
        id: shareLink.id,
        link_type: shareLink.link_type,
        client_name: shareLink.client_name,
        client_email: shareLink.client_email,
        expires_at: shareLink.expires_at,
        access_count: shareLink.access_count,
      },
      listing: shareLink.listing,
      agent: shareLink.agent,
      portal_settings: portalSettings,
      media_assets: mediaAssets,
      seller_schedule: sellerSchedule,
    })

  } catch (error) {
    console.error('Share link validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/share-links/[token]
 * Revoke a share link (requires auth)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('id, agent_id')
      .eq('share_token', token)
      .single()

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Verify user has permission (agent owner or staff)
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    // Check if agent owns the link or is staff
    if (!staff && (!agent || agent.id !== shareLink.agent_id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Deactivate the link (soft delete)
    const { error: updateError } = await supabase
      .from('share_links')
      .update({ is_active: false })
      .eq('id', shareLink.id)

    if (updateError) {
      console.error('Error revoking share link:', updateError)
      return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Share link has been revoked',
    })

  } catch (error) {
    console.error('Share link revocation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/share-links/[token]
 * Update share link (extend expiration, reactivate, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { extend_days, is_active, client_email, client_name } = body

    // Find the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('id, agent_id, expires_at')
      .eq('share_token', token)
      .single()

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Verify user has permission
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff && (!agent || agent.id !== shareLink.agent_id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (extend_days !== undefined) {
      const newExpiry = new Date(shareLink.expires_at || new Date())
      newExpiry.setDate(newExpiry.getDate() + extend_days)
      updates.expires_at = newExpiry.toISOString()
    }

    if (is_active !== undefined) {
      updates.is_active = is_active
    }

    if (client_email !== undefined) {
      updates.client_email = client_email
    }

    if (client_name !== undefined) {
      updates.client_name = client_name
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data: updatedLink, error: updateError } = await supabase
      .from('share_links')
      .update(updates)
      .eq('id', shareLink.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating share link:', updateError)
      return NextResponse.json({ error: 'Failed to update share link' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      share_link: updatedLink,
    })

  } catch (error) {
    console.error('Share link update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
