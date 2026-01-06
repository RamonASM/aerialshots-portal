import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('listing_campaigns')
      .select(`
        id,
        name,
        status,
        carousel_types,
        credits_used,
        created_at,
        updated_at,
        listing:listings(
          id,
          address,
          city,
          state,
          price
        ),
        agent:agents(
          id,
          name,
          email,
          headshot_url
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status as 'draft' | 'researching' | 'questions' | 'generating' | 'completed' | 'published')
    }

    // Apply search filter (search by name or listing address)
    if (search) {
      query = query.or(`name.ilike.%${search}%`)
    }

    const { data: campaigns, count, error } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      throw error
    }

    // Get carousel counts for each campaign
    const campaignIds = campaigns?.map(c => c.id) || []
    const { data: carouselCounts } = campaignIds.length > 0
      ? await supabase
          .from('listing_carousels')
          .select('campaign_id')
          .in('campaign_id', campaignIds)
      : { data: [] }

    const carouselCountMap: Record<string, number> = {}
    carouselCounts?.forEach(carousel => {
      carouselCountMap[carousel.campaign_id] = (carouselCountMap[carousel.campaign_id] || 0) + 1
    })

    // Enrich campaigns with carousel counts
    const enrichedCampaigns = campaigns?.map(campaign => ({
      ...campaign,
      carouselCount: carouselCountMap[campaign.id] || 0,
    }))

    return NextResponse.json({
      campaigns: enrichedCampaigns,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
