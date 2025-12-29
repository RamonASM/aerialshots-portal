'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import {
  FileText,
  Image,
  Users,
  Calendar,
  Package,
  Search,
  Plus,
  FolderOpen,
  Inbox,
  AlertCircle,
  Camera,
  Map,
  Home,
  Bell,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateVariant =
  | 'default'
  | 'search'
  | 'error'
  | 'no-results'
  | 'no-content'
  | 'no-access'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
  children?: ReactNode
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: FolderOpen,
  search: Search,
  error: AlertCircle,
  'no-results': Inbox,
  'no-content': FileText,
  'no-access': AlertCircle,
}

const variantColors: Record<EmptyStateVariant, string> = {
  default: 'text-neutral-400',
  search: 'text-blue-400',
  error: 'text-red-400',
  'no-results': 'text-neutral-400',
  'no-content': 'text-neutral-400',
  'no-access': 'text-orange-400',
}

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant]

  return (
    <div
      className={cn(
        'flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/50',
        className
      )}
    >
      <div className={cn('mb-4 rounded-full bg-neutral-100 p-4 dark:bg-neutral-800', variantColors[variant])}>
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
      {children}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {secondaryAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common scenarios
export function EmptyPropertiesState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Home}
      title="No properties yet"
      description="Properties will appear here once jobs are created in the system."
      action={onAdd ? { label: 'Add Property', onClick: onAdd } : undefined}
    />
  )
}

export function EmptyCommunitiesState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Map}
      title="No communities"
      description="Create community pages to showcase neighborhoods and attract buyers."
      action={onAdd ? { label: 'Add Community', onClick: onAdd } : undefined}
    />
  )
}

export function EmptyCampaignsState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Camera}
      title="No campaigns"
      description="Create listing campaigns to generate marketing content for your properties."
      action={onAdd ? { label: 'Create Campaign', onClick: onAdd } : undefined}
    />
  )
}

export function EmptyMediaState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={Image}
      title="No media files"
      description="Upload photos, videos, or other media to get started."
      action={onUpload ? { label: 'Upload Media', onClick: onUpload } : undefined}
    />
  )
}

export function EmptySearchState({ query }: { query?: string }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={query ? `No matches found for "${query}". Try a different search term.` : 'Try adjusting your search or filter criteria.'}
    />
  )
}

export function EmptyNotificationsState() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  )
}

export function EmptyPaymentsState() {
  return (
    <EmptyState
      icon={CreditCard}
      title="No payments yet"
      description="Payment transactions will appear here once orders are placed."
    />
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  )
}
