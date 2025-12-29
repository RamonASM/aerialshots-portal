'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
import { AdminThemeProvider } from '@/components/admin/theme/ThemeProvider'
import { CommandPalette } from '@/components/admin/command/CommandPalette'
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '@/components/admin/KeyboardShortcutsHelp'
import { cn } from '@/lib/utils'

interface StaffUser {
  id: string
  name: string
  email: string
  role: string
}

interface BadgeCounts {
  pending_jobs?: number
  ready_for_qc?: number
  care_tasks?: number
  active_clients?: number
}

interface AdminShellProps {
  children: React.ReactNode
  staff: StaffUser
  badgeCounts?: BadgeCounts
}

export function AdminShell({ children, staff, badgeCounts = {} }: AdminShellProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const shortcutsHelp = useKeyboardShortcutsHelp()

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true)
  }, [])

  return (
    <AdminThemeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <AdminSidebar badgeCounts={badgeCounts} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[240px] transform transition-transform duration-300 ease-in-out lg:hidden',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <AdminSidebar badgeCounts={badgeCounts} />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader
            staff={staff}
            onOpenCommandPalette={openCommandPalette}
          />

          {/* Mobile Navigation Bar */}
          <div className="flex h-12 items-center border-b border-border bg-card px-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">A</span>
              </div>
              <span>Menu</span>
            </button>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp
          open={shortcutsHelp.isOpen}
          onClose={shortcutsHelp.close}
        />
      </div>
    </AdminThemeProvider>
  )
}
