import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import { handleApiError, databaseError } from '@/lib/utils/errors'

/**
 * Get QC queue
 * GET /api/admin/qc/queue
 *
 * Returns listings that are ready for QC or in QC,
 * sorted by priority (rush + wait time)
 *
 * Requires staff authentication
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require staff authentication
    await requireStaff(supabase)

    // Get filter parameters
    const { searchParams } = new URL(request.url)
    const photographerId = searchParams.get('photographer_id')

    // Build query for ready_for_qc and in_qc listings
    let query = supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        ops_status,
        is_rush,
        scheduled_at,
        delivered_at,
        updated_at,
        photographer_id,
        media_assets (
          id,
          qc_status
        )
      `)
      .in('ops_status', ['ready_for_qc', 'in_qc'])
      .order('is_rush', { ascending: false })
      .order('updated_at', { ascending: true })

    if (photographerId) {
      query = query.eq('photographer_id', photographerId)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      throw databaseError(listingsError, 'fetching QC queue')
    }

    // Get unique photographer IDs
    const photographerIds = [
      ...new Set(listings?.map((l) => l.photographer_id).filter(Boolean) as string[]),
    ]

    // Get photographer/staff details
    const { data: photographers } =
      photographerIds.length > 0
        ? await supabase.from('staff').select('id, name').in('id', photographerIds)
        : { data: [] }

    // Calculate priority score and time metrics for each listing
    const priorityQueue =
      listings?.map((listing) => {
        const now = new Date()
        const updatedAt = new Date(listing.updated_at || now)
        const hoursWaiting = Math.floor(
          (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
        )

        // Calculate priority score
        // Rush jobs get +100, hours waiting adds points
        let priorityScore = hoursWaiting
        if (listing.is_rush) {
          priorityScore += 100
        }
        if (listing.ops_status === 'in_qc') {
          priorityScore += 50 // Boost in-progress items
        }

        // Determine priority level
        let priorityLevel: 'high' | 'medium' | 'low'
        if (listing.is_rush && hoursWaiting > 2) {
          priorityLevel = 'high'
        } else if (hoursWaiting > 4) {
          priorityLevel = 'medium'
        } else {
          priorityLevel = 'low'
        }

        const photographer = photographers?.find((p) => p.id === listing.photographer_id)

        return {
          ...listing,
          photographer,
          priorityScore,
          priorityLevel,
          hoursWaiting,
        }
      }) || []

    // Sort by priority score (highest first)
    priorityQueue.sort((a, b) => b.priorityScore - a.priorityScore)

    return NextResponse.json({
      queue: priorityQueue,
      total: priorityQueue.length,
    })
  })
}
