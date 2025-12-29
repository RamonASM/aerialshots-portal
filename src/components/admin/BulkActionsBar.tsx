'use client'

import { ReactNode } from 'react'
import { X, Trash2, Download, Archive, CheckCircle, XCircle, Send, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkAction {
  id: string
  label: string
  icon: ReactNode
  variant?: 'default' | 'danger' | 'success'
  onClick: () => void
  disabled?: boolean
}

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  actions: BulkAction[]
  className?: string
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        className
      )}
    >
      {/* Selection Count */}
      <div className="flex items-center gap-2 border-r border-neutral-200 pr-4 dark:border-neutral-700">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          selected
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              {
                'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700':
                  action.variant === 'default' || !action.variant,
                'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30':
                  action.variant === 'danger',
                'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30':
                  action.variant === 'success',
              },
              action.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Clear Selection */}
      <button
        onClick={onClearSelection}
        className="ml-2 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Pre-configured action sets for common use cases
export function createMediaBulkActions(handlers: {
  onDownload?: () => void
  onDelete?: () => void
  onApprove?: () => void
  onReject?: () => void
}): BulkAction[] {
  const actions: BulkAction[] = []

  if (handlers.onDownload) {
    actions.push({
      id: 'download',
      label: 'Download',
      icon: <Download className="h-4 w-4" />,
      onClick: handlers.onDownload,
    })
  }

  if (handlers.onApprove) {
    actions.push({
      id: 'approve',
      label: 'Approve',
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'success',
      onClick: handlers.onApprove,
    })
  }

  if (handlers.onReject) {
    actions.push({
      id: 'reject',
      label: 'Reject',
      icon: <XCircle className="h-4 w-4" />,
      variant: 'danger',
      onClick: handlers.onReject,
    })
  }

  if (handlers.onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'danger',
      onClick: handlers.onDelete,
    })
  }

  return actions
}

export function createContentBulkActions(handlers: {
  onPublish?: () => void
  onUnpublish?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onTag?: () => void
}): BulkAction[] {
  const actions: BulkAction[] = []

  if (handlers.onPublish) {
    actions.push({
      id: 'publish',
      label: 'Publish',
      icon: <Send className="h-4 w-4" />,
      variant: 'success',
      onClick: handlers.onPublish,
    })
  }

  if (handlers.onUnpublish) {
    actions.push({
      id: 'unpublish',
      label: 'Unpublish',
      icon: <XCircle className="h-4 w-4" />,
      onClick: handlers.onUnpublish,
    })
  }

  if (handlers.onTag) {
    actions.push({
      id: 'tag',
      label: 'Tag',
      icon: <Tag className="h-4 w-4" />,
      onClick: handlers.onTag,
    })
  }

  if (handlers.onArchive) {
    actions.push({
      id: 'archive',
      label: 'Archive',
      icon: <Archive className="h-4 w-4" />,
      onClick: handlers.onArchive,
    })
  }

  if (handlers.onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'danger',
      onClick: handlers.onDelete,
    })
  }

  return actions
}

export function createPaymentBulkActions(handlers: {
  onProcess?: () => void
  onExport?: () => void
  onVoid?: () => void
  onSendReminder?: () => void
}): BulkAction[] {
  const actions: BulkAction[] = []

  if (handlers.onProcess) {
    actions.push({
      id: 'process',
      label: 'Process',
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'success',
      onClick: handlers.onProcess,
    })
  }

  if (handlers.onSendReminder) {
    actions.push({
      id: 'reminder',
      label: 'Send Reminder',
      icon: <Send className="h-4 w-4" />,
      onClick: handlers.onSendReminder,
    })
  }

  if (handlers.onExport) {
    actions.push({
      id: 'export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      onClick: handlers.onExport,
    })
  }

  if (handlers.onVoid) {
    actions.push({
      id: 'void',
      label: 'Void',
      icon: <XCircle className="h-4 w-4" />,
      variant: 'danger',
      onClick: handlers.onVoid,
    })
  }

  return actions
}

export default BulkActionsBar
