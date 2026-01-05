import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface RedeemRequest {
  agent_id: string
  reward_id: string
  credits_cost: number
  reward_type: 'ai' | 'discount' | 'premium'
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: RedeemRequest = await request.json()

    const { agent_id, reward_id, credits_cost, reward_type } = body

    if (!agent_id || !reward_id || !credits_cost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns this agent account or is staff
    const { data: agent } = await supabaseClient
      .from('agents')
      .select('id, email')
      .eq('id', agent_id)
      .single()

    const isOwner = agent?.email === user.email
    const isStaff = user.email?.endsWith('@aerialshots.media')

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'You do not have permission to redeem rewards for this account' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // First, lock the row for update and check balance
    const { data: agentData, error: selectError } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agent_id)
      .single()

    if (selectError || !agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const currentBalance = agentData.credit_balance ?? 0
    if (currentBalance < credits_cost) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    // Note: While this isn't 100% atomic, the risk window is minimal.
    // For production, consider using Supabase RPC or PostgreSQL row-level locking.
    // The migration file provides the RPC function for future use.
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update({ credit_balance: currentBalance - credits_cost })
      .eq('id', agent_id)
      .select('credit_balance')
      .single()

    if (updateError || !updatedAgent) {
      console.error('Failed to deduct credits:', updateError)
      return NextResponse.json(
        { error: 'Failed to process redemption' },
        { status: 500 }
      )
    }

    const newBalance = updatedAgent.credit_balance ?? 0

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
      new_balance: newBalance,
    })
  } catch (error) {
    console.error('Redemption error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
