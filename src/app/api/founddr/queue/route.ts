/**
 * FoundDR Queue Monitoring API
 *
 * Get real-time queue statistics and job status from FoundDR backend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFoundDRClient } from '@/lib/integrations/founddr/client'
import { apiLogger, formatError } from '@/lib/logger'

interface QueueStatsResponse {
  portal: {
    processing: number
    pending_retry: number
    failed: number
    completed_24h: number
    avg_processing_time_ms: number | null
  }
  founddr: {
    available: boolean
    queued: number
    processing: number
    gpu_utilization: number | null
    estimated_wait_seconds: number | null
  } | null
  recent_jobs: Array<{
    id: string
    listing_id: string
    address: string | null
    status: string
    created_at: string
    processing_time_ms: number | null
  }>
}

/**
 * GET /api/founddr/queue
 *
 * Get queue statistics
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
    const founddr = getFoundDRClient()

    // Get portal-side stats
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Parallel queries for portal stats
    // Note: 'pending_retry' status added for retry logic but types not regenerated
    const [
      processingResult,
      pendingRetryResult,
      failedResult,
      completed24hResult,
      avgTimeResult,
      recentJobsResult,
    ] = await Promise.all([
      adminClient
        .from('processing_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),
      adminClient
        .from('processing_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_retry' as 'failed'), // Type cast - pending_retry exists in DB
      adminClient
        .from('processing_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      adminClient
        .from('processing_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', yesterday.toISOString()),
      adminClient
        .from('processing_jobs')
        .select('processing_time_ms')
        .eq('status', 'completed')
        .not('processing_time_ms', 'is', null)
        .gte('completed_at', yesterday.toISOString())
        .limit(100),
      adminClient
        .from('processing_jobs')
        .select(`
          id,
          listing_id,
          status,
          created_at,
          processing_time_ms,
          listing:listings(address)
        `)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    // Calculate average processing time
    let avgProcessingTime: number | null = null
    if (avgTimeResult.data?.length) {
      const times = avgTimeResult.data
        .map(j => j.processing_time_ms)
        .filter((t): t is number => t !== null)
      if (times.length) {
        avgProcessingTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      }
    }

    // Try to get FoundDR backend stats
    let founddrStats: QueueStatsResponse['founddr'] = null
    if (founddr.isConfigured()) {
      try {
        const queueStats = await founddr.getQueueStats()
        // Sum up queue stats from all queues
        const totalQueued = queueStats.total_pending || 0
        let totalActive = 0
        for (const queue of Object.values(queueStats.queues || {})) {
          totalActive += queue.active || 0
        }
        founddrStats = {
          available: true,
          queued: totalQueued,
          processing: totalActive,
          gpu_utilization: null, // Not yet implemented in backend
          estimated_wait_seconds: null, // Not yet implemented in backend
        }
      } catch (error) {
        apiLogger.warn({ error: formatError(error) }, 'Failed to get FoundDR queue stats')
        founddrStats = {
          available: false,
          queued: 0,
          processing: 0,
          gpu_utilization: null,
          estimated_wait_seconds: null,
        }
      }
    }

    const response: QueueStatsResponse = {
      portal: {
        processing: processingResult.count || 0,
        pending_retry: pendingRetryResult.count || 0,
        failed: failedResult.count || 0,
        completed_24h: completed24hResult.count || 0,
        avg_processing_time_ms: avgProcessingTime,
      },
      founddr: founddrStats,
      recent_jobs: (recentJobsResult.data || []).map(job => ({
        id: job.id,
        listing_id: job.listing_id || '',
        address: (job.listing as { address?: string })?.address || null,
        status: job.status || 'unknown',
        created_at: job.created_at || new Date().toISOString(),
        processing_time_ms: job.processing_time_ms,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Failed to fetch queue stats')
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    )
  }
}
