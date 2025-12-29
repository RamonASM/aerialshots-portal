'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Camera,
  ClipboardCheck,
  HeartHandshake,
  Bot,
  Layers,
  Settings,
  Code2,
  BarChart3,
  Users,
  Home,
  Map,
  Plus,
  Play,
  Search,
  FileText,
  Calendar,
  Zap
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getAllNavItems } from '@/lib/admin/navigation'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const quickActions = [
  {
    id: 'new-job',
    label: 'Create New Job',
    icon: Plus,
    shortcut: 'N',
    action: '/admin/ops/jobs/new'
  },
  {
    id: 'run-agent',
    label: 'Run AI Agent',
    icon: Zap,
    shortcut: 'A',
    action: '/admin/agents'
  },
  {
    id: 'view-schedule',
    label: 'View Today\'s Schedule',
    icon: Calendar,
    shortcut: 'T',
    action: '/admin/ops?view=today'
  }
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const navItems = getAllNavItems()

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-[640px]">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3"
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions">
              {quickActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => runCommand(() => router.push(action.action))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{action.label}</span>
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                    {action.shortcut}
                  </kbd>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Go to">
              {navItems.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.name} ${item.description || ''}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </div>
                  {item.shortcut && (
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                      {item.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Recent Commands (placeholder for future) */}
            <Command.Group heading="Recent">
              <Command.Item
                value="recent operations"
                onSelect={() => runCommand(() => router.push('/admin/ops'))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span>Operations Dashboard</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Last visited
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">↑</kbd>
                <kbd className="rounded border bg-muted px-1">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1">↵</kbd>
                to select
              </span>
            </div>
            <span className="hidden sm:inline">
              Press <kbd className="rounded border bg-muted px-1">G</kbd> then a key for shortcuts
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
