import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePersonalizedQuestions } from '@/lib/listinglaunch/questions'

// Type not in generated Supabase types
interface NeighborhoodResearchData {
  overview?: string
  demographics?: Record<string, unknown>
  amenities?: Record<string, unknown>[]
  schools?: Record<string, unknown>[]
  walkScore?: number
  [key: string]: unknown
}

interface RouteParams {
  params: Promise<{ campaignId: string }>
}

// GET - Retrieve generated questions for a campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const supabase = createAdminClient()

    const { data: campaign, error } = await supabase
      .from('listing_campaigns')
      .select('id, status, generated_questions, neighborhood_data')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      questions: campaign.generated_questions || [],
      status: campaign.status,
      hasNeighborhoodData: !!campaign.neighborhood_data,
    })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

// POST - Generate personalized questions based on research
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const supabase = createAdminClient()

    // Get campaign with listing and neighborhood data
    const { data: campaign, error: campaignError } = await supabase
      .from('listing_campaigns')
      .select(`
        id,
        status,
        neighborhood_data,
        carousel_types,
        generated_questions,
        listing:listings(
          id,
          address,
          city,
          state,
          beds,
          baths,
          sqft,
          price
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if already has questions
    if (campaign.generated_questions && Array.isArray(campaign.generated_questions) && campaign.generated_questions.length > 0) {
      return NextResponse.json({
        questions: campaign.generated_questions,
        cached: true,
      })
    }

    // Verify campaign is in correct state
    if (campaign.status !== 'questions') {
      return NextResponse.json(
        { error: 'Campaign must complete research before generating questions' },
        { status: 400 }
      )
    }

    if (!campaign.neighborhood_data) {
      return NextResponse.json(
        { error: 'No neighborhood data available. Please run research first.' },
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
    }

    // Generate personalized questions
    const { questions, tokensUsed } = await generatePersonalizedQuestions(
      {
        address: listing.address,
        city: listing.city || '',
        state: listing.state || 'FL',
        beds: listing.beds || 0,
        baths: listing.baths || 0,
        sqft: listing.sqft || 0,
        price: listing.price || undefined,
      },
      campaign.neighborhood_data as NeighborhoodResearchData,
      campaign.carousel_types || ['property_highlights', 'neighborhood_guide', 'local_favorites']
    )

    // Store questions in campaign
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('listing_campaigns')
      .update({
        generated_questions: questions as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error saving questions:', updateError)
      return NextResponse.json(
        { error: 'Failed to save questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      questions,
      tokensUsed,
      cached: false,
    })
  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
