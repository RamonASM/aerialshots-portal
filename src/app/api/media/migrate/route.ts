/**
 * Media Migration API
 *
 * Migrates media from Aryeo CDN to native ASM storage.
 * Staff only endpoint for batch migration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MediaStorageService, type MediaType } from '@/lib/storage/media'

export const dynamic = 'force-dynamic'

// Max items to migrate in a single request
const BATCH_SIZE = 10

/**
 * POST /api/media/migrate
 * Migrate media from Aryeo to native storage
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabaseClient = await createClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Staff only
    if (!user.email?.endsWith('@aerialshots.media')) {
      return NextResponse.json(
        { error: 'Only staff can migrate media' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { listingId, mediaIds, batchSize = BATCH_SIZE } = body

    const supabase = createAdminClient()
    const storageService = new MediaStorageService()

    // Build query for assets to migrate
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('migration_status', 'pending')
      .not('aryeo_url', 'is', null)
      .limit(Math.min(batchSize, BATCH_SIZE))

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    if (mediaIds && Array.isArray(mediaIds)) {
      query = query.in('id', mediaIds)
    }

    const { data: assets, error: queryError } = await query

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to fetch assets to migrate' },
        { status: 500 }
      )
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assets to migrate',
        migrated: 0,
        failed: 0,
      })
    }

    // Mark assets as migrating
    await supabase
      .from('media_assets')
      .update({ migration_status: 'migrating' })
      .in(
        'id',
        assets.map((a) => a.id)
      )

    // Migrate each asset
    const results: Array<{
      id: string
      success: boolean
      error?: string
    }> = []

    for (const asset of assets) {
      if (!asset.aryeo_url) {
        results.push({ id: asset.id, success: false, error: 'No aryeo_url' })
        continue
      }

      try {
        // Determine media type
        const mediaType = (asset.type as MediaType) || 'photo'

        // Migrate from Aryeo
        const migrateResult = await storageService.migrateFromAryeo({
          listingId: asset.listing_id,
          aryeoUrl: asset.aryeo_url,
          type: mediaType,
          category: asset.category || undefined,
          originalMetadata: {
            originalId: asset.id,
            originalFilename: asset.original_filename,
          },
        })

        if (!migrateResult.success) {
          // Mark as failed
          await supabase
            .from('media_assets')
            .update({ migration_status: 'failed' })
            .eq('id', asset.id)

          results.push({
            id: asset.id,
            success: false,
            error: migrateResult.error,
          })
          continue
        }

        // Update the asset with new URL
        await supabase.from('media_assets').update({
          media_url: migrateResult.newUrl,
          storage_path: migrateResult.path,
          storage_bucket: storageService['supabase'] ? undefined : undefined, // Would need bucket from result
          migration_status: 'completed',
          migrated_at: new Date().toISOString(),
        }).eq('id', asset.id)

        results.push({ id: asset.id, success: true })
      } catch (err) {
        // Mark as failed
        await supabase
          .from('media_assets')
          .update({ migration_status: 'failed' })
          .eq('id', asset.id)

        results.push({
          id: asset.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const migrated = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      migrated,
      failed,
      total: assets.length,
      results,
    })
  } catch (error) {
    console.error('[Media Migration API] Error:', error)
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/media/migrate
 * Get migration status and stats
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabaseClient = await createClient()
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Staff only
    if (!user.email?.endsWith('@aerialshots.media')) {
      return NextResponse.json(
        { error: 'Only staff can view migration status' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')

    const supabase = createAdminClient()

    // Get migration stats
    let query = supabase
      .from('media_assets')
      .select('migration_status')

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    const { data: assets, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    const stats = {
      total: assets?.length || 0,
      pending: assets?.filter((a) => a.migration_status === 'pending').length || 0,
      migrating: assets?.filter((a) => a.migration_status === 'migrating').length || 0,
      completed: assets?.filter((a) => a.migration_status === 'completed').length || 0,
      failed: assets?.filter((a) => a.migration_status === 'failed').length || 0,
    }

    const percentComplete = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0

    return NextResponse.json({
      stats,
      percentComplete,
      listingId: listingId || 'all',
    })
  } catch (error) {
    console.error('[Media Migration API] GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    )
  }
}
