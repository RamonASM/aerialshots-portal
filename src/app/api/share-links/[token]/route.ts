import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ShareLinkRow, SellerScheduleRow, PortalSettingsRow } from '@/lib/supabase/types-custom'

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
    const supabase = createAdminClient()

    // Find the share link by token
    const { data: shareLink, error: linkError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
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
      .maybeSingle()
      .returns<ShareLinkRow & { listing: Record<string, unknown> | null; agent: Record<string, unknown> | null }>()

    if (linkError || !shareLink) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Check if link is active
    if (!shareLink.is_active) {
      return NextResponse.json({ error: 'This link has been revoked' }, { status: 410 })
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
    }

    // Update access count and last accessed timestamp
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
      .update({
        access_count: (shareLink.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareLink.id)

    // Fetch portal settings for white-label customization
    let portalSettings: PortalSettingsRow | null = null
    if (shareLink.agent_id) {
      const { data: settings, error: settingsError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('portal_settings' as any)
        .select('*')
        .eq('agent_id', shareLink.agent_id)
        .maybeSingle()
        .returns<PortalSettingsRow>()

      if (settingsError) {
        console.error('Error fetching portal settings:', settingsError)
      } else {
        portalSettings = settings
      }
    }

    // For media links, also fetch media assets
    let mediaAssets = null
    if (shareLink.link_type === 'media' && shareLink.listing_id) {
      const { data: assets, error: assetsError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('listing_id', shareLink.listing_id as string)
        .order('sort_order', { ascending: true })

      if (assetsError) {
        console.error('Error fetching media assets:', assetsError)
      } else {
        mediaAssets = assets
      }
    }

    // For schedule links, fetch seller schedule if exists
    let sellerSchedule: SellerScheduleRow | null = null
    if (shareLink.link_type === 'schedule') {
      const { data: schedule, error: scheduleError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('seller_schedules' as any)
        .select('*')
        .eq('share_link_id', shareLink.id)
        .maybeSingle()
        .returns<SellerScheduleRow>()

      if (scheduleError) {
        console.error('Error fetching seller schedule:', scheduleError)
      } else {
        sellerSchedule = schedule
      }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
      .select('id, agent_id')
      .eq('share_token', token)
      .maybeSingle()
      .returns<Pick<ShareLinkRow, 'id' | 'agent_id'>>()

    if (linkError) {
      console.error('Share link lookup error:', linkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Verify user has permission (agent owner or staff)
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .maybeSingle()

    if (agentError) {
      console.error('Error looking up agent:', agentError)
    }

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) {
      console.error('Error looking up staff:', staffError)
    }

    // Check if agent owns the link or is staff
    if (!staff && (!agent || agent.id !== shareLink.agent_id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Deactivate the link (soft delete)
    const { error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
      .select('id, agent_id, expires_at')
      .eq('share_token', token)
      .maybeSingle()
      .returns<Pick<ShareLinkRow, 'id' | 'agent_id' | 'expires_at'>>()

    if (linkError) {
      console.error('Share link lookup error:', linkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Verify user has permission
    const { data: agent, error: agentLookupError } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .maybeSingle()

    if (agentLookupError) {
      console.error('Error looking up agent:', agentLookupError)
    }

    const { data: staff, error: staffLookupError } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .maybeSingle()

    if (staffLookupError) {
      console.error('Error looking up staff:', staffLookupError)
    }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('share_links' as any)
      .update(updates)
      .eq('id', shareLink.id)
      .select()
      .single()
      .returns<ShareLinkRow>()

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
