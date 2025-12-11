import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, aiPrompts } from '@/lib/ai/client'

const CREDIT_COST = 25

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, credit_balance')
      .eq('email', user.email!)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check credits
    if ((agent.credit_balance || 0) < CREDIT_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: CREDIT_COST, balance: agent.credit_balance },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { listing_id, address, city, state, beds, baths, sqft, features, neighborhood } = body

    if (!address || !beds || !baths || !sqft) {
      return NextResponse.json(
        { error: 'Missing required property details' },
        { status: 400 }
      )
    }

    // Generate content
    const prompt = aiPrompts.listingDescription({
      address,
      city: city || 'Central Florida',
      state: state || 'FL',
      beds,
      baths,
      sqft,
      features,
      neighborhood,
    })

    const result = await generateWithAI({ prompt, maxTokens: 2000 })

    // Parse the JSON response
    let descriptions: string[]
    try {
      descriptions = JSON.parse(result.content)
    } catch {
      // If not valid JSON, try to extract from text
      const match = result.content.match(/\[[\s\S]*\]/)
      descriptions = match ? JSON.parse(match[0]) : [result.content]
    }

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
      description: 'Listing Description Generator',
    })

    // Log AI tool usage
    await supabase.from('ai_tool_usage').insert({
      agent_id: agent.id,
      listing_id: listing_id || null,
      tool_type: 'listing_description',
      input: JSON.parse(JSON.stringify({ address, beds, baths, sqft })),
      output: JSON.parse(JSON.stringify({ descriptions })),
      tokens_used: result.tokensUsed,
    })

    return NextResponse.json({
      descriptions,
      creditsUsed: CREDIT_COST,
      newBalance: (agent.credit_balance || 0) - CREDIT_COST,
    })
  } catch (error) {
    console.error('AI listing description error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
