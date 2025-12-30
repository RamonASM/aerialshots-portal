/**
 * Drip Campaign Enrollment API
 *
 * Enroll contacts in drip campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import { enrollContact, getActiveCampaigns } from '@/lib/marketing/drip/service'
import { z } from 'zod'

const enrollmentSchema = z.object({
  campaign_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  check_existing: z.boolean().optional().default(true),
})

// POST - Enroll a contact in a campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const body = await request.json()
    const parsed = enrollmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await enrollContact(parsed.data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ enrollment: result.enrollment }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// GET - Get active campaigns (for enrollment UI)
export async function GET() {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const campaigns = await getActiveCampaigns()

    return NextResponse.json({ campaigns })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
