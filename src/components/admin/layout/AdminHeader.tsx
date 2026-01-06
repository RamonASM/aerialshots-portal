'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Command,
  LogOut,
  User,
  Settings,
  HelpCircle,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/admin/theme/ThemeToggle'
import { AdminBreadcrumbs } from './AdminBreadcrumbs'
import { NotificationCenter } from '@/components/admin/NotificationCenter'
import { cn } from '@/lib/utils'

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
}

interface AdminHeaderProps {
  staff: StaffUser
  onOpenCommandPalette?: () => void
}

export function AdminHeader({
  staff,
  onOpenCommandPalette
}: AdminHeaderProps) {
  const router = useRouter()

  // Get initials from name (with null safety)
  const initials = (staff.name || 'U')
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // Format role for display (with null safety)
  const roleDisplay = (staff.role || 'user').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <AdminBreadcrumbs />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden h-9 w-64 justify-between text-sm text-muted-foreground md:flex"
          onClick={onOpenCommandPalette}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>Search...</span>
          </div>
          <kbd className="pointer-events-none flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </Button>

        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 gap-2 px-2 hover:bg-accent"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium leading-none">{staff.name}</span>
                <span className="text-[11px] text-muted-foreground">{roleDisplay}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{staff.name}</p>
                <p className="text-xs text-muted-foreground">{staff.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/admin/settings/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/admin/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <DropdownMenuShortcut>G S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="https://aerialshots.media"
                target="_blank"
                className="cursor-pointer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Main Site
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => router.push('/admin/help')}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onSelect={() => {
                const form = document.createElement('form')
                form.action = '/api/auth/signout'
                form.method = 'POST'
                document.body.appendChild(form)
                form.submit()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
