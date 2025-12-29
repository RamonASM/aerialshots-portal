'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ClientNavProps {
  client: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    avatar_url: string | null
  }
}

const navItems = [
  { href: '/client', label: 'Dashboard', icon: 'home' },
  { href: '/client/bookings', label: 'Bookings', icon: 'calendar' },
  { href: '/client/media', label: 'My Media', icon: 'photo' },
  { href: '/client/settings', label: 'Settings', icon: 'settings' },
]

export function ClientNav({ client }: ClientNavProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/client/login'
  }

  const getInitials = () => {
    if (client.first_name && client.last_name) {
      return `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
    }
    return client.email[0].toUpperCase()
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-[#1c1c1e] text-white'
                : 'text-[#a1a1a6] hover:text-white hover:bg-white/[0.05]'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Menu */}
      <div className="flex items-center gap-3">
        <Link
          href="/book/listing"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#0077ff] text-white rounded-lg text-sm font-medium hover:bg-[#0066dd] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Book Shoot
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1c1c1e] flex items-center justify-center text-sm font-medium text-white">
                {getInitials()}
              </div>
            )}
            <svg
              className={cn(
                'w-4 h-4 text-[#8e8e93] transition-transform',
                isMenuOpen && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#1c1c1e] rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-white/[0.08]">
                  <p className="text-white font-medium">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-[#8e8e93] text-sm truncate">{client.email}</p>
                </div>

                {/* Mobile Nav Items */}
                <div className="md:hidden py-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        'block px-4 py-2.5 text-sm transition-colors',
                        pathname === item.href
                          ? 'bg-white/[0.05] text-white'
                          : 'text-[#a1a1a6] hover:text-white hover:bg-white/[0.05]'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-white/[0.08] my-2" />
                </div>

                <div className="py-2">
                  <Link
                    href="/client/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-[#a1a1a6] hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    Account Settings
                  </Link>
                  <a
                    href="mailto:support@aerialshots.media"
                    className="block px-4 py-2.5 text-sm text-[#a1a1a6] hover:text-white hover:bg-white/[0.05] transition-colors"
                  >
                    Contact Support
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.05] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
