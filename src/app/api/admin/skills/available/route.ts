/**
 * Available Skills API Route
 *
 * GET /api/admin/skills/available
 * Returns list of available skills and their configurations
 */

import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/api/middleware/require-staff'
import { listSkills } from '@/lib/skills'

export async function GET() {
  try {
    await requireStaff()

    const skills = listSkills()

    return NextResponse.json({
      skills: skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        version: skill.version,
        description: skill.description,
        inputSchema: skill.inputSchema,
        outputSchema: skill.outputSchema,
      })),
      count: skills.length,
    })
  } catch (error) {
    console.error('Available skills error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
