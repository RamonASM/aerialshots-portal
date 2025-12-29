'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Camera,
  ClipboardCheck,
  Home,
  LayoutGrid,
  Menu,
  Bot,
  FileText,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { name: 'Home', href: '/admin', icon: Home },
  { name: 'Ops', href: '/admin/ops', icon: Camera },
  { name: 'QC', href: '/admin/qc/live', icon: ClipboardCheck },
  { name: 'Content', href: '/admin/content', icon: FileText },
  { name: 'More', href: '/admin/more', icon: Menu },
]

interface MobileBottomNavProps {
  onMoreClick?: () => void
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95 lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)

          const isMore = item.name === 'More'

          if (isMore) {
            return (
              <button
                key={item.name}
                onClick={onMoreClick}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
              >
                <div
                  className={cn(
                    'rounded-lg p-1.5 transition-colors',
                    'text-neutral-500 dark:text-neutral-400'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  {item.name}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <div
                className={cn(
                  'rounded-lg p-1.5 transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Safe Area for iOS */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-neutral-900" />
    </nav>
  )
}

export default MobileBottomNav
