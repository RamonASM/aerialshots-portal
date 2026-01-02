import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const agentId = searchParams.get('agent_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get Instagram connections with agent info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connections, error: connError } = await (supabase as any)
      .from('instagram_connections')
      .select(`
        id,
        instagram_user_id,
        instagram_username,
        account_type,
        status,
        profile_picture_url,
        followers_count,
        last_synced_at,
        created_at,
        agent:agents(id, name, email, headshot_url)
      `)
      .order('created_at', { ascending: false })

    if (connError) {
      console.error('Error fetching connections:', connError)
    }

    // Build scheduled posts query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let postsQuery = (supabase as any)
      .from('instagram_scheduled_posts')
      .select(`
        id,
        media_urls,
        caption,
        hashtags,
        scheduled_for,
        timezone,
        status,
        instagram_media_id,
        instagram_permalink,
        published_at,
        error_message,
        retry_count,
        created_at,
        agent:agents(id, name, email, headshot_url),
        carousel:listing_carousels(id, carousel_type, title)
      `, { count: 'exact' })
      .order('scheduled_for', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      postsQuery = postsQuery.eq('status', status as 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled')
    }

    if (agentId) {
      postsQuery = postsQuery.eq('agent_id', agentId)
    }

    const { data: posts, count, error: postsError } = await postsQuery

    if (postsError) {
      console.error('Error fetching posts:', postsError)
    }

    // Calculate stats
    const totalConnections = connections?.length || 0
    const activeConnections = connections?.filter((c: { status: string }) => c.status === 'active').length || 0

    // Get status counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: statusCounts } = await (supabase as any)
      .from('instagram_scheduled_posts')
      .select('status')

    const stats = {
      totalConnections,
      activeConnections,
      scheduled: statusCounts?.filter((p: { status: string }) => p.status === 'scheduled').length || 0,
      published: statusCounts?.filter((p: { status: string }) => p.status === 'published').length || 0,
      failed: statusCounts?.filter((p: { status: string }) => p.status === 'failed').length || 0,
    }

    return NextResponse.json({
      connections: connections || [],
      posts: posts || [],
      stats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching social data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social data' },
      { status: 500 }
    )
  }
}
