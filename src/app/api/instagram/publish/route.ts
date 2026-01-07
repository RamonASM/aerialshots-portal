import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { publishCarousel, checkPublishingPermissions } from '@/lib/integrations/instagram/publish'
import { getUsableToken, encryptToken } from '@/lib/integrations/instagram/encryption'
import { refreshToken } from '@/lib/integrations/instagram/oauth'

// POST - Publish a carousel to Instagram
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { carouselId, agentId } = body as { carouselId: string; agentId: string }

    if (!carouselId || !agentId) {
      return NextResponse.json(
        { error: 'carouselId and agentId are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this agent (owns the agent or is staff)
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, email')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError) {
      console.error('[Instagram Publish] Agent lookup error:', agentError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const isOwner = agent?.email === user.email
    const isStaff = user.email?.endsWith('@aerialshots.media')

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'You do not have permission to publish for this agent' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Get Instagram connection for agent
    const { data: connection, error: connectionError } = await anySupabase
      .from('instagram_connections')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'No active Instagram connection found. Please connect your Instagram account first.' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Instagram connection has expired. Please reconnect your account.' },
        { status: 401 }
      )
    }

    // Get carousel with rendered images
    const { data: carousel, error: carouselError } = await supabase
      .from('listing_carousels')
      .select(`
        id,
        slides,
        caption,
        hashtags,
        rendered_image_urls,
        render_status,
        campaign:listing_campaigns(
          id,
          listing:listings(address, city, state)
        )
      `)
      .eq('id', carouselId)
      .single()

    if (carouselError || !carousel) {
      return NextResponse.json(
        { error: 'Carousel not found' },
        { status: 404 }
      )
    }

    // Check if carousel has rendered images
    const renderedUrls = (carousel.rendered_image_urls as string[]) || []

    if (renderedUrls.length < 2 || carousel.render_status !== 'completed') {
      return NextResponse.json(
        { error: 'Carousel images are not ready. Please render the images first.' },
        { status: 400 }
      )
    }

    // Verify publishing permissions
    if (!connection.instagram_user_id || !connection.access_token_encrypted) {
      return NextResponse.json(
        { error: 'Instagram connection is incomplete' },
        { status: 400 }
      )
    }

    // Decrypt the access token
    let accessToken = getUsableToken(connection.access_token_encrypted)

    // Check if token needs refresh (within 7 days of expiry)
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at)
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpiry < 7 && daysUntilExpiry > 0) {
        // Token is close to expiry, try to refresh
        try {
          console.log('Refreshing Instagram token before publishing...')
          const refreshed = await refreshToken(accessToken)
          accessToken = refreshed.access_token

          // Update the database with the new token
          const encryptedToken = encryptToken(accessToken)
          const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

          await anySupabase
            .from('instagram_connections')
            .update({
              access_token_encrypted: encryptedToken,
              token_expires_at: newExpiresAt,
            })
            .eq('id', connection.id)

          console.log('Token refreshed successfully, new expiry:', newExpiresAt)
        } catch (refreshError) {
          // Log but don't fail - try with existing token
          console.error('Failed to refresh token, continuing with existing:', refreshError)
        }
      }
    }

    const hasPermission = await checkPublishingPermissions(
      connection.instagram_user_id,
      accessToken
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Unable to verify Instagram publishing permissions' },
        { status: 403 }
      )
    }

    // Build caption with hashtags
    let fullCaption = carousel.caption || ''
    const hashtags = carousel.hashtags as string[] | null
    if (hashtags && hashtags.length > 0) {
      fullCaption += '\n\n' + hashtags.map(h => `#${h}`).join(' ')
    }

    // Prepare items for carousel
    const items = renderedUrls
      .filter(url => url && url.length > 0)
      .slice(0, 10) // Instagram max is 10
      .map(url => ({ imageUrl: url }))

    if (items.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 images for a carousel' },
        { status: 400 }
      )
    }

    // Publish carousel
    const result = await publishCarousel(
      connection.instagram_user_id,
      accessToken,
      items,
      fullCaption
    )

    // Create scheduled post record
    await anySupabase
      .from('instagram_scheduled_posts')
      .insert({
        carousel_id: carouselId,
        agent_id: agentId,
        media_urls: renderedUrls,
        caption: fullCaption,
        hashtags,
        scheduled_for: new Date().toISOString(),
        status: 'published',
        instagram_media_id: result.mediaId,
        instagram_permalink: result.permalink,
        published_at: new Date().toISOString(),
      })

    return NextResponse.json({
      success: true,
      mediaId: result.mediaId,
      permalink: result.permalink,
    })
  } catch (error) {
    console.error('Instagram publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish to Instagram' },
      { status: 500 }
    )
  }
}
