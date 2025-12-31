/**
 * GET /api/admin/skills/listing/[listingId]
 *
 * Gets all skill executions for a specific listing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // Verify staff access
    await requireStaff(supabase)

    const { listingId } = await params

    if (!listingId) {
      return NextResponse.json(
        { error: 'Listing ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get all executions for this listing
    const { data: executions, error: execError } = await adminClient
      .from('skill_executions')
      .select('*')
      .eq('listing_id', listingId)
      .order('started_at', { ascending: false })
      .limit(50)

    if (execError) {
      throw execError
    }

    // Get skill outputs for this listing
    const { data: outputs, error: outputError } = await adminClient
      .from('listing_skill_outputs')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (outputError && outputError.code !== 'PGRST116') {
      console.warn('[Skills API] Error fetching outputs:', outputError)
    }

    // Map executions to response format
    const mappedExecutions = (executions || []).map((exec: Record<string, unknown>) => ({
      id: exec.id,
      skillId: exec.skill_id,
      status: exec.status,
      startedAt: exec.started_at,
      completedAt: exec.completed_at,
      executionTimeMs: exec.execution_time_ms,
      tokensUsed: exec.tokens_used,
      costUsd: exec.cost_usd,
      triggeredBy: exec.triggered_by,
      triggerSource: exec.trigger_source,
      errorMessage: exec.error_message,
    }))

    // Map outputs to response format
    const mappedOutputs = (outputs || []).map((output: Record<string, unknown>) => ({
      id: output.id,
      skillId: output.skill_id,
      outputType: output.output_type,
      outputData: output.output_data,
      status: output.status,
      executionId: output.execution_id,
      createdAt: output.created_at,
      updatedAt: output.updated_at,
    }))

    // Aggregate stats
    const stats = {
      totalExecutions: mappedExecutions.length,
      completed: mappedExecutions.filter((e: { status: string }) => e.status === 'completed').length,
      failed: mappedExecutions.filter((e: { status: string }) => e.status === 'failed').length,
      running: mappedExecutions.filter((e: { status: string }) => e.status === 'running').length,
      pending: mappedExecutions.filter((e: { status: string }) => e.status === 'pending').length,
      totalOutputs: mappedOutputs.length,
    }

    return NextResponse.json({
      executions: mappedExecutions,
      outputs: mappedOutputs,
      stats,
    })
  } catch (error) {
    console.error('[Skills API] Error getting listing executions:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get listing executions' },
      { status: 500 }
    )
  }
}
