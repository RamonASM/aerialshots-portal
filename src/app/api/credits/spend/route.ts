import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverCreditService, CreditTransactionType } from '@/lib/credits/service'
import { requireAgent, requireStaff, getAgentByEmail, getAgentById } from '@/lib/middleware/auth'
import {
  handleApiError,
  badRequest,
  resourceNotFound,
  paymentRequired,
} from '@/lib/utils/errors'

/**
 * Spend credits
 * POST /api/credits/spend
 *
 * Security:
 * - Authenticated users can only spend their OWN credits
 * - Staff members can spend credits on behalf of any agent (for admin operations)
 *
 * Body:
 * - amount: number (required)
 * - type: CreditTransactionType (required)
 * - description: string (required)
 * - agent_id: string (optional, staff only)
 * - email: string (optional, staff only)
 * - source_platform: 'asm_portal' | 'storywork' (optional)
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
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

    // Validate required fields
    if (!amount || amount <= 0) {
      throw badRequest('Valid amount is required')
    }
    if (!type) {
      throw badRequest('Transaction type is required')
    }
    if (!description) {
      throw badRequest('Description is required')
    }

    let resolvedAgentId: string

    // If agent_id or email is provided, this is an admin operation
    if (agent_id || email) {
      // Require staff authentication for spending other users' credits
      await requireStaff(supabase)

      if (agent_id) {
        // Verify agent exists
        const agent = await getAgentById(supabase, agent_id)
        if (!agent) {
          throw resourceNotFound('Agent', agent_id)
        }
        resolvedAgentId = agent.id
      } else {
        // Resolve by email
        const agent = await getAgentByEmail(supabase, email)
        if (!agent) {
          throw resourceNotFound('Agent', email)
        }
        resolvedAgentId = agent.id
      }
    } else {
      // User is spending their own credits
      const { agent } = await requireAgent(supabase)
      resolvedAgentId = agent.id
    }

    // Perform the credit spend operation
    const result = await serverCreditService.spendCredits(
      resolvedAgentId,
      amount,
      type as CreditTransactionType,
      description,
      source_platform as 'asm_portal' | 'storywork'
    )

    if (!result.success) {
      if (result.error === 'Insufficient credits') {
        throw paymentRequired('Insufficient credits', {
          required: amount,
          balance: result.newBalance,
        })
      }
      throw badRequest(result.error || 'Failed to spend credits')
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
    })
  })
}
