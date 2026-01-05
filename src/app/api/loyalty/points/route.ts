/**
 * Loyalty Points API
 *
 * Endpoints for managing loyalty points
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import {
  getAgentLoyaltySummary,
  getPointsHistory,
  awardBonusPoints,
  redeemPoints,
} from '@/lib/loyalty/service'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/clerk'

const agentIdSchema = z.string().uuid()

// GET - Get agent's loyalty summary and history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agentId')
  const historyOnly = searchParams.get('historyOnly') === 'true'

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
  }

  // Validate agentId is a valid UUID
  const parseResult = agentIdSchema.safeParse(agentId)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 })
  }

  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const isStaff = ['admin', 'photographer', 'videographer', 'qc'].includes(user.role)

  // Verify access: staff can view all, agents can only view their own
  if (!isStaff && (user.userTable !== 'agents' || user.userId !== agentId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (historyOnly) {
    const history = await getPointsHistory(agentId)
    return NextResponse.json({ history })
  }

  const summary = await getAgentLoyaltySummary(agentId)
  if (!summary) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const history = await getPointsHistory(agentId, 10)

  return NextResponse.json({
    summary,
    recentHistory: history,
  })
}

const awardPointsSchema = z.object({
  agentId: z.string().uuid(),
  points: z.number().int().positive(),
  description: z.string().min(1),
  source: z.string().optional(),
})

const redeemPointsSchema = z.object({
  agentId: z.string().uuid(),
  points: z.number().int().positive(),
  description: z.string().min(1),
})

// POST - Award or redeem points (staff only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const body = await request.json()
    const action = body.action

    if (action === 'award') {
      const parsed = awardPointsSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { agentId, points, description, source } = parsed.data
      const success = await awardBonusPoints(agentId, points, description, source || 'bonus')

      if (!success) {
        return NextResponse.json({ error: 'Failed to award points' }, { status: 500 })
      }

      return NextResponse.json({ success: true, points })
    }

    if (action === 'redeem') {
      const parsed = redeemPointsSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request', details: parsed.error.flatten() },
          { status: 400 }
        )
      }

      const { agentId, points, description } = parsed.data
      const success = await redeemPoints(agentId, points, description)

      if (!success) {
        return NextResponse.json(
          { error: 'Insufficient points or redemption failed' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, points })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
