/**
 * Listing Skills API Route
 *
 * GET /api/admin/skills/listing?listing_id=xxx
 * Returns skill outputs and recent executions for a listing
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/api/middleware/require-staff'
import { getListingSkillOutputs, listSkillExecutions } from '@/lib/skills/execution-service'

export async function GET(request: NextRequest) {
  try {
    await requireStaff()

    const searchParams = request.nextUrl.searchParams
    const listingId = searchParams.get('listing_id')

    if (!listingId) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      )
    }

    // Get outputs and recent executions in parallel
    const [outputs, executions] = await Promise.all([
      getListingSkillOutputs(listingId),
      listSkillExecutions({ listing_id: listingId, limit: 20 }),
    ])

    return NextResponse.json({
      listing_id: listingId,
      outputs,
      executions,
    })
  } catch (error) {
    console.error('Listing skills error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
