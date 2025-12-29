'use client'

import { useEffect, useState } from 'react'
import { X, Command, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutCategory {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['G', 'O'], description: 'Go to Operations' },
      { keys: ['G', 'Q'], description: 'Go to QC Live' },
      { keys: ['G', 'C'], description: 'Go to Customer Care' },
      { keys: ['G', 'P'], description: 'Go to Properties' },
      { keys: ['G', 'M'], description: 'Go to Communities' },
      { keys: ['G', 'K'], description: 'Go to Campaigns' },
      { keys: ['G', 'F'], description: 'Go to Agent Portfolios' },
      { keys: ['G', 'T'], description: 'Go to Email Templates' },
      { keys: ['G', 'I'], description: 'Go to Social Media' },
      { keys: ['G', 'A'], description: 'Go to AI Agents' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
      { keys: ['?'], description: 'Show this help' },
      { keys: ['N'], description: 'New item (context-aware)' },
      { keys: ['E'], description: 'Edit selected item' },
      { keys: ['Delete'], description: 'Delete selected item' },
      { keys: ['Escape'], description: 'Close modal / Cancel' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['⌘', 'A'], description: 'Select all' },
      { keys: ['J'], description: 'Move down in list' },
      { keys: ['K'], description: 'Move up in list' },
      { keys: ['Enter'], description: 'Open selected item' },
      { keys: ['Space'], description: 'Toggle selection' },
    ],
  },
]

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
              <Keyboard className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-neutral-500">
                Navigate faster with these shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {SHORTCUTS.map((category) => (
              <div key={category.title}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800/50"
                    >
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className={cn(
                              'flex h-6 min-w-[24px] items-center justify-center rounded border px-1.5 text-xs font-medium',
                              'border-neutral-300 bg-white text-neutral-700 shadow-sm',
                              'dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                            )}
                          >
                            {key === '⌘' ? (
                              <Command className="h-3 w-3" />
                            ) : (
                              key
                            )}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
          <p className="text-center text-xs text-neutral-500">
            Press <kbd className="mx-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-700">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  )
}

// Hook to manage keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}

export default KeyboardShortcutsHelp
