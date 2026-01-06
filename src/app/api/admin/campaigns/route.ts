import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const carouselType = searchParams.get('carousel_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query for campaigns table
    let query = supabase
      .from('listing_campaigns')
      .select(
        `
        *,
        listing:listings!listing_id (
          id,
          address,
          city,
          state
        ),
        agent:agents!agent_id (
          id,
          name
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status as 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published')
    }

    if (carouselType) {
      query = query.eq('carousel_type', carouselType)
    }

    const { data: campaigns, count, error } = await query

    if (error) throw error

    // Filter by search (address or agent name) in memory since we can't do joins easily
    let filteredCampaigns = campaigns || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCampaigns = filteredCampaigns.filter(
        (c) =>
          c.listing?.address?.toLowerCase().includes(searchLower) ||
          c.listing?.city?.toLowerCase().includes(searchLower) ||
          c.agent?.name?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({
      campaigns: filteredCampaigns,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
