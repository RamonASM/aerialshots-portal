import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverCreditService, CreditTransactionType } from '@/lib/credits/service'

// Spend credits - can be called by authenticated user or via service-to-service
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      agent_id,
      email,
      amount,
      type,
      description,
      source_platform = 'asm_portal',
    } = body

    if (!amount || !type || !description) {
      return NextResponse.json(
        { error: 'Amount, type, and description are required' },
        { status: 400 }
      )
    }

    let resolvedAgentId = agent_id

    // Resolve agent_id from email if provided
    if (!resolvedAgentId && email) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', email)
        .single()

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }

      resolvedAgentId = agent.id
    }

    // If still no agent_id, use authenticated user
    if (!resolvedAgentId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }

      resolvedAgentId = agent.id
    }

    const result = await serverCreditService.spendCredits(
      resolvedAgentId,
      amount,
      type as CreditTransactionType,
      description,
      source_platform as 'asm_portal' | 'storywork'
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, balance: result.newBalance },
        { status: result.error === 'Insufficient credits' ? 402 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
    })
  } catch (error) {
    console.error('Credits spend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
