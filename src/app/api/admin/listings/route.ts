import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { handleApiError, databaseError } from '@/lib/utils/errors'

/**
 * Get listings for admin operations
 * GET /api/admin/listings
 *
 * Query params:
 * - status: filter by ops_status
 * - unassigned_photographer: only show listings without photographer
 * - unassigned_editor: only show listings without editor
 * - include_all: include all statuses
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const unassignedPhotographer = searchParams.get('unassigned_photographer') === 'true'
    const unassignedEditor = searchParams.get('unassigned_editor') === 'true'
    const includeAll = searchParams.get('include_all') === 'true'

    let query = supabase
      .from('listings')
      .select('id, address, city, state, ops_status, scheduled_at, photographer_id, editor_id, is_rush, created_at')
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    // Apply filters
    if (status) {
      query = query.eq('ops_status', status)
    } else if (!includeAll) {
      // By default, exclude pending and delivered
      query = query.not('ops_status', 'in', '(pending,delivered,cancelled)')
    }

    if (unassignedPhotographer) {
      query = query.is('photographer_id', null)
    }

    if (unassignedEditor) {
      query = query.is('editor_id', null)
    }

    const { data: listings, error } = await query.limit(100)

    if (error) {
      throw databaseError(error, 'fetching listings')
    }

    return NextResponse.json({
      listings: listings || [],
      total: listings?.length || 0,
    })
  })
}
