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

// GET - Get agent's loyalty summary and history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agentId')
  const historyOnly = searchParams.get('historyOnly') === 'true'

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify access - agent can view own, staff can view all
  const { data: { user } } = await supabase.auth.getUser()
  const isStaff = user?.email?.endsWith('@aerialshots.media')

  if (!isStaff && user?.id !== agentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
