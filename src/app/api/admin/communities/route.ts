import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const published = searchParams.get('published')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query for communities table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('communities')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (published === 'true') {
      query = query.eq('is_published', true)
    } else if (published === 'false') {
      query = query.eq('is_published', false)
    }

    const { data: communities, count, error } = await query

    if (error) throw error

    // Communities don't have a direct listing relationship in the current schema
    // listingCount unavailable - requires community_id foreign key on listings table
    const enrichedCommunities = communities?.map((community: Record<string, unknown>) => ({
      ...community,
      listingCount: null, // Unavailable - no community-listing relationship in schema
    }))

    return NextResponse.json({
      communities: enrichedCommunities || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching communities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaffAccess(['admin'])
    const supabase = createAdminClient()

    const body = await request.json()
    const {
      name,
      slug,
      city,
      state,
      description,
      hero_image_url,
      lat,
      lng,
      is_published = false,
    } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A community with this slug already exists' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: community, error } = await (supabase as any)
      .from('communities')
      .insert({
        name,
        slug,
        city,
        state,
        description,
        hero_image_url,
        lat,
        lng,
        is_published,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ community })
  } catch (error) {
    console.error('Error creating community:', error)
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    )
  }
}
