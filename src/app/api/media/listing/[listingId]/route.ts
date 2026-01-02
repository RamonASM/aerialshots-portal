/**
 * Listing Media API
 *
 * Get all media for a listing with resolved URLs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMediaUrl, getMediaUrlSource, getMigrationStats } from '@/lib/storage/resolve-url'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ listingId: string }>
}

/**
 * GET /api/media/listing/[listingId]
 * Get all media for a listing
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params
    const { searchParams } = new URL(request.url)

    // Query params
    const type = searchParams.get('type') // photo, video, floor_plan, etc.
    const category = searchParams.get('category') // interior, exterior, etc.
    const qcStatus = searchParams.get('qcStatus') // pending, approved, rejected
    const includeStats = searchParams.get('includeStats') === 'true'

    const supabase = createAdminClient()

    // Build query
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (qcStatus) {
      query = query.eq('qc_status', qcStatus)
    }

    const { data: assets, error } = await query

    if (error) {
      console.error('[Listing Media API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 500 }
      )
    }

    // Transform assets with resolved URLs
    const media = (assets || []).map((asset) => ({
      id: asset.id,
      url: resolveMediaUrl(asset),
      urlSource: getMediaUrlSource(asset),
      type: asset.type,
      category: asset.category,
      sortOrder: asset.sort_order,
      tipText: asset.tip_text,
      qcStatus: asset.qc_status,
      qcNotes: asset.qc_notes,
      createdAt: asset.created_at,
    }))

    // Group by type
    const byType = media.reduce(
      (acc, item) => {
        const t = item.type || 'other'
        if (!acc[t]) acc[t] = []
        acc[t].push(item)
        return acc
      },
      {} as Record<string, typeof media>
    )

    // Build response
    const response: Record<string, unknown> = {
      listingId,
      total: media.length,
      media,
      byType,
    }

    // Include migration stats if requested
    if (includeStats && assets) {
      response.migrationStats = getMigrationStats(assets)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Listing Media API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing media' },
      { status: 500 }
    )
  }
}
