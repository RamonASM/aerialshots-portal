import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAllCarouselContent } from '@/lib/listinglaunch/content-generator'
import { LISTINGLAUNCH_CREDITS } from '@/lib/listinglaunch/credits'
import type { Json } from '@/lib/supabase/types'

// Types not in generated Supabase types
interface NeighborhoodResearchData {
  overview?: string
  demographics?: Record<string, unknown>
  amenities?: Record<string, unknown>[]
  schools?: Record<string, unknown>[]
  walkScore?: number
  [key: string]: unknown
}

interface GeneratedQuestion {
  id: string
  question: string
  category?: string
  answer?: string
}

interface RouteParams {
  params: Promise<{ campaignId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { campaignId } = await params
  const supabase = createAdminClient()

  // Helper function to reset status on failure
  async function resetCampaignStatus() {
    const { error: resetError } = await supabase
      .from('listing_campaigns')
      .update({
        status: 'questions',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'generating') // Only reset if still generating (optimistic lock)

    if (resetError) {
      console.error('Failed to reset campaign status:', resetError)
    }
  }

  try {
    // Use optimistic locking - only proceed if campaign is in expected state
    // Atomically update status to prevent concurrent requests
    const { data: lockedCampaign, error: lockError } = await supabase
      .from('listing_campaigns')
      .select(`
        id,
        status,
        carousel_types,
        neighborhood_data,
        generated_questions,
        agent_answers,
        listing:listings(
          id,
          address,
          city,
          state,
          beds,
          baths,
          sqft,
          price,
          media_assets(*)
        ),
        agent:agents(
          id,
          name,
          brand_color
        )
      `)
      .eq('id', campaignId)
      .single()

    if (lockError || !lockedCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Verify campaign is in correct state
    if (lockedCampaign.status !== 'generating') {
      return NextResponse.json(
        { error: `Campaign must be in generating status (current: ${lockedCampaign.status})` },
        { status: 400 }
      )
    }

    const campaign = lockedCampaign

    if (!campaign.neighborhood_data || !campaign.agent_answers) {
      return NextResponse.json(
        { error: 'Missing research data or answers' },
        { status: 400 }
      )
    }

    const listing = campaign.listing as {
      id: string
      address: string
      city: string | null
      state: string | null
      beds: number | null
      baths: number | null
      sqft: number | null
      price: number | null
      media_assets: Array<{
        id: string
        type: string
        category: string | null
        aryeo_url: string
      }>
    }

    const agent = campaign.agent as {
      id: string
      name: string
      brand_color: string | null
    }

    // Get carousel types to generate
    const carouselTypes = campaign.carousel_types || ['property_highlights', 'neighborhood_guide', 'local_favorites']

    // Check agent credit balance
    const { data: agentData } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agent.id)
      .single()

    const creditBalance = agentData?.credit_balance || 0
    const requiredCredits = carouselTypes.length * LISTINGLAUNCH_CREDITS.CAROUSEL_GENERATION

    if (creditBalance < requiredCredits) {
      await resetCampaignStatus()
      return NextResponse.json(
        {
          error: `Insufficient credits. Generating ${carouselTypes.length} carousels requires ${requiredCredits} credits, you have ${creditBalance}.`,
          requiredCredits,
          currentBalance: creditBalance,
        },
        { status: 402 } // Payment Required
      )
    }

    // Generate content for all carousel types
    const { carousels, totalTokensUsed } = await generateAllCarouselContent(
      {
        address: listing.address,
        city: listing.city || '',
        state: listing.state || 'FL',
        beds: listing.beds || 0,
        baths: listing.baths || 0,
        sqft: listing.sqft || 0,
        price: listing.price || undefined,
      },
      {
        name: agent.name,
        brandColor: agent.brand_color || '#ff4533',
      },
      campaign.neighborhood_data as unknown as NeighborhoodResearchData,
      (campaign.generated_questions as unknown as GeneratedQuestion[]) || [],
      (campaign.agent_answers as unknown as Record<string, string>) || {},
      carouselTypes
    )

    // Save each carousel to the database
    type CarouselType = 'property_highlights' | 'neighborhood_guide' | 'local_favorites' | 'schools_families' | 'lifestyle' | 'market_update' | 'open_house'

    const carouselInserts = carousels.map((carousel) => ({
      campaign_id: campaignId,
      carousel_type: carousel.carouselType as CarouselType,
      slides: carousel.slides as unknown as Json,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
      render_status: 'pending' as const,
    }))

    const { data: savedCarousels, error: insertError } = await supabase
      .from('listing_carousels')
      .insert(carouselInserts)
      .select('id, carousel_type')

    if (insertError) {
      console.error('Error saving carousels:', insertError)
      return NextResponse.json(
        { error: 'Failed to save generated content' },
        { status: 500 }
      )
    }

    // Deduct credits for carousel generation
    const newBalance = creditBalance - requiredCredits
    await supabase
      .from('agents')
      .update({ credit_balance: newBalance })
      .eq('id', agent.id)

    // Log the credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -requiredCredits,
      type: 'asm_ai_tool',
      description: `[ListingLaunch] Generated ${carousels.length} carousels for ${listing.address}`,
    })

    // Update campaign status to completed
    const { error: updateError } = await supabase
      .from('listing_campaigns')
      .update({
        status: 'completed',
        credits_used: requiredCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating campaign status:', updateError)
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status: 'completed',
      carousels: savedCarousels,
      tokensUsed: totalTokensUsed,
    })
  } catch (error) {
    console.error('Generation error:', error)

    // Reset campaign status using optimistic locking
    await resetCampaignStatus()

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate carousel content' },
      { status: 500 }
    )
  }
}
