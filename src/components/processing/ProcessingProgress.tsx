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
      <div className={`rounded-lg bg-[var(--status-success-muted)] border border-[var(--status-success)]/20 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[var(--status-success)]" />
          <div className="flex-1">
            <p className="font-medium text-[var(--status-success)]">Processing Complete</p>
            {progress.metrics?.total_time_ms && (
              <p className="text-sm text-[var(--status-success)]/80">
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
      <div className={`rounded-lg bg-[var(--status-error-muted)] border border-[var(--status-error)]/20 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-[var(--status-error)]" />
          <div className="flex-1">
            <p className="font-medium text-[var(--status-error)]">Processing Failed</p>
            {errorMessage && (
              <p className="text-sm text-[var(--status-error)]/80">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-primary">{progress?.stageLabel || 'Processing...'}</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`rounded-lg bg-[var(--status-info-muted)] border border-primary/20 p-3 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">
                {progress?.stageLabel || 'Processing...'}
              </p>
              <p className="text-xs text-primary/80">
                {Math.round(animatedProgress)}%
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/20">
              <div
                className="h-full bg-primary transition-all duration-300"
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
    <div className={`rounded-lg border border-primary/20 bg-[var(--status-info-muted)] p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">HDR Processing</span>
        </div>
        {progress?.estimatedSecondsRemaining != null && progress.estimatedSecondsRemaining > 0 && (
          <span className="text-sm text-primary/80">
            ~{Math.ceil(progress.estimatedSecondsRemaining)}s remaining
          </span>
        )}
      </div>

      {/* Current stage label */}
      <p className="mt-2 text-sm text-primary/80">{progress?.stageLabel || 'Initializing...'}</p>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/20">
        <div
          className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
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
                  ? 'text-primary'
                  : isCurrent
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isComplete
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary/30 text-primary'
                      : 'bg-muted text-muted-foreground'
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
        <div className="mt-4 flex flex-wrap gap-3 border-t border-primary/20 pt-3">
          {progress.metrics.alignment_time_ms != null && (
            <div className="text-xs text-primary/80">
              Align: {(progress.metrics.alignment_time_ms / 1000).toFixed(1)}s
            </div>
          )}
          {progress.metrics.segmentation_time_ms != null && (
            <div className="text-xs text-primary/80">
              Segment: {(progress.metrics.segmentation_time_ms / 1000).toFixed(1)}s
            </div>
          )}
          {progress.metrics.fusion_time_ms != null && (
            <div className="text-xs text-primary/80">
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
      <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--status-success-muted)] px-2 py-0.5 text-xs font-medium text-[var(--status-success)] ${className}`}>
        <CheckCircle2 className="h-3 w-3" />
        Complete
      </span>
    )
  }

  if (stage === 'failed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--status-error-muted)] px-2 py-0.5 text-xs font-medium text-[var(--status-error)] ${className}`}>
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--status-info-muted)] px-2 py-0.5 text-xs font-medium text-primary ${className}`}>
      <Loader2 className="h-3 w-3 animate-spin" />
      Processing
    </span>
  )
}
