/**
 * Media Upload API
 *
 * Handles media uploads to ASM native storage (Supabase Storage).
 * Replaces Aryeo CDN for new uploads.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  MediaStorageService,
  type MediaType,
  validateMediaFile,
  getMediaBucket,
} from '@/lib/storage/media'

export const dynamic = 'force-dynamic'

// Rate limit: 50 uploads per minute per user
const RATE_LIMIT = 50
const RATE_WINDOW = 60 * 1000 // 1 minute

// In-memory rate limiting (for single-instance deployments)
const uploadCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = uploadCounts.get(userId)

  if (!record || record.resetAt < now) {
    uploadCounts.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

/**
 * POST /api/media/upload
 * Upload media files to native storage
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

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 50 uploads per minute.' },
        { status: 429 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const listingId = formData.get('listingId') as string
    const mediaType = (formData.get('type') as MediaType) || 'photo'
    const category = formData.get('category') as string | null
    const files = formData.getAll('files') as File[]

    // Validate required fields
    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this listing
    const supabase = createAdminClient()
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, agent_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if user is staff or the listing's agent
    const isStaff = user.email?.endsWith('@aerialshots.media') || false
    if (!isStaff) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!agent || agent.id !== listing.agent_id) {
        return NextResponse.json(
          { error: 'Access denied to this listing' },
          { status: 403 }
        )
      }
    }

    // Process uploads
    const storageService = new MediaStorageService()
    const results: Array<{
      filename: string
      success: boolean
      url?: string
      error?: string
    }> = []

    for (const file of files) {
      // Validate file
      const validation = validateMediaFile(
        { name: file.name, type: file.type, size: file.size },
        mediaType
      )

      if (!validation.valid) {
        results.push({
          filename: file.name,
          success: false,
          error: validation.error,
        })
        continue
      }

      // Convert to buffer
      const buffer = Buffer.from(await file.arrayBuffer())

      // Upload to storage
      const uploadResult = await storageService.upload({
        listingId,
        type: mediaType,
        file: buffer,
        filename: file.name,
        contentType: file.type,
        category: category || undefined,
      })

      if (!uploadResult.success) {
        results.push({
          filename: file.name,
          success: false,
          error: uploadResult.error,
        })
        continue
      }

      // Save to media_uploads table (table not yet in generated types)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any).from('media_uploads').insert({
        listing_id: listingId,
        filename: uploadResult.media!.path.split('/').pop() || file.name,
        original_filename: file.name,
        content_type: file.type,
        file_size_bytes: file.size,
        bucket: uploadResult.media!.bucket,
        storage_path: uploadResult.media!.path,
        public_url: uploadResult.media!.url,
        media_type: mediaType,
        category: category || null,
        uploaded_by: user.id,
      })

      if (dbError) {
        console.error('[Media Upload] DB error:', dbError)
      }

      results.push({
        filename: file.name,
        success: true,
        url: uploadResult.media!.url,
      })
    }

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      uploaded: successCount,
      total: files.length,
      results,
    })
  } catch (error) {
    console.error('[Media Upload API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/media/upload
 * Get upload configuration and limits
 */
export async function GET() {
  const config = {
    maxFileSize: {
      photo: 50 * 1024 * 1024, // 50MB
      video: 2 * 1024 * 1024 * 1024, // 2GB
      floor_plan: 100 * 1024 * 1024, // 100MB
      document: 50 * 1024 * 1024, // 50MB
    },
    allowedTypes: {
      photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'],
      video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
      floor_plan: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
      document: ['application/pdf', 'text/plain'],
    },
    rateLimit: {
      uploads: RATE_LIMIT,
      windowSeconds: 60,
    },
    buckets: {
      photo: getMediaBucket('photo'),
      video: getMediaBucket('video'),
      floor_plan: getMediaBucket('floor_plan'),
      document: getMediaBucket('document'),
      drone: getMediaBucket('drone'),
      twilight: getMediaBucket('twilight'),
      virtual_staging: getMediaBucket('virtual_staging'),
    },
  }

  return NextResponse.json(config)
}
