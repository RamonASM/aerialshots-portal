'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Image as ImageIcon,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Zap,
} from 'lucide-react'

interface ProcessingJob {
  id: string
  founddr_job_id?: string | null
  status: string
  progress?: number
  input_keys: string[]
  output_key?: string | null
  bracket_count?: number | null
  error_message?: string | null
  processing_time_ms?: number | null
  created_at: string
  completed_at?: string | null
}

interface MediaAsset {
  id: string
  storage_path?: string
  qc_status: string
}

interface HDRProcessingPanelProps {
  listingId: string
  mediaAssets: MediaAsset[]
  initialJob?: ProcessingJob | null
  onProcessingComplete?: () => void
}

export function HDRProcessingPanel({
  listingId,
  mediaAssets,
  initialJob,
  onProcessingComplete,
}: HDRProcessingPanelProps) {
  const [job, setJob] = useState<ProcessingJob | null>(initialJob || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get photos that can be processed (pending status, with storage paths)
  const processablePhotos = mediaAssets.filter(
    (asset) => asset.storage_path && asset.qc_status === 'pending'
  )

  // Poll for job status
  const pollJobStatus = useCallback(async () => {
    if (!job?.id) return

    try {
      const response = await fetch(`/api/founddr/status/${job.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data = await response.json()
      if (data.success && data.job) {
        setJob(data.job)

        // Stop polling if job is complete or failed
        if (['completed', 'failed', 'cancelled'].includes(data.job.status)) {
          setIsPolling(false)
          if (data.job.status === 'completed' && onProcessingComplete) {
            onProcessingComplete()
          }
        }
      }
    } catch (err) {
      console.error('Error polling job status:', err)
    }
  }, [job?.id, onProcessingComplete])

  // Start polling when job is in progress
  useEffect(() => {
    if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) {
      return
    }

    setIsPolling(true)
    const interval = setInterval(pollJobStatus, 3000)

    return () => {
      clearInterval(interval)
      setIsPolling(false)
    }
  }, [job, pollJobStatus])

  // Submit processing job
  const handleStartProcessing = async (isRush = false) => {
    if (processablePhotos.length < 2) {
      setError('At least 2 bracket images are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/founddr/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          mediaAssetIds: processablePhotos.map((p) => p.id),
          storagePaths: processablePhotos.map((p) => p.storage_path),
          isRush,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start processing')
      }

      setJob({
        id: data.processingJobId,
        founddr_job_id: data.founddrJobId,
        status: data.status || 'queued',
        input_keys: processablePhotos.map((p) => p.storage_path!),
        bracket_count: processablePhotos.length,
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start processing')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cancel job
  const handleCancel = async () => {
    if (!job?.id) return

    try {
      const response = await fetch(`/api/founddr/status/${job.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setJob((prev) => (prev ? { ...prev, status: 'cancelled' } : null))
      }
    } catch (err) {
      console.error('Error cancelling job:', err)
    }
  }

  // Get status display info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
      case 'queued':
        return {
          icon: Clock,
          color: 'text-amber-600 bg-amber-50',
          label: 'Queued',
        }
      case 'processing':
      case 'uploading':
        return {
          icon: Loader2,
          color: 'text-blue-600 bg-blue-50',
          label: 'Processing',
          spin: true,
        }
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-50',
          label: 'Completed',
        }
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600 bg-red-50',
          label: 'Failed',
        }
      case 'cancelled':
        return {
          icon: AlertCircle,
          color: 'text-neutral-600 bg-neutral-50',
          label: 'Cancelled',
        }
      default:
        return {
          icon: Clock,
          color: 'text-neutral-600 bg-neutral-50',
          label: status,
        }
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">HDR Processing</h3>
            <p className="text-sm text-neutral-600">
              {processablePhotos.length} photos ready for processing
            </p>
          </div>
        </div>

        {isPolling && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Polling...</span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Job status */}
      {job && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-4">
            <div className="flex items-center gap-3">
              {(() => {
                const info = getStatusInfo(job.status)
                const Icon = info.icon
                return (
                  <>
                    <div className={`rounded-full p-2 ${info.color}`}>
                      <Icon
                        className={`h-4 w-4 ${info.spin ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{info.label}</p>
                      <p className="text-sm text-neutral-600">
                        {job.bracket_count} bracket images
                      </p>
                    </div>
                  </>
                )
              })()}
            </div>

            {job.processing_time_ms && (
              <div className="text-right">
                <p className="text-sm text-neutral-600">Processing time</p>
                <p className="font-medium text-neutral-900">
                  {(job.processing_time_ms / 1000).toFixed(1)}s
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {job.error_message && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {job.error_message}
            </div>
          )}

          {/* Output preview */}
          {job.output_key && job.status === 'completed' && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Processing complete! Output: {job.output_key}
            </div>
          )}

          {/* Cancel button for in-progress jobs */}
          {['pending', 'queued'].includes(job.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-red-600 hover:bg-red-50"
            >
              Cancel Processing
            </Button>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(!job || ['completed', 'failed', 'cancelled'].includes(job.status)) && (
        <div className="mt-4 flex gap-3">
          <Button
            onClick={() => handleStartProcessing(false)}
            disabled={isSubmitting || processablePhotos.length < 2}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start HDR Processing
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleStartProcessing(true)}
            disabled={isSubmitting || processablePhotos.length < 2}
            className="text-amber-600 hover:bg-amber-50"
          >
            <Zap className="mr-2 h-4 w-4" />
            Rush
          </Button>
        </div>
      )}

      {/* No photos message */}
      {processablePhotos.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">
          No photos available for processing. Upload bracket images to get started.
        </p>
      )}

      {processablePhotos.length === 1 && (
        <p className="mt-4 text-sm text-amber-600">
          At least 2 bracket images are required for HDR processing.
        </p>
      )}
    </div>
  )
}
