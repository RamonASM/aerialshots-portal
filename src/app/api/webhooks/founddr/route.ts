/**
 * FoundDR Webhook Handler
 *
 * Receives notifications from FoundDR when HDR processing completes or fails.
 * Updates media_assets, processing_jobs, and triggers delivery workflow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { webhookLogger, formatError } from '@/lib/logger'

interface FoundDRWebhookPayload {
  founddr_job_id: string
  status: 'completed' | 'failed'
  output_key?: string
  download_url?: string
  metrics?: {
    alignment_time_ms?: number
    segmentation_time_ms?: number
    fusion_time_ms?: number
    export_time_ms?: number
    total_time_ms?: number
    [key: string]: unknown
  }
  listing_id?: string
  media_asset_ids?: string[]
  processed_at?: string
  error_message?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-founddr-secret')
    const expectedSecret = process.env.FOUNDDR_WEBHOOK_SECRET

    if (expectedSecret && webhookSecret !== expectedSecret) {
      webhookLogger.warn({ source: 'founddr' }, 'Invalid webhook secret')
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    // Parse payload
    const payload: FoundDRWebhookPayload = await request.json()

    webhookLogger.info({
      source: 'founddr',
      jobId: payload.founddr_job_id,
      status: payload.status,
      listingId: payload.listing_id,
    }, 'FoundDR webhook received')

    // Use admin client for database operations
    const supabase = createAdminClient()

    // Find the processing job
    const { data: processingJob, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('founddr_job_id', payload.founddr_job_id)
      .maybeSingle()

    if (jobError) {
      webhookLogger.warn({ source: 'founddr', jobId: payload.founddr_job_id, error: jobError }, 'Processing job lookup error')
    }

    if (!processingJob) {
      webhookLogger.warn({ source: 'founddr', jobId: payload.founddr_job_id }, 'Processing job not found')
      // Still process the webhook even if local record not found
    }

    const listingId = payload.listing_id || processingJob?.listing_id || undefined

    if (payload.status === 'completed') {
      // Handle successful processing
      await handleProcessingComplete(supabase, payload, processingJob, listingId)
    } else if (payload.status === 'failed') {
      // Handle failed processing
      await handleProcessingFailed(supabase, payload, processingJob, listingId)
    }

    return NextResponse.json({
      status: 'ok',
      message: `Webhook processed for job ${payload.founddr_job_id}`,
    })
  } catch (error) {
    webhookLogger.error({ source: 'founddr', error: formatError(error) }, 'FoundDR webhook error')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleProcessingComplete(
  supabase: ReturnType<typeof createAdminClient>,
  payload: FoundDRWebhookPayload,
  processingJob: ProcessingJobRow | null,
  listingId?: string
) {
  const now = new Date().toISOString()

  // Update processing_jobs record
  if (processingJob) {
    await supabase
      .from('processing_jobs')
      .update({
        status: 'completed',
        output_key: payload.output_key,
        completed_at: now,
        processing_time_ms: payload.metrics?.total_time_ms,
        metrics: JSON.parse(JSON.stringify(payload.metrics || {})),
        webhook_received_at: now,
      })
      .eq('id', processingJob.id)
  }

  // Update media_assets if we have the IDs
  if (payload.media_asset_ids?.length) {
    await supabase
      .from('media_assets')
      .update({
        qc_status: 'ready_for_qc',
        processed_storage_path: payload.output_key,
      })
      .in('id', payload.media_asset_ids)
  }

  // Update listing status
  if (listingId) {
    // Check if all photos for this listing are processed
    const { data: pendingAssets } = await supabase
      .from('media_assets')
      .select('id')
      .eq('listing_id', listingId)
      .eq('qc_status', 'processing')

    if (!pendingAssets?.length) {
      // All photos processed, move to ready_for_qc
      await supabase
        .from('listings')
        .update({ ops_status: 'ready_for_qc' })
        .eq('id', listingId)
    }

    // Log event
    await supabase.from('job_events').insert({
      listing_id: listingId,
      event_type: 'hdr_processing_completed',
      new_value: {
        founddr_job_id: payload.founddr_job_id,
        output_key: payload.output_key,
        processing_time_ms: payload.metrics?.total_time_ms,
        download_url: payload.download_url,
      },
      actor_type: 'system',
    })
  }

  webhookLogger.info({
    source: 'founddr',
    jobId: payload.founddr_job_id,
    listingId,
    outputKey: payload.output_key,
    totalTimeMs: payload.metrics?.total_time_ms,
  }, 'HDR processing completed')
}

async function handleProcessingFailed(
  supabase: ReturnType<typeof createAdminClient>,
  payload: FoundDRWebhookPayload,
  processingJob: ProcessingJobRow | null,
  listingId?: string
) {
  const now = new Date().toISOString()
  const MAX_RETRIES = 3

  // Calculate retry count
  const currentRetryCount = processingJob?.retry_count || 0
  const shouldAutoRetry = currentRetryCount < MAX_RETRIES

  // Update processing_jobs record
  // Note: pending_retry is a custom status not in generated types
  if (processingJob) {
    await supabase
      .from('processing_jobs')
      .update({
        status: (shouldAutoRetry ? 'pending_retry' : 'failed') as 'failed',
        error_message: payload.error_message,
        webhook_received_at: now,
        retry_count: currentRetryCount + 1,
        last_failed_at: now,
      })
      .eq('id', processingJob.id)
  }

  // Update media_assets
  if (payload.media_asset_ids?.length) {
    await supabase
      .from('media_assets')
      .update({
        qc_status: 'pending', // Reset to pending so they can be retried
        qc_notes: `HDR processing failed (attempt ${currentRetryCount + 1}/${MAX_RETRIES}): ${payload.error_message}`,
      })
      .in('id', payload.media_asset_ids)
  }

  // Update listing status back to staged only if we've exhausted retries
  if (listingId && !shouldAutoRetry) {
    await supabase
      .from('listings')
      .update({ ops_status: 'staged' })
      .eq('id', listingId)
  }

  // Log event
  if (listingId) {
    await supabase.from('job_events').insert({
      listing_id: listingId,
      event_type: shouldAutoRetry ? 'hdr_processing_retry_scheduled' : 'hdr_processing_failed',
      new_value: {
        founddr_job_id: payload.founddr_job_id,
        error_message: payload.error_message,
        retry_count: currentRetryCount + 1,
        max_retries: MAX_RETRIES,
        will_retry: shouldAutoRetry,
      },
      actor_type: 'system',
    })
  }

  if (shouldAutoRetry) {
    webhookLogger.warn({
      source: 'founddr',
      jobId: payload.founddr_job_id,
      listingId,
      errorMessage: payload.error_message,
      retryCount: currentRetryCount + 1,
      maxRetries: MAX_RETRIES,
    }, 'HDR processing failed, will retry')
  } else {
    webhookLogger.error({
      source: 'founddr',
      jobId: payload.founddr_job_id,
      listingId,
      errorMessage: payload.error_message,
      retryCount: currentRetryCount + 1,
    }, 'HDR processing failed, max retries exhausted')
  }
}

interface ProcessingJobRow {
  id: string
  listing_id: string | null
  founddr_job_id: string | null
  retry_count?: number
  [key: string]: unknown
}

/**
 * GET /api/webhooks/founddr
 *
 * Health check endpoint for FoundDR to verify webhook is reachable
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'aerialshots-portal',
    endpoint: 'founddr-webhook',
    timestamp: new Date().toISOString(),
  })
}
