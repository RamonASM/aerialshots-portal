'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  User,
  Building,
  Users,
  Gift,
  Award,
  Sparkles,
  BookOpen,
  Settings,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// Navigation defined inside client component to avoid serialization issues
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Listings', href: '/dashboard/listings', icon: Building },
  { name: 'Leads', href: '/dashboard/leads', icon: Users, badge: 'leads' as const },
  { name: 'AI Tools', href: '/dashboard/ai-tools', icon: Sparkles },
  { name: 'Storywork', href: '/dashboard/storywork', icon: BookOpen },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Gift },
  { name: 'Rewards', href: '/dashboard/rewards', icon: Award },
]

const secondaryNav = [
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface DashboardNavProps {
  badges: Record<string, number>
}

export function DashboardNav({ badges }: DashboardNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed left-0 top-14 bottom-0 hidden w-[240px] border-r border-white/[0.08] bg-[#0a0a0a] lg:block overflow-y-auto">
      <div className="flex flex-col h-full p-4">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href)
            const badgeCount = item.badge ? badges[item.badge] : 0

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-all duration-200 ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-[#a1a1a6] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <item.icon
                  className={`h-[18px] w-[18px] transition-colors ${
                    active ? 'text-[#0077ff]' : 'text-[#636366] group-hover:text-[#0077ff]'
                  }`}
                />
                <span className="flex-1">{item.name}</span>

                {/* Badge */}
                {badgeCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-black">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}

                {!badgeCount && (
                  <ChevronRight
                    className={`h-4 w-4 transition-all ${
                      active ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'
                    }`}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-white/[0.08]" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNav.map((item) => {
            const active = isActive(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-all duration-200 ${
                  active
                    ? 'bg-white/10 text-[#a1a1a6]'
                    : 'text-[#636366] hover:bg-white/[0.05] hover:text-[#a1a1a6]'
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Bottom Section */}
        <div className="mt-auto pt-4">
          <div className="rounded-xl glass-light p-4">
            <p className="text-[13px] font-medium text-white mb-1">
              Need help?
            </p>
            <p className="text-[12px] text-[#636366] mb-3">
              Contact our support team
            </p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href="mailto:hello@aerialshots.media">
                Get Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
