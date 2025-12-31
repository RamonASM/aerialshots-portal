'use client'

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  MinusCircle,
  HelpCircle,
} from 'lucide-react'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

type AnyIntegrationStatus = IntegrationStatus | Zillow3DStatus

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: React.ComponentType<{ className?: string }>
}

const STATUS_CONFIGS: Record<AnyIntegrationStatus, StatusConfig> = {
  // Common statuses
  pending: {
    label: 'Pending',
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10',
    icon: Clock,
  },
  ordered: {
    label: 'Ordered',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    icon: Loader2,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: XCircle,
  },
  not_applicable: {
    label: 'N/A',
    color: 'text-neutral-500',
    bgColor: 'bg-neutral-500/5',
    icon: MinusCircle,
  },
  // Manual intervention required
  needs_manual: {
    label: 'Needs Attention',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    icon: AlertTriangle,
  },
  // Zillow 3D-specific
  scheduled: {
    label: 'Scheduled',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    icon: Clock,
  },
  scanned: {
    label: 'Scanned',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: CheckCircle,
  },
  live: {
    label: 'Live',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: CheckCircle,
  },
}

interface IntegrationStatusBadgeProps {
  status: AnyIntegrationStatus
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function IntegrationStatusBadge({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}: IntegrationStatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10',
    icon: HelpCircle,
  }

  const Icon = config.icon
  const isAnimated = status === 'processing'

  const sizeClasses = {
    sm: {
      container: 'px-1.5 py-0.5 text-[10px]',
      icon: 'h-3 w-3',
      gap: 'gap-1',
    },
    md: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3.5 w-3.5',
      gap: 'gap-1.5',
    },
    lg: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-2',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <span
      className={`
        inline-flex items-center ${sizes.gap} ${sizes.container}
        rounded-full font-medium
        ${config.bgColor} ${config.color}
        ${className}
      `}
    >
      <Icon
        className={`${sizes.icon} ${isAnimated ? 'animate-spin' : ''}`}
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Export status configs for use in other components
export { STATUS_CONFIGS }
export type { StatusConfig, AnyIntegrationStatus }
