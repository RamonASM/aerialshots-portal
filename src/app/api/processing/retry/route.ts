import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getFoundDRClient } from '@/lib/founddr/client'

const MAX_RETRIES = 3
const MIN_RETRY_INTERVAL_MS = 30000 // 30 seconds minimum between retries

// Extended job type with retry columns (added via migration)
interface ProcessingJobWithRetry {
  id: string
  listing_id: string | null
  status: string
  error_message: string | null
  input_keys: string[]
  retry_count?: number
  max_retries?: number
  last_retry_at?: string
  can_retry?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { job_id } = body

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    // Fetch the job
    const { data: jobData, error: fetchError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (fetchError || !jobData) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Cast to extended type with retry columns
    const job = jobData as unknown as ProcessingJobWithRetry

    // Validate job can be retried
    if (job.status !== 'failed') {
      return NextResponse.json(
        { error: `Cannot retry job with status: ${job.status}` },
        { status: 400 }
      )
    }

    const retryCount = job.retry_count || 0
    const maxRetries = job.max_retries || MAX_RETRIES

    if (retryCount >= maxRetries) {
      return NextResponse.json(
        { error: `Maximum retry attempts (${maxRetries}) exceeded` },
        { status: 400 }
      )
    }

    if (job.can_retry === false) {
      return NextResponse.json(
        { error: 'This job has been marked as non-retryable' },
        { status: 400 }
      )
    }

    // Check minimum retry interval
    if (job.last_retry_at) {
      const lastRetry = new Date(job.last_retry_at).getTime()
      const now = Date.now()
      if (now - lastRetry < MIN_RETRY_INTERVAL_MS) {
        const waitSeconds = Math.ceil((MIN_RETRY_INTERVAL_MS - (now - lastRetry)) / 1000)
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before retrying` },
          { status: 429 }
        )
      }
    }

    // Update job status to pending for retry
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        status: 'pending',
        retry_count: retryCount + 1,
        last_retry_at: new Date().toISOString(),
        error_message: null,
        started_at: null,
        completed_at: null,
        webhook_received_at: null,
      })
      .eq('id', job_id)

    if (updateError) {
      console.error('Failed to update job for retry:', updateError)
      return NextResponse.json(
        { error: 'Failed to prepare job for retry' },
        { status: 500 }
      )
    }

    // Reset media assets to processing status
    if (job.listing_id) {
      await supabase
        .from('media_assets')
        .update({ qc_status: 'processing' })
        .eq('processing_job_id', job_id)
    }

    // Re-trigger FoundDR processing
    try {
      const founddrClient = getFoundDRClient()

      // Get input paths from original job
      const inputKeys = job.input_keys || []

      if (inputKeys.length === 0) {
        // If no input keys, fetch from media assets
        const { data: assets } = await supabase
          .from('media_assets')
          .select('id, storage_path')
          .eq('processing_job_id', job_id)

        if (assets && assets.length >= 2 && job.listing_id) {
          const callbackUrl = process.env.FOUNDDR_WEBHOOK_URL ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/founddr`

          const response = await founddrClient.createJob({
            listing_id: job.listing_id,
            media_asset_ids: assets.map(a => a.id),
            storage_paths: assets.map(a => a.storage_path).filter(Boolean) as string[],
            callback_url: callbackUrl,
            is_rush: false,
          })

          // Update with new FoundDR job ID
          await supabase
            .from('processing_jobs')
            .update({
              founddr_job_id: response.founddr_job_id,
              status: 'queued',
            })
            .eq('id', job_id)
        }
      }
    } catch (founddrError) {
      console.error('Failed to re-trigger FoundDR:', founddrError)
      // Job is already marked as pending, FoundDR can pick it up later
    }

    // Log the retry event (only if listing_id is present)
    if (job.listing_id) {
      await supabase.from('job_events').insert({
        listing_id: job.listing_id,
        event_type: 'processing_job_retried',
        new_value: {
          job_id,
          retry_count: retryCount + 1,
          previous_error: job.error_message,
        },
        actor_type: 'staff',
      })
    }

    return NextResponse.json({
      success: true,
      job_id,
      retry_count: retryCount + 1,
      message: 'Job queued for retry',
    })
  } catch (err) {
    console.error('Retry API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Bulk retry endpoint
export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { job_ids } = body

    if (!job_ids || !Array.isArray(job_ids) || job_ids.length === 0) {
      return NextResponse.json(
        { error: 'job_ids array is required' },
        { status: 400 }
      )
    }

    const results = {
      success: [] as string[],
      failed: [] as { job_id: string; error: string }[],
    }

    for (const job_id of job_ids) {
      try {
        // Use the same logic as single retry
        const response = await fetch(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id }),
        })

        if (response.ok) {
          results.success.push(job_id)
        } else {
          const error = await response.json()
          results.failed.push({ job_id, error: error.error || 'Unknown error' })
        }
      } catch (err) {
        results.failed.push({ job_id, error: 'Request failed' })
      }
    }

    return NextResponse.json({
      success: results.success.length > 0,
      retried: results.success.length,
      failed: results.failed.length,
      results,
    })
  } catch (err) {
    console.error('Bulk retry API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
