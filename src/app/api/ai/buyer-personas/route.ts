import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, aiPrompts } from '@/lib/ai/client'

const CREDIT_COST = 35

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
    const { listing_id, address, beds, baths, sqft, price, style, neighborhood } = body

    if (!beds || !baths || !sqft) {
      return NextResponse.json(
        { error: 'Missing required property details' },
        { status: 400 }
      )
    }

    const prompt = aiPrompts.buyerPersonas({
      address: address || 'Property',
      beds,
      baths,
      sqft,
      price,
      style,
      neighborhood,
    })

    const result = await generateWithAI({ prompt, maxTokens: 2000 })

    let personas: Array<Record<string, string>>
    try {
      personas = JSON.parse(result.content)
    } catch {
      const match = result.content.match(/\[[\s\S]*\]/)
      personas = match ? JSON.parse(match[0]) : [{ error: result.content }]
    }

    await supabase
      .from('agents')
      .update({ credit_balance: (agent.credit_balance || 0) - CREDIT_COST })
      .eq('id', agent.id)

    await supabase.from('credit_transactions').insert({
      agent_id: agent.id,
      amount: -CREDIT_COST,
      type: 'redemption',
      description: 'Buyer Persona Analysis',
    })

    await supabase.from('ai_tool_usage').insert({
      agent_id: agent.id,
      listing_id: listing_id || null,
      tool_type: 'buyer_personas',
      input: JSON.parse(JSON.stringify({ beds, baths, sqft, price })),
      output: JSON.parse(JSON.stringify({ personas })),
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      personas,
      creditsUsed: CREDIT_COST,
      newBalance: (agent.credit_balance || 0) - CREDIT_COST,
    })
  } catch (error) {
    console.error('AI buyer personas error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
