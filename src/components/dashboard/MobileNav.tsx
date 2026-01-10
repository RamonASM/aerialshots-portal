'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Building,
  Users,
  Gift,
  Award,
  Sparkles,
  BookOpen,
  ShoppingCart,
} from 'lucide-react'

const mobileNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Listings', href: '/dashboard/listings', icon: Building },
  { name: 'Leads', href: '/dashboard/leads', icon: Users, badge: 'leads' as const },
  { name: 'AI Tools', href: '/dashboard/ai-tools', icon: Sparkles },
  { name: 'Storywork', href: '/dashboard/storywork', icon: BookOpen },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Award },
]

interface MobileNavProps {
  badges: Record<string, number>
}

export function MobileNav({ badges }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed top-14 left-0 right-0 z-40 border-b border-white/[0.08] bg-[#0a0a0a] lg:hidden overflow-x-auto scrollbar-hide">
      <div className="flex gap-1 px-4 py-3">
        {mobileNavigation.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          const badgeCount = item.badge ? badges[item.badge] : 0

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'glass-light text-[#a1a1a6] hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {badgeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
