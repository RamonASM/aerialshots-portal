import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listingId, agentId } = body

    if (!listingId || !agentId) {
      return NextResponse.json(
        { error: 'listingId and agentId are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get listing details to create campaign name
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('address, city, state')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if campaign already exists for this listing
    const { data: existingCampaign } = await supabase
      .from('listing_campaigns')
      .select('id')
      .eq('listing_id', listingId)
      .eq('agent_id', agentId)
      .in('status', ['draft', 'researching', 'questions', 'generating'])
      .maybeSingle()

    if (existingCampaign) {
      // Return existing campaign
      return NextResponse.json({ campaignId: existingCampaign.id })
    }

    // Create new campaign
    const campaignName = `${listing.address}, ${listing.city || ''}, ${listing.state || 'FL'}`.trim()

    const { data: campaign, error: campaignError } = await supabase
      .from('listing_campaigns')
      .insert({
        listing_id: listingId,
        agent_id: agentId,
        name: campaignName,
        status: 'draft',
        carousel_types: ['property_highlights', 'neighborhood_guide', 'local_favorites'],
      })
      .select('id')
      .single()

    if (campaignError) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaignId: campaign.id })
  } catch (error) {
    console.error('Campaign creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
