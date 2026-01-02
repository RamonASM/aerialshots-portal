import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get community by slug or id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('communities').select('*')

    // Try UUID first, then slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: community, error } = await query.single()

    if (error || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    return NextResponse.json({ community })
  } catch (error) {
    console.error('Error fetching community:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      city,
      state,
      description,
      hero_image_url,
      lat,
      lng,
      is_published,
      overview_content,
      lifestyle_content,
      market_snapshot,
      schools_info,
      subdivisions,
      quick_facts,
      seo_title,
      seo_description,
    } = body

    // Build update object - only include defined fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (description !== undefined) updateData.description = description
    if (hero_image_url !== undefined) updateData.hero_image_url = hero_image_url
    if (lat !== undefined) updateData.lat = lat
    if (lng !== undefined) updateData.lng = lng
    if (is_published !== undefined) updateData.is_published = is_published
    if (overview_content !== undefined) updateData.overview_content = overview_content
    if (lifestyle_content !== undefined) updateData.lifestyle_content = lifestyle_content
    if (market_snapshot !== undefined) updateData.market_snapshot = market_snapshot
    if (schools_info !== undefined) updateData.schools_info = schools_info
    if (subdivisions !== undefined) updateData.subdivisions = subdivisions
    if (quick_facts !== undefined) updateData.quick_facts = quick_facts
    if (seo_title !== undefined) updateData.seo_title = seo_title
    if (seo_description !== undefined) updateData.seo_description = seo_description

    // Find by slug or id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('communities').update(updateData)
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: community, error } = await query.select().single()

    if (error) throw error

    return NextResponse.json({ community })
  } catch (error) {
    console.error('Error updating community:', error)
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Find by slug or id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('communities').delete()
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting community:', error)
    return NextResponse.json(
      { error: 'Failed to delete community' },
      { status: 500 }
    )
  }
}
