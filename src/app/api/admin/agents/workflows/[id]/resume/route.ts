import { NextRequest, NextResponse } from 'next/server'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { resumeWorkflow } from '@/lib/agents/orchestrator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAccess()

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Resume the workflow
    const result = await resumeWorkflow(id)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Error resuming workflow:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume workflow' },
      { status: 500 }
    )
  }
}
