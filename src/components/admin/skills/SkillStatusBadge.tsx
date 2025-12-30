/**
 * Skill Status Badge Component
 *
 * Displays execution status with appropriate color coding
 */

import { cn } from '@/lib/utils'

export type SkillStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

interface SkillStatusBadgeProps {
  status: SkillStatus
  className?: string
}

const statusConfig: Record<SkillStatus, { label: string; colorClass: string }> = {
  pending: {
    label: 'Pending',
    colorClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  running: {
    label: 'Running',
    colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  completed: {
    label: 'Completed',
    colorClass: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  failed: {
    label: 'Failed',
    colorClass: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    colorClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
}

export function SkillStatusBadge({ status, className }: SkillStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.colorClass,
        className
      )}
    >
      {config.label}
    </span>
  )
}
