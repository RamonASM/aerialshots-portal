import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, aiPrompts } from '@/lib/ai/client'

const CREDIT_COST = 30

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
    const { city, state, neighborhood, nearbyPlaces } = body

    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }

    const prompt = aiPrompts.neighborhoodGuide({
      city,
      state: state || 'FL',
      neighborhood,
      nearbyPlaces,
    })

    const result = await generateWithAI({ prompt, maxTokens: 2000 })

    let guide: Record<string, string>
    try {
      guide = JSON.parse(result.content)
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/)
      guide = match ? JSON.parse(match[0]) : { overview: result.content }
    }

    await supabase
      .from('agents')
      .update({ credit_balance: (agent.credit_balance || 0) - CREDIT_COST })
      .eq('id', agent.id)

    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -CREDIT_COST,
      type: 'redemption',
      description: 'Neighborhood Guide Generator',
    })

    await supabase.from('ai_tool_usage').insert({
      agent_id: agent.id,
      tool_type: 'neighborhood_guide',
      input: JSON.parse(JSON.stringify({ city, neighborhood })),
      output: JSON.parse(JSON.stringify({ guide })),
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      guide,
      creditsUsed: CREDIT_COST,
      newBalance: (agent.credit_balance || 0) - CREDIT_COST,
    })
  } catch (error) {
    console.error('AI neighborhood guide error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
