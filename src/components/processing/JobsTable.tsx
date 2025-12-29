'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

export interface ProcessingJob {
  id: string
  founddr_job_id: string | null
  listing_id: string | null
  status: string
  bracket_count: number | null
  metrics: {
    alignment_time_ms?: number
    segmentation_time_ms?: number
    fusion_time_ms?: number
    export_time_ms?: number
    total_time_ms?: number
  } | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  retry_count?: number
  listings?: {
    id: string
    address: string | null
  } | null
}

interface ProcessingJobsTableProps {
  jobs: ProcessingJob[]
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-100', label: 'Pending' },
  queued: { icon: Clock, color: 'text-amber-600 bg-amber-100', label: 'Queued' },
  uploading: { icon: Loader2, color: 'text-blue-600 bg-blue-100', label: 'Uploading' },
  processing: { icon: Loader2, color: 'text-blue-600 bg-blue-100', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-green-600 bg-green-100', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-neutral-600 bg-neutral-100', label: 'Cancelled' },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  const isAnimated = status === 'processing' || status === 'uploading'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
      <Icon className={`h-3.5 w-3.5 ${isAnimated ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}

function MetricsDisplay({ metrics }: { metrics: ProcessingJob['metrics'] }) {
  if (!metrics?.total_time_ms) return <span className="text-neutral-400">—</span>

  return (
    <div className="text-xs">
      <span className="font-medium">{(metrics.total_time_ms / 1000).toFixed(1)}s</span>
      <span className="text-neutral-400 ml-1">
        ({metrics.alignment_time_ms ? `A:${(metrics.alignment_time_ms / 1000).toFixed(1)}` : ''}
        {metrics.segmentation_time_ms ? ` S:${(metrics.segmentation_time_ms / 1000).toFixed(1)}` : ''}
        {metrics.fusion_time_ms ? ` F:${(metrics.fusion_time_ms / 1000).toFixed(1)}` : ''})
      </span>
    </div>
  )
}

export function ProcessingJobsTable({ jobs }: ProcessingJobsTableProps) {
  const [retrying, setRetrying] = useState<string | null>(null)

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId)
    try {
      const response = await fetch('/api/processing/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (!response.ok) {
        throw new Error('Retry failed')
      }

      // Refresh page to show updated status
      window.location.reload()
    } catch (err) {
      console.error('Retry error:', err)
    } finally {
      setRetrying(null)
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-neutral-500">
        No processing jobs found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-sm text-neutral-500">
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Listing</th>
            <th className="px-4 py-3 font-medium">Brackets</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
                {job.retry_count && job.retry_count > 0 && (
                  <span className="ml-2 text-xs text-neutral-500">
                    (retry #{job.retry_count})
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {job.listing_id ? (
                  <Link
                    href={`/admin/ops/qc/${job.listing_id}`}
                    className="flex items-center gap-1 text-sm text-neutral-900 hover:text-[#ff4533]"
                  >
                    {job.listings?.address
                      ? job.listings.address.length > 35
                        ? `${job.listings.address.slice(0, 35)}...`
                        : job.listings.address
                      : job.listing_id.slice(0, 8)}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {job.bracket_count || '—'}
              </td>
              <td className="px-4 py-3">
                <MetricsDisplay metrics={job.metrics} />
              </td>
              <td className="px-4 py-3 text-sm text-neutral-500">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {job.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetry(job.id)}
                      disabled={retrying === job.id}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      {retrying === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-1">Retry</span>
                    </Button>
                  )}
                  {job.status === 'failed' && job.error_message && (
                    <span
                      className="text-xs text-red-600 max-w-[200px] truncate"
                      title={job.error_message}
                    >
                      {job.error_message}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
