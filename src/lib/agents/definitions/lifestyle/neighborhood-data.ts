// Neighborhood Data Agent
// Aggregates neighborhood data for lifestyle pages

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Local type definitions for neighborhood data
interface PlaceResult {
  place_id: string
  name: string
  vicinity?: string
  rating?: number
  user_ratings_total?: number
  types?: string[]
  geometry?: {
    location: {
      lat: number
      lng: number
    }
  }
  distance?: number
  opening_hours?: { open_now?: boolean }
  price_level?: number
}

interface EventResult {
  id: string
  name: string
  date: string
  venue?: string
  category?: string
  url?: string
}

interface NeighborhoodResearchData {
  overview?: string
  dining?: PlaceResult[]
  shopping?: PlaceResult[]
  fitness?: PlaceResult[]
  entertainment?: PlaceResult[]
  services?: PlaceResult[]
  education?: PlaceResult[]
  events?: EventResult[]
  walkScore?: number
  researchedAt?: string
}
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getWalkScore } from '@/lib/integrations/walkscore/client'

interface NeighborhoodDataInput {
  listing_id?: string
  lat?: number
  lng?: number
  address?: string
  city?: string
  state?: string
}

interface NeighborhoodDataOutput {
  walkScore?: number
  walkScoreDescription?: string
  transitScore?: number
  transitScoreDescription?: string
  bikeScore?: number
  bikeScoreDescription?: string
  nearbyPlaces: {
    dining?: PlaceResult[]
    shopping?: PlaceResult[]
    fitness?: PlaceResult[]
    entertainment?: PlaceResult[]
    services?: PlaceResult[]
    education?: PlaceResult[]
  }
  upcomingEvents: EventResult[]
  neighborhoodSummary: string
  researchedAt: string
}

const NEIGHBORHOOD_SUMMARY_PROMPT = `You are a neighborhood expert writing engaging lifestyle content for a real estate listing.

Based on the neighborhood research data provided, create a compelling 2-3 paragraph narrative summary about what it's like to live in this area.

REQUIREMENTS:
1. Write in a warm, inviting tone that paints a picture of daily life
2. Highlight the most interesting and relevant nearby amenities
3. Mention specific places by name (restaurants, parks, etc.)
4. Include walkability/transit information if available
5. Reference upcoming events that showcase the community vibe
6. Focus on lifestyle benefits, not just facts
7. Make it engaging and specific to THIS neighborhood

EXAMPLE TONE:
"Living in this vibrant neighborhood means being steps away from award-winning dining at [Restaurant Name], boutique shopping along [Street Name], and lush green spaces perfect for weekend strolls. The area boasts a Walk Score of [X], making daily errands a breeze..."

The summary should feel authentic and help potential buyers imagine their life in this community.`

/**
 * Convert Google Places format to our PlaceResult format
 */
function convertToPlaceResult(place: any): PlaceResult {
  return {
    place_id: place.id,
    name: place.name,
    vicinity: place.address,
    rating: place.rating,
    user_ratings_total: place.reviewCount,
    types: [place.type],
    geometry: {
      location: {
        lat: 0, // Distance already calculated
        lng: 0,
      },
    },
    distance: place.distance,
    opening_hours: place.isOpen !== undefined ? { open_now: place.isOpen } : undefined,
    price_level: place.priceLevel,
  }
}

/**
 * Generate neighborhood summary using AI
 */
async function generateNeighborhoodSummary(
  location: { city: string; state: string },
  data: {
    walkScore?: number
    walkScoreDescription?: string
    transitScore?: number
    bikeScore?: number
    nearbyPlaces: {
      dining?: PlaceResult[]
      shopping?: PlaceResult[]
      fitness?: PlaceResult[]
      entertainment?: PlaceResult[]
      services?: PlaceResult[]
      education?: PlaceResult[]
    }
    events: EventResult[]
  }
): Promise<{ summary: string; tokensUsed: number }> {
  // Extract highlights from the data
  const topDining = data.nearbyPlaces.dining?.slice(0, 3) || []
  const topShopping = data.nearbyPlaces.shopping?.slice(0, 2) || []
  const topFitness = data.nearbyPlaces.fitness?.slice(0, 2) || []
  const upcomingEvents = data.events.slice(0, 3)

  const walkabilityInfo = data.walkScore
    ? `Walk Score: ${data.walkScore} (${data.walkScoreDescription})`
    : 'Walkability data not available'

  const transitInfo = data.transitScore
    ? `Transit Score: ${data.transitScore}`
    : ''

  const bikeInfo = data.bikeScore ? `Bike Score: ${data.bikeScore}` : ''

  const prompt = `${NEIGHBORHOOD_SUMMARY_PROMPT}

LOCATION: ${location.city}, ${location.state}

WALKABILITY:
${walkabilityInfo}
${transitInfo}
${bikeInfo}

TOP DINING OPTIONS:
${topDining.map((p) => `- ${p.name} (${p.rating}, ${p.distance?.toFixed(1)} mi)`).join('\n') || 'No dining data available'}

SHOPPING & SERVICES:
${topShopping.map((p) => `- ${p.name} (${p.distance?.toFixed(1)} mi)`).join('\n') || 'No shopping data available'}

FITNESS & RECREATION:
${topFitness.map((p) => `- ${p.name} (${p.distance?.toFixed(1)} mi)`).join('\n') || 'No fitness data available'}

UPCOMING EVENTS:
${upcomingEvents.map((e) => `- ${e.name} at ${e.venue} (${e.date})`).join('\n') || 'No upcoming events found'}

Generate a 2-3 paragraph neighborhood summary now. Return ONLY the narrative text, no JSON or extra formatting.`

  try {
    const response = await generateWithAI({
      prompt,
      maxTokens: 600,
      temperature: 0.7,
    })

    return { summary: response.content.trim(), tokensUsed: response.tokensUsed }
  } catch (error) {
    console.error('Error generating neighborhood summary:', error)
    return { summary: generateFallbackSummary(location, data), tokensUsed: 0 }
  }
}

/**
 * Generate fallback summary if AI fails
 */
function generateFallbackSummary(
  location: { city: string; state: string },
  data: {
    walkScore?: number
    walkScoreDescription?: string
    nearbyPlaces: {
      dining?: PlaceResult[]
      shopping?: PlaceResult[]
      fitness?: PlaceResult[]
      entertainment?: PlaceResult[]
      services?: PlaceResult[]
      education?: PlaceResult[]
    }
  }
): string {
  const walkInfo = data.walkScore
    ? `With a Walk Score of ${data.walkScore}, this ${data.walkScoreDescription?.toLowerCase()} neighborhood offers convenient access to daily amenities.`
    : ''

  const diningInfo =
    (data.nearbyPlaces.dining?.length ?? 0) > 0
      ? `Nearby dining options include ${data.nearbyPlaces.dining!.slice(0, 2).map((p: PlaceResult) => p.name).join(' and ')}.`
      : ''

  return `Welcome to life in ${location.city}, ${location.state}. ${walkInfo} ${diningInfo} This vibrant community offers a blend of convenience and lifestyle amenities that make daily living a pleasure.`
}

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input, supabase } = context
  const neighborhoodInput = input as unknown as NeighborhoodDataInput

  try {
    const db = supabase as SupabaseClient<Database>
    let lat: number
    let lng: number
    let address: string
    let city: string
    let state: string

    // Get coordinates from listing_id or use provided coordinates
    if (neighborhoodInput.listing_id) {
      const { data: listing, error: listingError } = await db
        .from('listings')
        .select('lat, lng, address, city, state')
        .eq('id', neighborhoodInput.listing_id)
        .single()

      if (listingError || !listing) {
        return {
          success: false,
          error: `Listing not found: ${neighborhoodInput.listing_id}`,
          errorCode: 'LISTING_NOT_FOUND',
        }
      }

      if (!listing.lat || !listing.lng) {
        return {
          success: false,
          error: 'Listing does not have coordinates',
          errorCode: 'NO_COORDINATES',
        }
      }

      lat = listing.lat
      lng = listing.lng
      address = listing.address
      city = listing.city || ''
      state = listing.state || ''
    } else if (neighborhoodInput.lat && neighborhoodInput.lng) {
      lat = neighborhoodInput.lat
      lng = neighborhoodInput.lng
      address = neighborhoodInput.address || ''
      city = neighborhoodInput.city || ''
      state = neighborhoodInput.state || ''
    } else {
      return {
        success: false,
        error: 'Either listing_id or lat/lng coordinates are required',
        errorCode: 'MISSING_LOCATION',
      }
    }

    // Fetch data from all sources in parallel
    const [placesData, eventsData, walkScoreData] = await Promise.all([
      getAllNearbyPlaces(lat, lng).catch((error) => {
        console.error('Error fetching places:', error)
        return {
          dining: [],
          shopping: [],
          fitness: [],
          entertainment: [],
          services: [],
          education: [],
        }
      }),
      searchLocalEvents(lat, lng, 10, 30).catch((error) => {
        console.error('Error fetching events:', error)
        return []
      }),
      getWalkScore(lat, lng, address).catch((error) => {
        console.error('Error fetching Walk Score:', error)
        return null
      }),
    ])

    // Convert places to our format
    const nearbyPlaces = {
      dining: placesData.dining?.map(convertToPlaceResult),
      shopping: placesData.shopping?.map(convertToPlaceResult),
      fitness: placesData.fitness?.map(convertToPlaceResult),
      entertainment: placesData.entertainment?.map(convertToPlaceResult),
      services: placesData.services?.map(convertToPlaceResult),
      education: placesData.education?.map(convertToPlaceResult),
    }

    // Convert events to EventResult format
    const events: EventResult[] = eventsData.map((event) => ({
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
    }))

    // Generate AI summary
    const summaryResult = await generateNeighborhoodSummary(
      { city, state },
      {
        walkScore: walkScoreData?.walkScore,
        walkScoreDescription: walkScoreData?.walkScoreDescription,
        transitScore: walkScoreData?.transitScore,
        bikeScore: walkScoreData?.bikeScore,
        nearbyPlaces,
        events,
      }
    )

    const output: NeighborhoodDataOutput = {
      walkScore: walkScoreData?.walkScore,
      walkScoreDescription: walkScoreData?.walkScoreDescription,
      transitScore: walkScoreData?.transitScore,
      transitScoreDescription: walkScoreData?.transitScoreDescription,
      bikeScore: walkScoreData?.bikeScore,
      bikeScoreDescription: walkScoreData?.bikeScoreDescription,
      nearbyPlaces,
      upcomingEvents: events,
      neighborhoodSummary: summaryResult.summary,
      researchedAt: new Date().toISOString(),
    }

    // If listing_id was provided, store the data in listing_campaigns
    if (neighborhoodInput.listing_id) {
      // Check if a campaign exists for this listing
      const { data: existingCampaign } = await db
        .from('listing_campaigns')
        .select('id')
        .eq('listing_id', neighborhoodInput.listing_id)
        .single()

      if (existingCampaign) {
        // Update existing campaign
        await db
          .from('listing_campaigns')
          .update({
            neighborhood_data: output as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCampaign.id)
      }
    }

    return {
      success: true,
      output: output as any,
      tokensUsed: summaryResult.tokensUsed,
    }
  } catch (error) {
    console.error('Neighborhood data agent error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'EXECUTION_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'neighborhood-data',
  name: 'Neighborhood Data',
  description:
    'Aggregates neighborhood data for lifestyle pages - nearby places (Google), events (Ticketmaster), Walk Score, and AI-generated neighborhood summary',
  category: 'lifestyle',
  executionMode: 'immediate',
  systemPrompt: NEIGHBORHOOD_SUMMARY_PROMPT,
  config: {
    maxTokens: 600,
    temperature: 0.7,
    timeout: 60000, // 60 seconds for multiple API calls
  },
  execute,
})
