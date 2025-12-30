'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  Home,
  Lightbulb,
  Sparkles,
  Car,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Priority = 'high' | 'medium' | 'low'

interface ChecklistItem {
  id: string
  text: string
  priority: Priority
}

interface ChecklistSection {
  id: string
  title: string
  icon: string // Icon name string (resolved from iconMap)
  color: string
  items: ChecklistItem[]
}

interface ChecklistClientProps {
  sections: ChecklistSection[]
}

// Icon mapping since we can't pass components directly from server
const iconMap: Record<string, typeof Home> = {
  Home,
  Lightbulb,
  Sparkles,
  Car,
}

export function ChecklistClient({ sections }: ChecklistClientProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  )

  // Calculate progress
  const progress = useMemo(() => {
    const total = sections.reduce((sum, s) => sum + s.items.length, 0)
    const checked = checkedItems.size
    return {
      total,
      checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
    }
  }, [sections, checkedItems])

  // Toggle item checked state
  const toggleItem = useCallback((itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Toggle section expanded state
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Reset all checkboxes
  const resetAll = useCallback(() => {
    setCheckedItems(new Set())
  }, [])

  // Handle print
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Get section progress
  const getSectionProgress = useCallback((section: ChecklistSection) => {
    const checked = section.items.filter(item => checkedItems.has(item.id)).length
    return {
      checked,
      total: section.items.length,
      percentage: Math.round((checked / section.items.length) * 100),
    }
  }, [checkedItems])

  // Color classes for sections
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="sticky top-20 z-10 rounded-xl border border-white/[0.08] bg-[#1c1c1e]/95 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-foreground">
              {progress.percentage}%
            </div>
            <div className="text-sm text-muted-foreground">
              {progress.checked} of {progress.total} items completed
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm bg-neutral-800 text-muted-foreground hover:bg-neutral-700 hover:text-foreground transition-colors print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm bg-neutral-800 text-muted-foreground hover:bg-neutral-700 hover:text-foreground transition-colors print:hidden"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = iconMap[section.icon] || Home
          const isExpanded = expandedSections.has(section.id)
          const sectionProgress = getSectionProgress(section)
          const colors = colorClasses[section.color] || colorClasses.blue

          return (
            <div
              key={section.id}
              className={cn(
                'rounded-xl border transition-colors',
                colors.border,
                sectionProgress.percentage === 100 ? 'bg-green-500/5' : colors.bg
              )}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-5 w-5', colors.text)} />
                  <span className="font-semibold text-foreground">{section.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {sectionProgress.checked}/{sectionProgress.total}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini progress */}
                  <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        sectionProgress.percentage === 100 ? 'bg-green-500' : colors.text.replace('text-', 'bg-')
                      )}
                      style={{ width: `${sectionProgress.percentage}%` }}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-1">
                  {section.items.map((item) => {
                    const isChecked = checkedItems.has(item.id)

                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                          isChecked
                            ? 'bg-green-500/10'
                            : 'hover:bg-white/5'
                        )}
                      >
                        {/* Checkbox */}
                        <div className="shrink-0 mt-0.5">
                          {isChecked ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Text */}
                        <span
                          className={cn(
                            'flex-1 text-sm transition-colors',
                            isChecked
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          )}
                        >
                          {item.text}
                        </span>

                        {/* Priority Badge */}
                        <PriorityBadge priority={item.priority} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Completion Message */}
      {progress.percentage === 100 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">
            Property Ready for Photos!
          </h3>
          <p className="mt-2 text-muted-foreground">
            All items checked. Your property is prepared for professional photography.
          </p>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .sticky {
            position: relative !important;
          }
        }
      `}</style>
    </div>
  )
}

// Priority badge component
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const classes = {
    high: 'bg-red-500/10 text-red-400',
    medium: 'bg-amber-500/10 text-amber-400',
    low: 'bg-neutral-500/10 text-neutral-400',
  }

  const labels = {
    high: 'Must Do',
    medium: 'Important',
    low: 'Nice to Have',
  }

  return (
    <span className={cn('shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium', classes[priority])}>
      {labels[priority]}
    </span>
  )
}
