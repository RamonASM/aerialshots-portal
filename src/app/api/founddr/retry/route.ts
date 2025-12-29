/**
 * FoundDR Retry API
 *
 * Manually retry failed HDR processing jobs.
 * Supports single job retry and bulk retry of all failed jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFoundDRClient } from '@/lib/integrations/founddr/client'
import { apiLogger, formatError } from '@/lib/logger'

interface RetryRequest {
  job_id?: string
  listing_id?: string
  retry_all_failed?: boolean
}

/**
 * POST /api/founddr/retry
 *
 * Retry failed HDR processing jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Check auth - require staff
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email?.endsWith('@aerialshots.media')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RetryRequest = await request.json()
    const adminClient = createAdminClient()
    const founddr = getFoundDRClient()

    if (!founddr.isConfigured()) {
      return NextResponse.json(
        { error: 'FoundDR not configured' },
        { status: 503 }
      )
    }

    const results: {
      retried: Array<{ job_id: string; listing_id: string; new_founddr_job_id: string }>
      failed: Array<{ job_id: string; error: string }>
    } = {
      retried: [],
      failed: [],
    }

    // Build query for jobs to retry
    // Note: Using type cast since pending_retry exists in DB but not in generated types
    let query = adminClient
      .from('processing_jobs')
      .select('*, listing:listings(address, city)')
      .in('status', ['failed', 'pending_retry'] as ('failed' | 'processing')[])

    if (body.job_id) {
      query = query.eq('id', body.job_id)
    } else if (body.listing_id) {
      query = query.eq('listing_id', body.listing_id)
    } else if (!body.retry_all_failed) {
      return NextResponse.json(
        { error: 'Must provide job_id, listing_id, or set retry_all_failed=true' },
        { status: 400 }
      )
    }

    const { data: jobs, error: fetchError } = await query.limit(100)

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`)
    }

    if (!jobs?.length) {
      return NextResponse.json({
        message: 'No failed jobs found to retry',
        results,
      })
    }

    // Retry each job
    for (const job of jobs) {
      try {
        if (!job.listing_id || !job.input_keys?.length) {
          results.failed.push({
            job_id: job.id,
            error: 'Missing listing_id or input_keys',
          })
          continue
        }

        // Get media asset IDs for this job
        const { data: assets } = await adminClient
          .from('media_assets')
          .select('id')
          .eq('listing_id', job.listing_id)
          .eq('type', 'photo')

        const mediaAssetIds = assets?.map(a => a.id) || []

        // Create new FoundDR job
        const response = await founddr.createJob({
          listing_id: job.listing_id,
          media_asset_ids: mediaAssetIds,
          storage_paths: job.input_keys,
          is_rush: false, // Default to non-rush for retries
        })

        // Update processing_jobs record
        await adminClient
          .from('processing_jobs')
          .update({
            status: 'processing',
            founddr_job_id: response.founddr_job_id,
            started_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', job.id)

        // Update media assets
        if (mediaAssetIds.length) {
          await adminClient
            .from('media_assets')
            .update({ qc_status: 'processing' })
            .in('id', mediaAssetIds)
        }

        // Log event
        await adminClient.from('job_events').insert({
          listing_id: job.listing_id,
          event_type: 'hdr_processing_retry',
          new_value: {
            old_founddr_job_id: job.founddr_job_id,
            new_founddr_job_id: response.founddr_job_id,
            retried_by: user.email,
          },
          actor_id: user.id,
          actor_type: 'staff',
        })

        results.retried.push({
          job_id: job.id,
          listing_id: job.listing_id,
          new_founddr_job_id: response.founddr_job_id,
        })

        apiLogger.info({
          jobId: job.id,
          listingId: job.listing_id,
          newFounddrJobId: response.founddr_job_id,
          retriedBy: user.email,
        }, 'HDR processing job retried')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.failed.push({
          job_id: job.id,
          error: errorMessage,
        })

        apiLogger.error({
          jobId: job.id,
          error: formatError(error),
        }, 'Failed to retry HDR processing job')
      }
    }

    return NextResponse.json({
      message: `Retried ${results.retried.length} jobs, ${results.failed.length} failed`,
      results,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Retry endpoint error')
    return NextResponse.json(
      { error: 'Failed to retry jobs' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/founddr/retry
 *
 * Get list of failed jobs that can be retried
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth - require staff
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email?.endsWith('@aerialshots.media')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'failed,pending_retry'

    const statuses = status.split(',')

    // Note: Using type cast since pending_retry exists in DB but not in generated types
    const { data: jobs, error } = await adminClient
      .from('processing_jobs')
      .select(`
        id,
        listing_id,
        founddr_job_id,
        status,
        error_message,
        retry_count,
        created_at,
        last_failed_at,
        listing:listings(address, city)
      `)
      .in('status', statuses as ('failed' | 'processing')[])
      .order('last_failed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`)
    }

    // Get counts by status
    // Note: Using type cast since pending_retry exists in DB but not in generated types
    const { data: statusCounts } = await adminClient
      .from('processing_jobs')
      .select('status')
      .in('status', ['failed', 'pending_retry', 'processing', 'completed'] as ('failed' | 'processing' | 'completed')[])

    // Note: pending_retry is a custom status not in generated types
    const counts = {
      failed: statusCounts?.filter(j => j.status === 'failed').length || 0,
      pending_retry: statusCounts?.filter(j => (j.status as string) === 'pending_retry').length || 0,
      processing: statusCounts?.filter(j => j.status === 'processing').length || 0,
      completed: statusCounts?.filter(j => j.status === 'completed').length || 0,
    }

    return NextResponse.json({
      jobs,
      counts,
      total: jobs?.length || 0,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to fetch retry queue')
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
