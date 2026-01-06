import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const instagram = searchParams.get('instagram')
    const tier = searchParams.get('tier')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    // Build query for agents table
    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (instagram === 'connected') {
      query = query.not('instagram_url', 'is', null)
    } else if (instagram === 'not_connected') {
      query = query.is('instagram_url', null)
    }

    if (tier) {
      query = query.eq('referral_tier', tier)
    }

    const { data: agents, count, error } = await query

    if (error) throw error

    // Get listing counts per agent
    const agentIds = agents?.map((a) => a.id) || []
    const { data: listingCounts } = agentIds.length > 0
      ? await supabase
          .from('listings')
          .select('agent_id')
          .in('agent_id', agentIds)
      : { data: [] }

    // Get campaign counts per agent
    const { data: campaignCounts } = agentIds.length > 0
      ? await supabase
          .from('listing_campaigns')
          .select('agent_id')
          .in('agent_id', agentIds)
      : { data: [] }

    // Build count maps
    const listingCountMap: Record<string, number> = {}
    listingCounts?.forEach((listing) => {
      if (listing.agent_id) {
        listingCountMap[listing.agent_id] = (listingCountMap[listing.agent_id] || 0) + 1
      }
    })

    const campaignCountMap: Record<string, number> = {}
    campaignCounts?.forEach((campaign) => {
      if (campaign.agent_id) {
        campaignCountMap[campaign.agent_id] = (campaignCountMap[campaign.agent_id] || 0) + 1
      }
    })

    // Enrich agents with counts
    const enrichedAgents = agents?.map((agent) => ({
      ...agent,
      listingsCount: listingCountMap[agent.id] || 0,
      campaignsCount: campaignCountMap[agent.id] || 0,
      portfolioViews: null, // Unavailable - requires analytics tracking implementation
      instagramConnected: !!agent.instagram_url,
    }))

    return NextResponse.json({
      agents: enrichedAgents || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    )
  }
}
