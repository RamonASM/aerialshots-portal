import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, aiPrompts } from '@/lib/ai/client'

const CREDIT_COST = 40

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
      .select('id, credit_balance')
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
    const { listing_id, address, city, beds, baths, sqft, features, duration } = body

    if (!address || !beds || !baths || !sqft) {
      return NextResponse.json(
        { error: 'Missing required property details' },
        { status: 400 }
      )
    }

    const prompt = aiPrompts.videoScript({
      address,
      city: city || 'Central Florida',
      beds,
      baths,
      sqft,
      features,
      duration: duration || 60,
    })

    const result = await generateWithAI({ prompt, maxTokens: 2500 })

    let script: { scenes: Array<Record<string, string>> }
    try {
      script = JSON.parse(result.content)
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/)
      script = match ? JSON.parse(match[0]) : { scenes: [{ narration: result.content }] }
    }

    await supabase
      .from('agents')
      .update({ credit_balance: (agent.credit_balance || 0) - CREDIT_COST })
      .eq('id', agent.id)

    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -CREDIT_COST,
      type: 'redemption',
      description: 'Video Script Generator',
    })

    await supabase.from('ai_tool_usage').insert({
      agent_id: agent.id,
      listing_id: listing_id || null,
      tool_type: 'video_script',
      input: JSON.parse(JSON.stringify({ address, beds, baths, sqft, duration })),
      output: JSON.parse(JSON.stringify({ script })),
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      script,
      creditsUsed: CREDIT_COST,
      newBalance: (agent.credit_balance || 0) - CREDIT_COST,
    })
  } catch (error) {
    console.error('AI video script error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
