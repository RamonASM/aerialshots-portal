import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RedeemRequest {
  agent_id: string
  reward_id: string
  credits_cost: number
  reward_type: 'ai' | 'discount' | 'premium'
}

export async function POST(request: NextRequest) {
  try {
    const body: RedeemRequest = await request.json()

    const { agent_id, reward_id, credits_cost, reward_type } = body

    if (!agent_id || !reward_id || !credits_cost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get agent and verify balance
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const currentBalance = agent.credit_balance ?? 0
    if (currentBalance < credits_cost) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    // Deduct credits
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        credit_balance: currentBalance - credits_cost,
      })
      .eq('id', agent_id)

    if (updateError) {
      console.error('Failed to deduct credits:', updateError)
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      )
    }

    // Create credit transaction
    await supabase.from('credit_transactions').insert({
      agent_id,
      amount: -credits_cost,
      type: 'redemption',
      description: `Redeemed: ${reward_id}`,
    })

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        agent_id,
        reward_type,
        reward_id,
        credits_cost,
        status: 'pending',
        metadata: JSON.parse(JSON.stringify({ reward_id })),
      })
      .select('id')
      .single()

    if (redemptionError) {
      console.error('Failed to create redemption:', redemptionError)
    }

    // Redemption is recorded - the reward is processed based on reward_type:
    // - 'ai': Enables AI feature access (checked via redemptions table)
    // - 'discount': Creates a discount code (applied at checkout)
    // - 'premium': Unlocks premium features

    return NextResponse.json({
      success: true,
      redemption_id: redemption?.id,
      new_balance: currentBalance - credits_cost,
    })
  } catch (error) {
    console.error('Redemption error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
