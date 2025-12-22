import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverCreditService } from '@/lib/credits/service'
import { requireAgent, requireStaff, getAgentByEmail, getAgentById } from '@/lib/middleware/auth'
import {
  handleApiError,
  resourceNotFound,
} from '@/lib/utils/errors'

/**
 * Get credit balance
 * GET /api/credits/balance
 *
 * Security:
 * - Authenticated users can only view their OWN balance
 * - Staff members can view any agent's balance (for admin operations)
 *
 * Query params:
 * - agent_id: string (optional, staff only)
 * - email: string (optional, staff only)
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const email = searchParams.get('email')

    let resolvedAgentId: string

    // If agent_id or email is provided, this is an admin lookup
    if (agentId || email) {
      // Require staff authentication for viewing other users' balances
      await requireStaff(supabase)

      if (agentId) {
        // Verify agent exists
        const agent = await getAgentById(supabase, agentId)
        if (!agent) {
          throw resourceNotFound('Agent', agentId)
        }
        resolvedAgentId = agent.id
      } else {
        // Resolve by email
        const agent = await getAgentByEmail(supabase, email!)
        if (!agent) {
          throw resourceNotFound('Agent', email!)
        }
        resolvedAgentId = agent.id
      }
    } else {
      // User is checking their own balance
      const { agent } = await requireAgent(supabase)
      resolvedAgentId = agent.id
    }

    const balance = await serverCreditService.getBalance(resolvedAgentId)
    return NextResponse.json(balance)
  })
}
