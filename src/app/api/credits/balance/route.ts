import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverCreditService } from '@/lib/credits/service'

// Get credit balance for authenticated user or by agent_id (for cross-platform)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const email = searchParams.get('email')

    // If agent_id provided directly (for cross-platform calls)
    if (agentId) {
      const balance = await serverCreditService.getBalance(agentId)
      return NextResponse.json(balance)
    }

    // If email provided (for linking accounts)
    if (email) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('email', email)
        .single()

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }

      const balance = await serverCreditService.getBalance(agent.id)
      return NextResponse.json(balance)
    }

    // Otherwise use authenticated user
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

    const balance = await serverCreditService.getBalance(agent.id)
    return NextResponse.json(balance)
  } catch (error) {
    console.error('Credits balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
