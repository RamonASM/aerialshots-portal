/**
 * Skill Execute API Route
 *
 * POST /api/admin/skills/execute
 * Executes a skill and tracks the execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/api/middleware/require-staff'
import { SkillExecutionService } from '@/lib/skills/execution-service'

export async function POST(request: NextRequest) {
  try {
    // Verify staff authentication
    const staff = await requireStaff()

    // Parse request body
    const body = await request.json()
    const { skill_id, input, listing_id, agent_id } = body

    // Validate required fields
    if (!skill_id) {
      return NextResponse.json(
        { error: 'skill_id is required' },
        { status: 400 }
      )
    }

    // Execute the skill
    const service = new SkillExecutionService()
    const result = await service.executeSkill(skill_id, input || {}, {
      listing_id,
      agent_id,
      staff_id: staff.id,
      triggered_by: staff.email,
      trigger_source: 'manual',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Skill execution error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
