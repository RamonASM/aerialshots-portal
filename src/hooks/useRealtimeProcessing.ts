'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ProcessingJob {
  id: string
  founddr_job_id: string | null
  listing_id: string
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  input_keys: string[] | null
  output_key: string | null
  bracket_count: number | null
  metrics: ProcessingMetrics | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  webhook_received_at: string | null
}

export interface ProcessingMetrics {
  alignment_time_ms?: number
  segmentation_time_ms?: number
  fusion_time_ms?: number
  export_time_ms?: number
  total_time_ms?: number
  queue_position?: number
}

export type ProcessingStage =
  | 'queued'
  | 'aligning'
  | 'segmenting'
  | 'fusing'
  | 'exporting'
  | 'completed'
  | 'failed'

export interface ProcessingProgress {
  stage: ProcessingStage
  stageLabel: string
  stageProgress: number // 0-100 for current stage
  overallProgress: number // 0-100 overall
  estimatedSecondsRemaining: number | null
  metrics: ProcessingMetrics | null
}

const STAGE_WEIGHTS = {
  queued: { start: 0, end: 5 },
  aligning: { start: 5, end: 25 },
  segmenting: { start: 25, end: 55 },
  fusing: { start: 55, end: 85 },
  exporting: { start: 85, end: 100 },
  completed: { start: 100, end: 100 },
  failed: { start: 0, end: 0 },
}

const STAGE_LABELS: Record<ProcessingStage, string> = {
  queued: 'Waiting in queue...',
  aligning: 'Aligning brackets...',
  segmenting: 'Detecting windows/sky...',
  fusing: 'Fusing HDR...',
  exporting: 'Finalizing...',
  completed: 'Complete!',
  failed: 'Processing failed',
}

// Estimate seconds based on typical times
const STAGE_TIMES: Record<ProcessingStage, number> = {
  queued: 5,
  aligning: 8,
  segmenting: 8,
  fusing: 12,
  exporting: 3,
  completed: 0,
  failed: 0,
}

function inferStageFromMetrics(metrics: ProcessingMetrics | null, status: string): ProcessingStage {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'pending' || status === 'queued') return 'queued'

  if (!metrics) return 'aligning' // Default to first real processing stage

  if (metrics.export_time_ms != null) return 'completed'
  if (metrics.fusion_time_ms != null) return 'exporting'
  if (metrics.segmentation_time_ms != null) return 'fusing'
  if (metrics.alignment_time_ms != null) return 'segmenting'

  return 'aligning'
}

function calculateProgress(job: ProcessingJob): ProcessingProgress {
  const stage = inferStageFromMetrics(job.metrics, job.status)
  const stageWeight = STAGE_WEIGHTS[stage]

  // Calculate stage progress based on time if we have metrics
  let stageProgress = 50 // Default to 50% through stage

  if (job.started_at && stage !== 'completed' && stage !== 'failed') {
    const elapsedMs = Date.now() - new Date(job.started_at).getTime()
    const expectedMs = Object.entries(STAGE_TIMES)
      .filter(([s]) => {
        const stageOrder = ['queued', 'aligning', 'segmenting', 'fusing', 'exporting']
        return stageOrder.indexOf(s) <= stageOrder.indexOf(stage)
      })
      .reduce((acc, [, time]) => acc + time * 1000, 0)

    stageProgress = Math.min(95, (elapsedMs / expectedMs) * 100)
  }

  const overallProgress = stage === 'completed'
    ? 100
    : stage === 'failed'
      ? 0
      : stageWeight.start + ((stageWeight.end - stageWeight.start) * stageProgress / 100)

  // Estimate remaining time
  let estimatedSecondsRemaining: number | null = null
  if (stage !== 'completed' && stage !== 'failed') {
    const stageOrder: ProcessingStage[] = ['queued', 'aligning', 'segmenting', 'fusing', 'exporting']
    const currentIndex = stageOrder.indexOf(stage)
    const remainingStages = stageOrder.slice(currentIndex)

    estimatedSecondsRemaining = remainingStages.reduce((acc, s) => acc + STAGE_TIMES[s], 0)
    // Subtract estimated progress through current stage
    estimatedSecondsRemaining -= (STAGE_TIMES[stage] * stageProgress / 100)
  }

  return {
    stage,
    stageLabel: STAGE_LABELS[stage],
    stageProgress,
    overallProgress,
    estimatedSecondsRemaining,
    metrics: job.metrics,
  }
}

interface UseRealtimeProcessingOptions {
  listingId: string
  enabled?: boolean
  onStatusChange?: (job: ProcessingJob) => void
  onComplete?: (job: ProcessingJob) => void
  onError?: (job: ProcessingJob) => void
}

export function useRealtimeProcessing(options: UseRealtimeProcessingOptions) {
  const { listingId, enabled = true, onStatusChange, onComplete, onError } = options

  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const callbacksRef = useRef({ onStatusChange, onComplete, onError })

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = { onStatusChange, onComplete, onError }
  }, [onStatusChange, onComplete, onError])

  // Fetch initial jobs
  useEffect(() => {
    if (!enabled || !listingId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchJobs = async () => {
      const { data, error: fetchError } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(new Error(fetchError.message))
      } else if (data) {
        setJobs(data as ProcessingJob[])
      }
    }

    fetchJobs()
  }, [enabled, listingId])

  // Set up realtime subscription
  useEffect(() => {
    if (!enabled || !listingId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let channel: RealtimeChannel | null = null

    const setupSubscription = () => {
      channel = supabase
        .channel(`processing-jobs-${listingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'processing_jobs',
            filter: `listing_id=eq.${listingId}`,
          },
          (payload) => {
            const job = (payload.eventType === 'DELETE' ? payload.old : payload.new) as ProcessingJob

            if (payload.eventType === 'DELETE') {
              setJobs(prev => prev.filter(j => j.id !== job.id))
            } else if (payload.eventType === 'INSERT') {
              setJobs(prev => [job, ...prev])
              callbacksRef.current.onStatusChange?.(job)
            } else if (payload.eventType === 'UPDATE') {
              setJobs(prev => prev.map(j => j.id === job.id ? job : j))
              callbacksRef.current.onStatusChange?.(job)

              if (job.status === 'completed') {
                callbacksRef.current.onComplete?.(job)
              } else if (job.status === 'failed') {
                callbacksRef.current.onError?.(job)
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setError(null)
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false)
            setError(new Error('Failed to connect to realtime channel'))
          } else if (status === 'CLOSED') {
            setIsConnected(false)
          }
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [enabled, listingId])

  // Derived state
  const activeJobs = jobs.filter(j => ['pending', 'uploading', 'queued', 'processing'].includes(j.status))
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const failedJobs = jobs.filter(j => j.status === 'failed')

  const isProcessing = activeJobs.length > 0
  const latestJob = jobs[0] || null
  const progress = latestJob ? calculateProgress(latestJob) : null

  const refresh = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error: fetchError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(new Error(fetchError.message))
    } else if (data) {
      setJobs(data as ProcessingJob[])
    }
  }, [listingId])

  return {
    jobs,
    latestJob,
    activeJobs,
    completedJobs,
    failedJobs,
    isProcessing,
    progress,
    isConnected,
    error,
    refresh,
  }
}

/**
 * Hook specifically for showing processing progress in a compact format
 */
export function useProcessingProgress(listingId: string, enabled = true) {
  const { latestJob, progress, isProcessing, isConnected } = useRealtimeProcessing({
    listingId,
    enabled,
  })

  return {
    isProcessing,
    stage: progress?.stage || null,
    stageLabel: progress?.stageLabel || null,
    overallProgress: progress?.overallProgress || 0,
    estimatedSecondsRemaining: progress?.estimatedSecondsRemaining || null,
    isConnected,
    jobId: latestJob?.founddr_job_id || null,
    status: latestJob?.status || null,
    errorMessage: latestJob?.error_message || null,
  }
}
