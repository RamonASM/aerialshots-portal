'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  navigationGroups,
  type NavItem,
  type BadgeType
} from '@/lib/admin/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BadgeCounts {
  pending_jobs?: number
  ready_for_qc?: number
  care_tasks?: number
  active_clients?: number
}

interface AdminSidebarProps {
  badgeCounts?: BadgeCounts
}

function NavBadge({
  type,
  count
}: {
  type: BadgeType
  count?: number
}) {
  if (type === 'new') {
    return (
      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        New
      </span>
    )
  }

  if (type === 'dot') {
    return (
      <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
    )
  }

  if (type === 'count' && count !== undefined && count > 0) {
    return (
      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
        {count > 99 ? '99+' : count}
      </span>
    )
  }

  return null
}

function NavItemComponent({
  item,
  isCollapsed,
  isActive,
  count
}: {
  item: NavItem
  isCollapsed: boolean
  isActive: boolean
  count?: number
}) {
  const Icon = item.icon

  const content = (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn(
        'h-5 w-5 flex-shrink-0 transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
      )} />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <NavBadge
              type={item.badge}
              count={item.badgeKey ? count : undefined}
            />
          )}
        </>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.name}
          {item.badge && count !== undefined && count > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export function AdminSidebar({ badgeCounts = {} }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem('admin-sidebar-collapsed', String(newValue))
  }

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const getCount = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined
    return badgeCounts[badgeKey as keyof BadgeCounts]
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'relative flex h-full flex-col border-r border-border bg-card transition-all duration-300',
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-16 items-center border-b border-border px-4',
          isCollapsed && 'justify-center px-2'
        )}>
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-foreground">
                Admin
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                {!isCollapsed && (
                  <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItemComponent
                      key={item.href}
                      item={item}
                      isCollapsed={isCollapsed}
                      isActive={isItemActive(item.href)}
                      count={getCount(item.badgeKey)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className={cn(
              'w-full justify-center text-muted-foreground hover:text-foreground',
              !isCollapsed && 'justify-start'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
