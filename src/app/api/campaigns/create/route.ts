import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffOrOwner, validateListingOwnership } from '@/lib/middleware/auth'
import { handleApiError, badRequest } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()
    const { listingId, agentId } = body

    if (!listingId || !agentId) {
      throw badRequest('listingId and agentId are required')
    }

    // Security: Verify caller owns this listing or is staff
    const supabaseAuth = await createClient()
    await validateListingOwnership(supabaseAuth, listingId)

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
  })
}
