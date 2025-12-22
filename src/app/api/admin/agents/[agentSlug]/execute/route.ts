import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAgent } from '@/lib/agents'

interface RouteContext {
  params: Promise<{ agentSlug: string }>
}

/**
 * POST /api/admin/agents/[agentSlug]/execute
 * Manually execute an AI agent
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { agentSlug } = await params

    // Verify user is authenticated staff
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const adminSupabase = createAdminClient()
    const { data: staff } = await adminSupabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse input from request body (optional)
    let input: Record<string, unknown> = {}
    try {
      const body = await request.json()
      input = body.input || {}
    } catch {
      // No body or invalid JSON, use empty input
    }

    // Execute the agent
    const result = await executeAgent({
      agentSlug,
      triggerSource: 'manual',
      input,
      triggeredBy: staff.id,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      tokensUsed: result.tokensUsed,
    })
  } catch (error) {
    console.error('Agent execution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
