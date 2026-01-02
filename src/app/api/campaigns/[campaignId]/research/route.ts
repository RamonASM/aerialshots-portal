import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { LISTINGLAUNCH_CREDITS } from '@/lib/listinglaunch/credits'

// Type not in generated Supabase types
interface PlaceData {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  types: string[]
  geometry: { location: { lat: number; lng: number } }
  price_level?: number
  distance?: number
}

interface EventData {
  id: string
  name: string
  url: string
  imageUrl?: string | null
  date: string
  time?: string | null
  venue: string
  city: string
  category: string
  genre?: string | null
  priceRange?: string | null
  distance?: number | null
}

interface CuratedItemData {
  id: string
  title: string
  description: string | null
  sourceUrl?: string | null
  category: string
}

interface NeighborhoodResearchData {
  dining?: PlaceData[]
  shopping?: PlaceData[]
  fitness?: PlaceData[]
  entertainment?: PlaceData[]
  services?: PlaceData[]
  education?: PlaceData[]
  events?: EventData[]
  curatedItems?: CuratedItemData[]
  researchedAt?: string
  [key: string]: unknown
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
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'researching') // Only reset if still researching (optimistic lock)

    if (resetError) {
      console.error('Failed to reset campaign status:', resetError)
    }
  }

  try {
    // Use optimistic locking - atomically claim the campaign for research
    const { data: lockedCampaign, error: lockError } = await supabase
      .from('listing_campaigns')
      .update({
        status: 'researching',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .eq('status', 'draft') // Only update if still in draft (prevents concurrent requests)
      .select(`
        id,
        status,
        agent_id,
        listing:listings(
          id,
          lat,
          lng,
          address,
          city,
          state
        )
      `)
      .single()

    if (lockError || !lockedCampaign) {
      // Check if campaign exists and is in wrong state
      const { data: existingCampaign } = await supabase
        .from('listing_campaigns')
        .select('id, status')
        .eq('id', campaignId)
        .single()

      if (!existingCampaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: `Campaign research already started (status: ${existingCampaign.status})` },
        { status: 400 }
      )
    }

    const campaign = lockedCampaign as {
      id: string
      status: string
      agent_id: string
      listing: {
        id: string
        lat: number | null
        lng: number | null
        address: string
        city: string | null
        state: string | null
      }
    }
    const listing = campaign.listing

    if (!listing.lat || !listing.lng) {
      await resetCampaignStatus() // Reset since we already claimed it
      return NextResponse.json(
        { error: 'Listing location not available. Please add coordinates.' },
        { status: 400 }
      )
    }

    // Check agent credit balance
    const { data: agent } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', campaign.agent_id)
      .single()

    const creditBalance = agent?.credit_balance || 0
    const requiredCredits = LISTINGLAUNCH_CREDITS.RESEARCH

    if (creditBalance < requiredCredits) {
      await resetCampaignStatus()
      return NextResponse.json(
        {
          error: `Insufficient credits. Research requires ${requiredCredits} credits, you have ${creditBalance}.`,
          requiredCredits,
          currentBalance: creditBalance,
        },
        { status: 402 } // Payment Required
      )
    }

    // Run all research in parallel
    const [nearbyPlaces, events, curatedItems] = await Promise.all([
      getAllNearbyPlaces(listing.lat, listing.lng),
      searchLocalEvents(listing.lat, listing.lng, 15, 60), // 15 mile radius, 60 days ahead
      getCuratedItemsNearLocation(listing.lat, listing.lng, 10),
    ])

    // Structure the neighborhood data
    const neighborhoodData: NeighborhoodResearchData = {
      dining: nearbyPlaces.dining?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      shopping: nearbyPlaces.shopping?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      fitness: nearbyPlaces.fitness?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      entertainment: nearbyPlaces.entertainment?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      services: nearbyPlaces.services?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      education: nearbyPlaces.education?.map(place => ({
        place_id: place.id,
        name: place.name,
        vicinity: place.address,
        rating: place.rating ?? undefined,
        user_ratings_total: place.reviewCount,
        types: [place.type],
        geometry: {
          location: {
            lat: listing.lat!,
            lng: listing.lng!,
          },
        },
        price_level: place.priceLevel,
        distance: place.distance,
      })) || [],
      events: events.map(event => ({
        id: event.id,
        name: event.name,
        url: event.url,
        imageUrl: event.imageUrl,
        date: event.date,
        time: event.time,
        venue: event.venue,
        city: event.city,
        category: event.category,
        genre: event.genre,
        priceRange: event.priceRange,
        distance: event.distance,
      })),
      curatedItems: curatedItems.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        sourceUrl: item.source_url,
        category: item.category,
      })),
      researchedAt: new Date().toISOString(),
    }

    // Update campaign with research data and move to questions status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('listing_campaigns')
      .update({
        neighborhood_data: neighborhoodData as unknown as Record<string, unknown>,
        status: 'questions',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error updating campaign:', updateError)
      return NextResponse.json(
        { error: 'Failed to save research data' },
        { status: 500 }
      )
    }

    // Deduct credits for research
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('agents')
      .update({ credit_balance: creditBalance - requiredCredits })
      .eq('id', campaign.agent_id)

    // Log the credit transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('credit_transactions').insert({
      agent_id: campaign.agent_id,
      amount: -requiredCredits,
      type: 'asm_ai_tool',
      description: `[ListingLaunch] Neighborhood research for ${listing.address}`,
    })

    // Calculate summary stats for response
    const stats = {
      totalPlaces:
        (neighborhoodData.dining?.length || 0) +
        (neighborhoodData.shopping?.length || 0) +
        (neighborhoodData.fitness?.length || 0) +
        (neighborhoodData.entertainment?.length || 0) +
        (neighborhoodData.services?.length || 0) +
        (neighborhoodData.education?.length || 0),
      totalEvents: neighborhoodData.events?.length || 0,
      totalCuratedItems: neighborhoodData.curatedItems?.length || 0,
    }

    // Validate research data quality - require at least some places or events
    if (stats.totalPlaces === 0 && stats.totalEvents === 0) {
      await resetCampaignStatus()
      return NextResponse.json(
        {
          error: 'No neighborhood data found for this location. Please verify the listing coordinates.',
          stats,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status: 'questions',
      stats,
    })
  } catch (error) {
    console.error('Research error:', error)

    // Reset campaign status using optimistic locking
    await resetCampaignStatus()

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete neighborhood research' },
      { status: 500 }
    )
  }
}
