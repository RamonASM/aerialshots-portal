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
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const hasWebsite = searchParams.get('hasWebsite')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        zip,
        price,
        beds,
        baths,
        sqft,
        ops_status,
        template_id,
        created_at,
        delivered_at,
        agent:agents(id, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`address.ilike.%${search}%,city.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('ops_status', status)
    }

    // Filter by template (proxy for website capability)
    if (hasWebsite === 'true') {
      query = query.not('template_id', 'is', null)
    } else if (hasWebsite === 'false') {
      query = query.is('template_id', null)
    }

    const { data: listings, count, error } = await query

    if (error) throw error

    // Get media counts for each listing
    const listingIds = listings?.map(l => l.id) || []
    const { data: mediaCounts } = listingIds.length > 0
      ? await supabase
          .from('media_assets')
          .select('listing_id')
          .in('listing_id', listingIds)
      : { data: [] }

    const mediaCountMap: Record<string, number> = {}
    mediaCounts?.forEach(asset => {
      if (asset.listing_id) {
        mediaCountMap[asset.listing_id] = (mediaCountMap[asset.listing_id] || 0) + 1
      }
    })

    // Enrich listings with media counts
    const enrichedListings = listings?.map(listing => ({
      ...listing,
      mediaCount: mediaCountMap[listing.id] || 0,
    }))

    return NextResponse.json({
      listings: enrichedListings,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}
