import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ campaignId: string }>
}

interface AgentAnswer {
  questionId: string
  answer: string
}

// POST - Submit agent answers and move to generation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const body = await request.json()
    const { answers } = body as { answers: AgentAnswer[] }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers array is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get campaign to verify status
    const { data: campaign, error: campaignError } = await supabase
      .from('listing_campaigns')
      .select('id, status, generated_questions')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.status !== 'questions') {
      return NextResponse.json(
        { error: 'Campaign is not in questions phase' },
        { status: 400 }
      )
    }

    // Build answers object keyed by question ID
    const answersMap: Record<string, string> = {}
    for (const answer of answers) {
      if (answer.questionId && answer.answer?.trim()) {
        answersMap[answer.questionId] = answer.answer.trim()
      }
    }

    // Verify at least 3 answers were provided (matches frontend validation)
    if (Object.keys(answersMap).length < 3) {
      return NextResponse.json(
        { error: 'At least 3 answers are required to generate quality content' },
        { status: 400 }
      )
    }

    // Update campaign with answers and move to generating status
    const { error: updateError } = await supabase
      .from('listing_campaigns')
      .update({
        agent_answers: answersMap,
        status: 'generating',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('Error saving answers:', updateError)
      return NextResponse.json(
        { error: 'Failed to save answers' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      campaignId,
      status: 'generating',
      answersCount: Object.keys(answersMap).length,
    })
  } catch (error) {
    console.error('Answer submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    )
  }
}

// GET - Retrieve submitted answers
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params
    const supabase = createAdminClient()

    const { data: campaign, error } = await supabase
      .from('listing_campaigns')
      .select('id, agent_answers, generated_questions')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      answers: campaign.agent_answers || {},
      questions: campaign.generated_questions || [],
    })
  } catch (error) {
    console.error('Error fetching answers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch answers' },
      { status: 500 }
    )
  }
}
