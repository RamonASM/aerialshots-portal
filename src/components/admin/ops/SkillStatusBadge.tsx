/**
 * Skill Status Badge
 *
 * Displays the status of a skill execution with appropriate styling
 */

import { cn } from '@/lib/utils'

type SkillStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

interface SkillStatusBadgeProps {
  status: SkillStatus
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
}

const statusConfig: Record<SkillStatus, {
  label: string
  className: string
  icon: string
}> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: '⏳',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse',
    icon: '⚡',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: '✓',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: '✗',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
    icon: '⊘',
  },
}

export function SkillStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  className,
}: SkillStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className,
        className
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </span>
  )
}

/**
 * Skill Category Badge
 */
type SkillCategory = 'generate' | 'transform' | 'integrate' | 'data' | 'notify' | 'decision'

interface SkillCategoryBadgeProps {
  category: SkillCategory
  className?: string
}

const categoryConfig: Record<SkillCategory, {
  label: string
  className: string
  icon: string
}> = {
  generate: {
    label: 'Generate',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: '✨',
  },
  transform: {
    label: 'Transform',
    className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: '🔄',
  },
  integrate: {
    label: 'Integrate',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: '🔗',
  },
  data: {
    label: 'Data',
    className: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    icon: '📊',
  },
  notify: {
    label: 'Notify',
    className: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    icon: '📧',
  },
  decision: {
    label: 'Decision',
    className: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: '🧠',
  },
}

export function SkillCategoryBadge({
  category,
  className,
}: SkillCategoryBadgeProps) {
  const config = categoryConfig[category]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        config.className,
        className
      )}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
