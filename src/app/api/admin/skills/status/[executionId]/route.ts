/**
 * GET /api/admin/skills/status/[executionId]
 *
 * Gets the status and result of a skill execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

interface RouteParams {
  params: Promise<{ executionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireStaffAccess()

    const { executionId } = await params

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
      .from('skill_executions')
      .select('*')
      .eq('id', executionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Execution not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      id: data.id,
      skillId: data.skill_id,
      status: data.status,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      input: data.input,
      output: data.output,
      errorMessage: data.error_message,
      executionTimeMs: data.execution_time_ms,
      tokensUsed: data.tokens_used,
      costUsd: data.cost_usd,
      triggeredBy: data.triggered_by,
      triggerSource: data.trigger_source,
      listingId: data.listing_id,
      metadata: data.metadata,
    })
  } catch (error) {
    console.error('[Skills API] Error getting execution status:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get execution status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/skills/status/[executionId]
 *
 * Cancels a running skill execution
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireStaffAccess()

    const { executionId } = await params

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Only cancel if still running
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
      .from('skill_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId)
      .in('status', ['pending', 'running'])
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Execution not found or already completed' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      message: 'Execution cancelled',
    })
  } catch (error) {
    console.error('[Skills API] Error cancelling execution:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to cancel execution' },
      { status: 500 }
    )
  }
}
