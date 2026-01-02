/**
 * Individual Media Item API
 *
 * Get, update, or delete a specific media item.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MediaStorageService } from '@/lib/storage/media'
import { resolveMediaUrl, getMediaUrlSource } from '@/lib/storage/resolve-url'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/media/[id]
 * Get a single media asset
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: asset, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: asset.id,
      listingId: asset.listing_id,
      url: resolveMediaUrl(asset),
      urlSource: getMediaUrlSource(asset),
      type: asset.type,
      category: asset.category,
      sortOrder: asset.sort_order,
      qcStatus: asset.qc_status,
      qcNotes: asset.qc_notes,
      createdAt: asset.created_at,
    })
  } catch (error) {
    console.error('[Media API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/media/[id]
 * Update media metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify authentication
    const supabaseClient = await createClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if staff
    const isStaff = user.email?.endsWith('@aerialshots.media') || false
    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can update media' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { category, sortOrder, tipText, qcStatus, qcNotes } = body

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (category !== undefined) updateData.category = category
    if (sortOrder !== undefined) updateData.sort_order = sortOrder
    if (tipText !== undefined) updateData.tip_text = tipText
    if (qcStatus !== undefined) updateData.qc_status = qcStatus
    if (qcNotes !== undefined) updateData.qc_notes = qcNotes

    const { data: asset, error } = await supabase
      .from('media_assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        url: resolveMediaUrl(asset),
        category: asset.category,
        sortOrder: asset.sort_order,
        qcStatus: asset.qc_status,
      },
    })
  } catch (error) {
    console.error('[Media API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/media/[id]
 * Delete a media asset
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verify authentication
    const supabaseClient = await createClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if staff
    const isStaff = user.email?.endsWith('@aerialshots.media') || false
    if (!isStaff) {
      return NextResponse.json(
        { error: 'Only staff can delete media' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Get the asset first
    const { data: asset, error: fetchError } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Delete from storage if it's in native storage
    if (asset.storage_path) {
      const storageService = new MediaStorageService()
      // Storage bucket is determined by file type (media-assets is default)
      await storageService.delete('media-assets', asset.storage_path)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
    })
  } catch (error) {
    console.error('[Media API] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    )
  }
}
