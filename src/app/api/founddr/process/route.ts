import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFoundDRClient } from '@/lib/integrations/founddr'
import { apiLogger, formatError } from '@/lib/logger'
import { z } from 'zod'

// Request validation schema
const ProcessRequestSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  mediaAssetIds: z.array(z.string().uuid()).min(2, 'At least 2 bracket images required').max(7),
  storagePaths: z.array(z.string()).min(2).max(7),
  isRush: z.boolean().optional().default(false),
})

/**
 * POST /api/founddr/process
 * Trigger HDR processing for a listing's bracket images
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Parse and validate request
    const rawBody = await request.json()
    const parseResult = ProcessRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { listingId, mediaAssetIds, storagePaths, isRush } = parseResult.data

    // Verify listing exists
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, address, status')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check if FoundDR is configured
    const founddr = getFoundDRClient()
    if (!founddr.isConfigured()) {
      return NextResponse.json(
        { error: 'FoundDR integration not configured' },
        { status: 503 }
      )
    }

    // Check for existing pending/processing job
    const { data: existingJob } = await supabase
      .from('processing_jobs')
      .select('id, status, founddr_job_id')
      .eq('listing_id', listingId)
      .in('status', ['pending', 'queued', 'processing', 'uploading'])
      .single()

    if (existingJob) {
      return NextResponse.json({
        success: false,
        error: 'A processing job is already in progress for this listing',
        existingJobId: existingJob.id,
        founddrJobId: existingJob.founddr_job_id,
      }, { status: 409 })
    }

    // Create processing job in local database first
    const { data: processingJob, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        listing_id: listingId,
        status: 'pending',
        input_keys: storagePaths,
        bracket_count: storagePaths.length,
      })
      .select()
      .single()

    if (jobError) {
      apiLogger.error({ error: formatError(jobError), listingId }, 'Failed to create processing job')
      return NextResponse.json({ error: 'Failed to create processing job' }, { status: 500 })
    }

    // Get webhook URL from environment
    const webhookUrl = process.env.FOUNDDR_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/founddr`

    // Submit to FoundDR
    try {
      const founddrResponse = await founddr.createJob({
        listing_id: listingId,
        media_asset_ids: mediaAssetIds,
        storage_paths: storagePaths,
        callback_url: webhookUrl,
        is_rush: isRush,
      })

      // Update local job with FoundDR job ID
      await supabase
        .from('processing_jobs')
        .update({
          founddr_job_id: founddrResponse.founddr_job_id,
          status: 'queued',
          queued_at: new Date().toISOString(),
        })
        .eq('id', processingJob.id)

      // Update media assets to link to processing job
      await supabase
        .from('media_assets')
        .update({
          processing_job_id: processingJob.id,
          qc_status: 'processing',
        })
        .in('id', mediaAssetIds)

      apiLogger.info({
        listingId,
        processingJobId: processingJob.id,
        founddrJobId: founddrResponse.founddr_job_id,
        bracketCount: storagePaths.length,
        isRush,
        staffEmail: user.email,
      }, 'HDR processing job created')

      return NextResponse.json({
        success: true,
        message: founddrResponse.message,
        processingJobId: processingJob.id,
        founddrJobId: founddrResponse.founddr_job_id,
        estimatedSeconds: founddrResponse.estimated_time_seconds,
        status: founddrResponse.status,
      })
    } catch (founddrError) {
      // Update local job to failed status
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: JSON.stringify(formatError(founddrError)),
        })
        .eq('id', processingJob.id)

      apiLogger.error({
        error: formatError(founddrError),
        listingId,
        processingJobId: processingJob.id,
      }, 'Failed to submit job to FoundDR')

      return NextResponse.json(
        { error: 'Failed to submit job to FoundDR processing engine' },
        { status: 502 }
      )
    }
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'FoundDR process error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/founddr/process
 * Get FoundDR configuration status and queue stats
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const founddr = getFoundDRClient()
    const isConfigured = founddr.isConfigured()

    // Get local processing stats
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('processing_jobs')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'queued', 'uploading'])

    const { data: processingJobs, error: processingError } = await supabase
      .from('processing_jobs')
      .select('id', { count: 'exact' })
      .eq('status', 'processing')

    const { data: completedToday, error: completedError } = await supabase
      .from('processing_jobs')
      .select('id', { count: 'exact' })
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const response: Record<string, unknown> = {
      success: true,
      configured: isConfigured,
      localStats: {
        pending: pendingError ? 0 : pendingJobs?.length || 0,
        processing: processingError ? 0 : processingJobs?.length || 0,
        completedToday: completedError ? 0 : completedToday?.length || 0,
      },
    }

    // Try to get FoundDR health and queue stats if configured
    if (isConfigured) {
      try {
        const [health, queueStats] = await Promise.all([
          founddr.healthCheck(),
          founddr.getQueueStats(),
        ])
        response.founddr = {
          healthy: health.status === 'healthy',
          environment: health.environment,
          queues: queueStats,
        }
      } catch (error) {
        response.founddr = {
          healthy: false,
          error: 'Unable to connect to FoundDR',
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'FoundDR status error')
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
