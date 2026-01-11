'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  Palmtree,
  Stethoscope,
  Heart,
  GraduationCap,
  Wrench,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type TimeOffRequest = {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string
  reason_details: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_at: string
  reviewed_at: string | null
  review_notes: string | null
  staff?: {
    name: string
    email: string
    team_role: string | null
  }
  reviewer?: {
    name: string
  } | null
}

const REASON_ICONS: Record<string, typeof Palmtree> = {
  vacation: Palmtree,
  sick: Stethoscope,
  personal: Heart,
  training: GraduationCap,
  equipment_maintenance: Wrench,
  family_emergency: Heart,
  other: HelpCircle,
}

const REASON_LABELS: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick Leave',
  personal: 'Personal',
  training: 'Training',
  equipment_maintenance: 'Equipment',
  family_emergency: 'Family Emergency',
  other: 'Other',
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  approved: { bg: 'bg-green-500/10', text: 'text-green-400' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400' },
  cancelled: { bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
}

export default function AdminTimeOffPage() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const statusParam = filter === 'all' ? '' : `status=${filter}`
      const response = await fetch(`/api/admin/team/time-off?${statusParam}`)

      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch time off requests:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(requestId)

      const response = await fetch('/api/admin/team/time-off', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action,
          review_notes: reviewNotes[requestId] || null,
        }),
      })

      if (response.ok) {
        // Refresh the list
        fetchRequests()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process request')
      }
    } catch (error) {
      console.error('Failed to review request:', error)
      alert('Failed to process request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    const startStr = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const endStr = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    if (start === end) {
      return startStr + ', ' + startDate.getFullYear()
    }

    return `${startStr} - ${endStr}`
  }

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return days
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Time Off Requests</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Review and manage team time off requests
          </p>
        </div>

        <div className="relative">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Filter className="h-4 w-4" />
            {filter === 'all' ? 'All Requests' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            <ChevronDown className="h-4 w-4" />
          </Button>

          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-white/[0.08] bg-[#1c1c1e] py-1 shadow-lg z-10">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilter(status)
                    setShowFilterMenu(false)
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-white/[0.05] ${
                    filter === status ? 'text-[#0077ff]' : 'text-neutral-300'
                  }`}
                >
                  {status === 'all' ? 'All Requests' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <span className="text-sm text-amber-400">
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''} awaiting review
          </span>
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-neutral-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No requests found</h3>
          <p className="mt-2 text-sm text-neutral-400">
            {filter === 'pending'
              ? 'All time off requests have been reviewed'
              : 'No time off requests match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const ReasonIcon = REASON_ICONS[request.reason] || HelpCircle
            const statusStyle = STATUS_STYLES[request.status]
            const days = calculateDays(request.start_date, request.end_date)

            return (
              <div
                key={request.id}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Reason Icon */}
                    <div className="rounded-lg bg-white/[0.05] p-3">
                      <ReasonIcon className="h-5 w-5 text-neutral-400" />
                    </div>

                    {/* Request Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">
                          {request.staff?.name || 'Unknown Staff'}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-neutral-400">
                        {request.staff?.team_role ? (
                          <span className="capitalize">{request.staff.team_role}</span>
                        ) : (
                          request.staff?.email
                        )}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-neutral-300">
                          {REASON_LABELS[request.reason] || request.reason}
                        </span>
                        <span className="text-neutral-500">•</span>
                        <span className="text-neutral-300">
                          {formatDateRange(request.start_date, request.end_date)}
                        </span>
                        <span className="text-neutral-500">•</span>
                        <span className="text-neutral-400">
                          {days} day{days !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {request.reason_details && (
                        <p className="mt-2 text-sm text-neutral-500">
                          &quot;{request.reason_details}&quot;
                        </p>
                      )}

                      {request.reviewed_at && request.reviewer && (
                        <p className="mt-2 text-xs text-neutral-500">
                          Reviewed by {request.reviewer.name} on{' '}
                          {new Date(request.reviewed_at).toLocaleDateString()}
                          {request.review_notes && `: "${request.review_notes}"`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-red-500/20 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleReview(request.id, 'reject')}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleReview(request.id, 'approve')}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </div>

                      <input
                        type="text"
                        placeholder="Optional notes..."
                        value={reviewNotes[request.id] || ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                        }
                        className="w-48 rounded-lg border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-[#0077ff]/50 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
