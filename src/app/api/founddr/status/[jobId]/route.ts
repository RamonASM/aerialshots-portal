import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFoundDRClient } from '@/lib/integrations/founddr'
import { apiLogger, formatError } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

/**
 * GET /api/founddr/status/[jobId]
 * Get the status of a specific processing job
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get job from local database
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .select(`
        id,
        founddr_job_id,
        listing_id,
        status,
        input_keys,
        output_key,
        bracket_count,
        queued_at,
        started_at,
        completed_at,
        processing_time_ms,
        metrics,
        error_message,
        webhook_received_at,
        created_at,
        updated_at
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      // Try finding by FoundDR job ID
      const { data: jobByFoundDRId } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('founddr_job_id', jobId)
        .single()

      if (!jobByFoundDRId) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        job: jobByFoundDRId,
      })
    }

    // If job is still processing and we have a FoundDR job ID, poll FoundDR for latest status
    if (job.founddr_job_id && job.status && ['queued', 'processing'].includes(job.status)) {
      const founddr = getFoundDRClient()

      if (founddr.isConfigured()) {
        try {
          const founddrStatus = await founddr.getJobStatus(job.founddr_job_id)

          // Update local status if FoundDR reports differently
          if (founddrStatus.status !== job.status) {
            const updateData: Record<string, unknown> = {
              status: founddrStatus.status,
              updated_at: new Date().toISOString(),
            }

            if (founddrStatus.status === 'processing' && !job.started_at) {
              updateData.started_at = new Date().toISOString()
            }

            if (founddrStatus.status === 'completed') {
              updateData.completed_at = new Date().toISOString()
              updateData.output_key = founddrStatus.output_key
              if (founddrStatus.metrics) {
                updateData.metrics = founddrStatus.metrics
              }
            }

            if (founddrStatus.status === 'failed') {
              updateData.error_message = founddrStatus.error_message
            }

            await supabase
              .from('processing_jobs')
              .update(updateData)
              .eq('id', job.id)

            // Merge the updates into the response
            Object.assign(job, updateData)
          }

          return NextResponse.json({
            success: true,
            job,
            founddrStatus,
          })
        } catch (error) {
          // Log but don't fail - return local status
          apiLogger.warn({
            error: formatError(error),
            jobId: job.id,
            founddrJobId: job.founddr_job_id,
          }, 'Failed to poll FoundDR status')
        }
      }
    }

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'FoundDR status error')
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}

/**
 * DELETE /api/founddr/status/[jobId]
 * Cancel a processing job
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params
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

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .select('id, founddr_job_id, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only allow cancelling pending/queued jobs
    if (!job.status || !['pending', 'queued'].includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot cancel job in ${job.status || 'unknown'} status` },
        { status: 400 }
      )
    }

    // Try to cancel in FoundDR if we have a job ID
    if (job.founddr_job_id) {
      const founddr = getFoundDRClient()
      if (founddr.isConfigured()) {
        await founddr.cancelJob(job.founddr_job_id)
      }
    }

    // Update local status
    await supabase
      .from('processing_jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    apiLogger.info({
      jobId,
      founddrJobId: job.founddr_job_id,
      staffEmail: user.email,
    }, 'Processing job cancelled')

    return NextResponse.json({
      success: true,
      message: 'Job cancelled',
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'FoundDR cancel error')
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
  }
}
