'use client'

import { useMemo } from 'react'

interface StatusHistoryItem {
  id: string
  event_type: string
  created_at: string
  details?: Record<string, unknown>
}

interface StatusTimelineProps {
  currentStatus: string
  scheduledAt: string | null
  deliveredAt: string | null
  statusHistory: StatusHistoryItem[]
  brandColor: string
}

// Define the order workflow stages
const WORKFLOW_STAGES = [
  { key: 'scheduled', label: 'Scheduled', icon: 'calendar' },
  { key: 'shooting', label: 'Photo Shoot', icon: 'camera' },
  { key: 'editing', label: 'Editing', icon: 'edit' },
  { key: 'ready_for_qc', label: 'Quality Review', icon: 'check' },
  { key: 'delivered', label: 'Delivered', icon: 'download' },
]

// Map ops_status to stage index
const STATUS_TO_STAGE: Record<string, number> = {
  'lead': 0,
  'pending_confirmation': 0,
  'confirmed': 0,
  'scheduled': 1,
  'shooting': 1,
  'post_production': 2,
  'editing': 2,
  'ready_for_qc': 3,
  'qc_review': 3,
  'delivered': 4,
  'completed': 4,
}

export function StatusTimeline({
  currentStatus,
  scheduledAt,
  deliveredAt,
  statusHistory,
  brandColor,
}: StatusTimelineProps) {
  const currentStageIndex = STATUS_TO_STAGE[currentStatus] ?? 0

  // Extract relevant dates from history
  const stageDates = useMemo(() => {
    const dates: Record<string, string> = {}

    if (scheduledAt) {
      dates['scheduled'] = scheduledAt
    }

    if (deliveredAt) {
      dates['delivered'] = deliveredAt
    }

    // Extract dates from status history
    statusHistory.forEach((event) => {
      const eventType = event.event_type.toLowerCase()
      if (eventType.includes('scheduled')) dates['scheduled'] = event.created_at
      if (eventType.includes('shooting') || eventType.includes('photo')) dates['shooting'] = event.created_at
      if (eventType.includes('editing') || eventType.includes('production')) dates['editing'] = event.created_at
      if (eventType.includes('qc') || eventType.includes('review')) dates['ready_for_qc'] = event.created_at
      if (eventType.includes('delivered') || eventType.includes('complete')) dates['delivered'] = event.created_at
    })

    return dates
  }, [scheduledAt, deliveredAt, statusHistory])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getIcon = (iconName: string, isComplete: boolean, isCurrent: boolean) => {
    const color = isComplete || isCurrent ? brandColor : '#9CA3AF'

    switch (iconName) {
      case 'calendar':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'camera':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'edit':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'check':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'download':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h3 className="font-semibold text-neutral-900 mb-6">Order Progress</h3>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

        {/* Completed progress line */}
        <div
          className="absolute left-6 top-0 w-0.5 transition-all duration-500"
          style={{
            backgroundColor: brandColor,
            height: `${Math.min(currentStageIndex / (WORKFLOW_STAGES.length - 1) * 100, 100)}%`,
          }}
        />

        {/* Stages */}
        <div className="space-y-6">
          {WORKFLOW_STAGES.map((stage, index) => {
            const isComplete = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isPending = index > currentStageIndex
            const stageDate = stageDates[stage.key]

            return (
              <div key={stage.key} className="relative flex items-start gap-4">
                {/* Stage indicator */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full
                    border-2 transition-all duration-300
                    ${isComplete ? 'border-transparent' : isCurrent ? 'border-2' : 'border-neutral-200 bg-white'}
                  `}
                  style={{
                    backgroundColor: isComplete ? brandColor : isCurrent ? `${brandColor}15` : undefined,
                    borderColor: isCurrent ? brandColor : undefined,
                  }}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    getIcon(stage.icon, isComplete, isCurrent)
                  )}
                </div>

                {/* Stage content */}
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        isComplete || isCurrent ? 'text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${brandColor}15`,
                          color: brandColor,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>

                  {stageDate && (
                    <p className="text-sm text-neutral-500 mt-0.5">
                      {formatDate(stageDate)}
                    </p>
                  )}

                  {isPending && !stageDate && (
                    <p className="text-sm text-neutral-400 mt-0.5">
                      Pending
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estimated completion message */}
      {currentStageIndex < WORKFLOW_STAGES.length - 1 && (
        <div
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: `${brandColor}08` }}
        >
          <p className="text-sm text-neutral-600">
            {currentStageIndex === 1 && "Your photos are being captured. We'll update you when editing begins."}
            {currentStageIndex === 2 && "Our team is carefully editing your photos to ensure the highest quality."}
            {currentStageIndex === 3 && "Your photos are in final review and will be ready soon!"}
            {currentStageIndex === 0 && scheduledAt && (
              <>Your photo shoot is scheduled for <strong>{formatDate(scheduledAt)}</strong>.</>
            )}
            {currentStageIndex === 0 && !scheduledAt && "Your order is being processed. We'll notify you once scheduled."}
          </p>
        </div>
      )}

      {/* Completed message */}
      {currentStageIndex === WORKFLOW_STAGES.length - 1 && (
        <div
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              style={{ color: brandColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium" style={{ color: brandColor }}>
              Your photos are ready to download!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
