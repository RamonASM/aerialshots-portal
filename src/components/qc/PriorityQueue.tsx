'use client'

import Link from 'next/link'
import { Clock, AlertCircle, CheckCircle2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueueItem {
  id: string
  address: string
  city: string
  state: string
  ops_status: string
  is_rush: boolean
  hoursWaiting: number
  priorityLevel: 'high' | 'medium' | 'low'
  photographer?: {
    name: string
  }
}

interface PriorityQueueProps {
  queue: QueueItem[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isLoading?: boolean
}

export function PriorityQueue({ queue, onApprove, onReject, isLoading }: PriorityQueueProps) {
  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-neutral-500'
    }
  }

  const getPriorityIcon = (level: string) => {
    switch (level) {
      case 'high':
        return '🔴'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const getTimeDisplay = (hours: number) => {
    if (hours < 1) {
      return 'Less than 1h'
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    }
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <p className="mt-4 text-lg font-medium text-neutral-900">All caught up!</p>
        <p className="mt-1 text-sm text-neutral-600">No listings in the QC queue</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {queue.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
            item.is_rush ? 'border-l-4 border-amber-500' : 'border-neutral-200'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg" title={`${item.priorityLevel} priority`}>
                  {getPriorityIcon(item.priorityLevel)}
                </span>
                <h3 className="font-semibold text-neutral-900">{item.address}</h3>
                {item.is_rush && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <AlertCircle className="h-3 w-3" />
                    RUSH
                  </span>
                )}
                {item.ops_status === 'in_qc' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    In Progress
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {item.city}, {item.state}
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimeDisplay(item.hoursWaiting)}
                </span>
                {item.photographer && (
                  <span>Photographer: {item.photographer.name}</span>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link href={`/admin/ops/jobs/${item.id}`}>
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(item.id)}
                disabled={isLoading}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove(item.id)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
