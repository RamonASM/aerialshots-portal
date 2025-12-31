/**
 * FoundDR Processing API Route
 *
 * Triggers HDR processing for uploaded photos via RunPod Serverless GPU.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRunPodClient } from '@/lib/integrations/founddr'
import { apiLogger, formatError } from '@/lib/logger'

const logger = apiLogger.child({ route: 'processing' })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { listing_id, media_asset_ids, storage_paths } = body

    // Validate required fields
    if (!listing_id || !media_asset_ids?.length || !storage_paths?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: listing_id, media_asset_ids, storage_paths' },
        { status: 400 }
      )
    }

    if (storage_paths.length < 2) {
      return NextResponse.json(
        { error: 'HDR processing requires at least 2 bracket images' },
        { status: 400 }
      )
    }

    if (storage_paths.length > 7) {
      return NextResponse.json(
        { error: 'HDR processing supports maximum 7 bracket images' },
        { status: 400 }
      )
    }

    // Verify listing exists and user has access
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, agent_id')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check if RunPod is configured
    const runpod = getRunPodClient()
    if (!runpod.isConfigured()) {
      return NextResponse.json(
        { error: 'RunPod integration not configured. Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY.' },
        { status: 503 }
      )
    }

    // Create processing job record
    const { data: processingJob, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        listing_id,
        status: 'processing',
        input_keys: storage_paths,
        bracket_count: storage_paths.length,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) {
      logger.error({ ...formatError(jobError) }, 'Failed to create processing job')
      return NextResponse.json({ error: 'Failed to create processing job' }, { status: 500 })
    }

    // Generate signed URLs for RunPod to download the images
    const signedUrls: string[] = []
    for (const path of storage_paths) {
      const { data: signedUrl, error: signError } = await supabase.storage
        .from('staged-photos')
        .createSignedUrl(path, 300) // 5 minute expiry

      if (signError || !signedUrl?.signedUrl) {
        logger.error({ path, ...formatError(signError) }, 'Failed to create signed URL')
        return NextResponse.json({ error: `Failed to access image: ${path}` }, { status: 500 })
      }
      signedUrls.push(signedUrl.signedUrl)
    }

    logger.info({ listingId: listing_id, bracketCount: storage_paths.length }, 'Starting RunPod HDR processing')

    try {
      // Process via RunPod using signed URLs
      const result = await runpod.processHDRFromURLs(signedUrls, {
        enableWindowPull: true,
        jpegQuality: 95,
      })

      if (result.status === 'COMPLETED' && result.output) {
        // Use admin client for storage upload (bypasses RLS)
        const adminClient = createAdminClient()

        // Upload result to Supabase storage
        const outputKey = `processed/${listing_id}/${processingJob.id}.jpg`
        const imageBuffer = Buffer.from(result.output.image_base64, 'base64')

        const { error: uploadError } = await adminClient.storage
          .from('processed-photos')
          .upload(outputKey, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (uploadError) {
          logger.error({ ...formatError(uploadError) }, 'Failed to upload processed image')
          throw new Error('Failed to upload processed image')
        }

        // Get public URL
        const { data: urlData } = adminClient.storage
          .from('processed-photos')
          .getPublicUrl(outputKey)

        // Update job as completed
        await supabase
          .from('processing_jobs')
          .update({
            status: 'completed',
            output_key: outputKey,
            completed_at: new Date().toISOString(),
            processing_time_ms: result.output.metrics.total_time_ms,
            metrics: result.output.metrics,
          })
          .eq('id', processingJob.id)

        // Update media assets
        await supabase
          .from('media_assets')
          .update({
            processing_job_id: processingJob.id,
            qc_status: 'pending_review',
          })
          .in('id', media_asset_ids)

        // Log the event
        await supabase.from('job_events').insert({
          listing_id,
          event_type: 'hdr_processing_completed',
          new_value: {
            processing_job_id: processingJob.id,
            bracket_count: storage_paths.length,
            processing_time_ms: result.output.metrics.total_time_ms,
            fusion_method: result.output.metrics.fusion_method,
          },
          actor_id: user.id,
          actor_type: 'staff',
        })

        logger.info({
          listingId: listing_id,
          processingTimeMs: result.output.metrics.total_time_ms
        }, 'RunPod HDR processing completed')

        return NextResponse.json({
          success: true,
          processingJobId: processingJob.id,
          outputUrl: urlData.publicUrl,
          outputKey,
          metrics: result.output.metrics,
          dimensions: {
            width: result.output.width,
            height: result.output.height,
          },
        })
      } else {
        // Processing failed
        await supabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: result.error || 'Unknown error',
          })
          .eq('id', processingJob.id)

        logger.error({ listingId: listing_id, error: result.error }, 'RunPod HDR processing failed')

        return NextResponse.json({
          success: false,
          error: result.error || 'Processing failed',
          processingJobId: processingJob.id,
        }, { status: 500 })
      }
    } catch (runpodError) {
      // Update job to failed
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: runpodError instanceof Error ? runpodError.message : 'Unknown error',
        })
        .eq('id', processingJob.id)

      logger.error({ ...formatError(runpodError) }, 'RunPod request failed')

      return NextResponse.json(
        { error: 'HDR processing request failed', details: runpodError instanceof Error ? runpodError.message : 'Unknown error' },
        { status: 502 }
      )
    }
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Processing API error')
    return NextResponse.json(
      { error: 'Failed to start HDR processing' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/processing?job_id=xxx
 *
 * Check the status of a processing job
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const jobId = request.nextUrl.searchParams.get('job_id')
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job_id parameter' },
        { status: 400 }
      )
    }

    // Get job status from local database
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      output_key: job.output_key,
      metrics: job.metrics,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
      processing_time_ms: job.processing_time_ms,
    })
  } catch (error) {
    logger.error({ ...formatError(error) }, 'Get processing status error')
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}
