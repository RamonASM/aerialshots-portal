/**
 * Skill Badges for Dashboard
 *
 * Small badges showing AI content availability for listings
 */

'use client'

import { cn } from '@/lib/utils'

interface SkillBadgesProps {
  descriptions?: number
  captions?: number
  videos?: number
  className?: string
}

export function SkillBadges({
  descriptions = 0,
  captions = 0,
  videos = 0,
  className,
}: SkillBadgesProps) {
  const hasContent = descriptions > 0 || captions > 0 || videos > 0

  if (!hasContent) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {descriptions > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400"
          title={`${descriptions} AI description${descriptions !== 1 ? 's' : ''}`}
        >
          <span>📝</span>
          {descriptions > 1 && <span>{descriptions}</span>}
        </span>
      )}
      {captions > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-500/20 text-pink-400"
          title={`${captions} social caption${captions !== 1 ? 's' : ''}`}
        >
          <span>💬</span>
          {captions > 1 && <span>{captions}</span>}
        </span>
      )}
      {videos > 0 && (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400"
          title={`${videos} AI video${videos !== 1 ? 's' : ''}`}
        >
          <span>🎬</span>
          {videos > 1 && <span>{videos}</span>}
        </span>
      )}
    </div>
  )
}

/**
 * Compact AI indicator for tight spaces
 */
export function AIIndicator({
  hasContent,
  className,
}: {
  hasContent: boolean
  className?: string
}) {
  if (!hasContent) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400',
        className
      )}
      title="AI content available"
    >
      ✨ AI
    </span>
  )
}
