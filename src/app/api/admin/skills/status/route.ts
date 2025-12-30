/**
 * Skill Status API Route
 *
 * GET /api/admin/skills/status?execution_id=xxx
 * DELETE /api/admin/skills/status?execution_id=xxx (cancel)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/api/middleware/require-staff'
import { getSkillExecution, cancelSkillExecution, retrySkillExecution } from '@/lib/skills/execution-service'

export async function GET(request: NextRequest) {
  try {
    await requireStaff()

    const executionId = request.nextUrl.searchParams.get('execution_id')

    if (!executionId) {
      return NextResponse.json(
        { error: 'execution_id is required' },
        { status: 400 }
      )
    }

    const execution = await getSkillExecution(executionId)

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ execution })
  } catch (error) {
    console.error('Skill status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireStaff()

    const executionId = request.nextUrl.searchParams.get('execution_id')

    if (!executionId) {
      return NextResponse.json(
        { error: 'execution_id is required' },
        { status: 400 }
      )
    }

    const result = await cancelSkillExecution(executionId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, execution: result.execution })
  } catch (error) {
    console.error('Cancel skill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff()

    const body = await request.json()
    const { execution_id, action } = body

    if (!execution_id) {
      return NextResponse.json(
        { error: 'execution_id is required' },
        { status: 400 }
      )
    }

    if (action === 'retry') {
      const result = await retrySkillExecution(execution_id)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        execution: result.execution,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Skill action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
