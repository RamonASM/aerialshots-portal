import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI } from '@/lib/ai/client'
import { generateStoryContentPrompt, storyTypes } from '@/lib/storywork/prompts'

const CREDIT_COST = 75

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, credit_balance')
      .eq('email', user.email!)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if ((agent.credit_balance || 0) < CREDIT_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: CREDIT_COST, balance: agent.credit_balance },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { storyId } = body

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 })
    }

    // Get the story
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: story, error: storyError } = await (supabase as any)
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .eq('agent_id', agent.id)
      .single() as { data: { id: string; agent_id: string; story_type: string; guided_answers: Record<string, string>; status: string; title: string } | null; error: Error | null }

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Build the prompt
    const storyType = story.story_type as keyof typeof storyTypes
    const answers = (story.guided_answers as Record<string, string>) || {}

    const prompt = generateStoryContentPrompt(storyType, answers, agent.name)

    // Generate content
    const result = await generateWithAI({ prompt, maxTokens: 3000, temperature: 0.8 })

    // Parse the response
    let content: {
      slides: Array<{ headline: string; body: string; visual_suggestion: string }>
      hashtags: string[]
      caption: string
    }

    try {
      content = JSON.parse(result.content)
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/)
      if (match) {
        content = JSON.parse(match[0])
      } else {
        return NextResponse.json(
          { error: 'Failed to parse generated content' },
          { status: 500 }
        )
      }
    }

    // Update the story
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('stories')
      .update({
        generated_content: JSON.parse(JSON.stringify(content)),
        status: 'completed',
        credits_used: CREDIT_COST,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)

    // Deduct credits
    await supabase
      .from('agents')
      .update({ credit_balance: (agent.credit_balance || 0) - CREDIT_COST })
      .eq('id', agent.id)

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -CREDIT_COST,
      type: 'redemption',
      description: `Storywork: ${story.title}`,
    })

    return NextResponse.json({
      content,
      creditsUsed: CREDIT_COST,
      newBalance: (agent.credit_balance || 0) - CREDIT_COST,
    })
  } catch (error) {
    console.error('Storywork generate error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
