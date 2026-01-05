import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findBestMatch, getRequiredSkills, SKILL_CATEGORIES } from '@/lib/scheduling/skill-match'

// POST /api/admin/team/assignments/candidates - Find best photographer matches for a job
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify staff access
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { services, propertyType, lat, lng, zip_code, date } = body

    if (!services?.length) {
      return NextResponse.json({ error: 'Services are required' }, { status: 400 })
    }

    // Get required skills
    const requiredSkills = getRequiredSkills(services)

    // Find matching photographers
    const candidates = await findBestMatch({
      services,
      propertyType,
      lat,
      lng,
      zip_code,
      date,
    })

    // Format response with skill names
    const formattedCandidates = candidates.map(c => ({
      ...c,
      matchDetails: {
        ...c.matchDetails,
        requiredSkillNames: c.matchDetails.requiredSkills.map(
          s => SKILL_CATEGORIES[s] || s
        ),
        matchedSkillNames: c.matchDetails.matchedSkills.map(
          s => SKILL_CATEGORIES[s] || s
        ),
        missingSkillNames: c.matchDetails.missingSkills.map(
          s => SKILL_CATEGORIES[s] || s
        ),
      },
    }))

    return NextResponse.json({
      candidates: formattedCandidates,
      requirements: {
        services,
        requiredSkills: requiredSkills.map(s => ({
          key: s,
          name: SKILL_CATEGORIES[s] || s,
        })),
        propertyType,
        location: { lat, lng, zip_code },
      },
    })
  } catch (error) {
    console.error('Assignment candidates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/team/assignments/candidates - Get skill categories reference
export async function GET() {
  try {
    return NextResponse.json({
      skillCategories: Object.entries(SKILL_CATEGORIES).map(([key, name]) => ({
        key,
        name,
      })),
    })
  } catch (error) {
    console.error('Skills GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
