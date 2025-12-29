'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Layers,
  ScanLine,
  Blend,
  ImageDown,
  Clock,
  Zap,
} from 'lucide-react'
import type { ProcessingStage, ProcessingProgress as ProgressType } from '@/hooks/useRealtimeProcessing'

const STAGE_ICONS: Record<ProcessingStage, React.ReactNode> = {
  queued: <Clock className="h-4 w-4" />,
  aligning: <Layers className="h-4 w-4" />,
  segmenting: <ScanLine className="h-4 w-4" />,
  fusing: <Blend className="h-4 w-4" />,
  exporting: <ImageDown className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
}

const STAGES: ProcessingStage[] = ['aligning', 'segmenting', 'fusing', 'exporting']

interface ProcessingProgressProps {
  progress: ProgressType | null
  isProcessing: boolean
  errorMessage?: string | null
  variant?: 'full' | 'compact' | 'minimal'
  className?: string
}

export function ProcessingProgress({
  progress,
  isProcessing,
  errorMessage,
  variant = 'full',
  className = '',
}: ProcessingProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // Animate progress bar
  useEffect(() => {
    const target = progress?.overallProgress ?? 0
    const step = (target - animatedProgress) / 10

    if (Math.abs(target - animatedProgress) > 0.5) {
      const timer = setTimeout(() => {
        setAnimatedProgress(prev => prev + step)
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setAnimatedProgress(target)
    }
  }, [progress?.overallProgress, animatedProgress])

  if (!isProcessing && !progress) {
    return null
  }

  if (progress?.stage === 'completed') {
    return (
      <div className={`rounded-lg bg-green-50 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-900">Processing Complete</p>
            {progress.metrics?.total_time_ms && (
              <p className="text-sm text-green-700">
                Completed in {(progress.metrics.total_time_ms / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (progress?.stage === 'failed') {
    return (
      <div className={`rounded-lg bg-red-50 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Processing Failed</p>
            {errorMessage && (
              <p className="text-sm text-red-700">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-blue-700">{progress?.stageLabel || 'Processing...'}</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`rounded-lg bg-blue-50 p-3 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">
                {progress?.stageLabel || 'Processing...'}
              </p>
              <p className="text-xs text-blue-600">
                {Math.round(animatedProgress)}%
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${animatedProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full variant with stage indicators
  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900">HDR Processing</span>
        </div>
        {progress?.estimatedSecondsRemaining != null && progress.estimatedSecondsRemaining > 0 && (
          <span className="text-sm text-blue-600">
            ~{Math.ceil(progress.estimatedSecondsRemaining)}s remaining
          </span>
        )}
      </div>

      {/* Current stage label */}
      <p className="mt-2 text-sm text-blue-700">{progress?.stageLabel || 'Initializing...'}</p>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-200">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
          style={{ width: `${animatedProgress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="mt-4 flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const isComplete = progress?.stage
            ? STAGES.indexOf(progress.stage as typeof stage) > index ||
              progress.stage === 'completed' ||
              progress.stage === 'exporting'
            : false
          const isCurrent = progress?.stage === stage
          const isPending = !isComplete && !isCurrent

          return (
            <div
              key={stage}
              className={`flex flex-col items-center gap-1 ${
                isComplete
                  ? 'text-blue-600'
                  : isCurrent
                    ? 'text-blue-800'
                    : 'text-blue-400'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isComplete
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-blue-100 text-blue-400'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  STAGE_ICONS[stage]
                )}
              </div>
              <span className="text-xs capitalize">{stage.replace('ing', '')}</span>
            </div>
          )
        })}
      </div>

      {/* Timing metrics if available */}
      {progress?.metrics && Object.keys(progress.metrics).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-blue-200 pt-3">
          {progress.metrics.alignment_time_ms != null && (
            <div className="text-xs text-blue-600">
              Align: {(progress.metrics.alignment_time_ms / 1000).toFixed(1)}s
            </div>
          )}
          {progress.metrics.segmentation_time_ms != null && (
            <div className="text-xs text-blue-600">
              Segment: {(progress.metrics.segmentation_time_ms / 1000).toFixed(1)}s
            </div>
          )}
          {progress.metrics.fusion_time_ms != null && (
            <div className="text-xs text-blue-600">
              Fuse: {(progress.metrics.fusion_time_ms / 1000).toFixed(1)}s
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline processing indicator for lists
 */
export function ProcessingBadge({ stage, className = '' }: { stage: ProcessingStage; className?: string }) {
  if (stage === 'completed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 ${className}`}>
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </span>
    )
  }

  if (stage === 'failed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 ${className}`}>
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 ${className}`}>
      <Loader2 className="h-3 w-3 animate-spin" />
      Processing
    </span>
  )
}
