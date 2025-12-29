'use client'

import { useState } from 'react'
import {
  Globe,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PublishStatus = 'draft' | 'scheduled' | 'published' | 'unpublished'

interface PublishPanelProps {
  status: PublishStatus
  publishedAt?: string | null
  scheduledFor?: string | null
  lastSavedAt?: string | null
  previewUrl?: string
  liveUrl?: string
  onPublish?: () => Promise<void>
  onUnpublish?: () => Promise<void>
  onSchedule?: (date: Date) => Promise<void>
  onSaveDraft?: () => Promise<void>
  className?: string
  hasUnsavedChanges?: boolean
}

const statusConfig: Record<
  PublishStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    icon: <EyeOff className="h-3.5 w-3.5" />,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  published: {
    label: 'Published',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <Globe className="h-3.5 w-3.5" />,
  },
  unpublished: {
    label: 'Unpublished',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: <EyeOff className="h-3.5 w-3.5" />,
  },
}

export function PublishPanel({
  status,
  publishedAt,
  scheduledFor,
  lastSavedAt,
  previewUrl,
  liveUrl,
  onPublish,
  onUnpublish,
  onSchedule,
  onSaveDraft,
  className,
  hasUnsavedChanges = false,
}: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const config = statusConfig[status]

  const handlePublish = async () => {
    if (!onPublish) return
    setIsPublishing(true)
    try {
      await onPublish()
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!onUnpublish) return
    setIsPublishing(true)
    try {
      await onUnpublish()
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return
    setIsSaving(true)
    try {
      await onSaveDraft()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSchedule = async () => {
    if (!onSchedule || !scheduleDate || !scheduleTime) return
    setIsPublishing(true)
    try {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      await onSchedule(dateTime)
      setShowScheduler(false)
      setScheduleDate('')
      setScheduleTime('')
    } finally {
      setIsPublishing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Publish</h3>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              config.color
            )}
          >
            {config.icon}
            {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>You have unsaved changes</span>
          </div>
        )}

        {/* Status Info */}
        <div className="space-y-2 text-sm">
          {status === 'published' && publishedAt && (
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Published {formatDate(publishedAt)}</span>
            </div>
          )}
          {status === 'scheduled' && scheduledFor && (
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Scheduled for {formatDate(scheduledFor)}</span>
            </div>
          )}
          {lastSavedAt && (
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-500">
              <Clock className="h-4 w-4" />
              <span>Last saved {formatDate(lastSavedAt)}</span>
            </div>
          )}
        </div>

        {/* Schedule Picker */}
        {showScheduler && (
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || !scheduleTime || isPublishing}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPublishing ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  'Schedule'
                )}
              </button>
              <button
                onClick={() => setShowScheduler(false)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview & Live Links */}
        {(previewUrl || liveUrl) && (
          <div className="flex flex-col gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <Eye className="h-4 w-4" />
                Preview
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </a>
            )}
            {status === 'published' && liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                <Globe className="h-4 w-4" />
                View Live
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
        <div className="flex flex-col gap-2">
          {/* Primary Action */}
          {status === 'draft' || status === 'unpublished' ? (
            <button
              onClick={handlePublish}
              disabled={isPublishing || hasUnsavedChanges}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Publish Now
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Unpublish
                </>
              )}
            </button>
          )}

          {/* Secondary Actions */}
          <div className="flex gap-2">
            {!showScheduler && onSchedule && status !== 'published' && (
              <button
                onClick={() => setShowScheduler(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
            )}
            {onSaveDraft && hasUnsavedChanges && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save Draft'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublishPanel
