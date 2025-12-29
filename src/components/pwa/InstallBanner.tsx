'use client'

import { useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function PWAInstallBanner() {
  const { showPrompt, isIOS, install, dismiss } = usePWAInstall()
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  if (!showPrompt && !isIOS) return null

  // iOS instructions modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-t-2xl w-full max-w-md p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Install ASM Portal</h3>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Add ASM Portal to your home screen for quick access:
          </p>

          <ol className="space-y-4 mb-6">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Share className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-neutral-500">
                  Located at the bottom of your browser
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Add to Home Screen</p>
                <p className="text-sm text-neutral-500">
                  Scroll down and tap &quot;Add to Home Screen&quot;
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Download className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Tap Add</p>
                <p className="text-sm text-neutral-500">
                  Confirm to install the app
                </p>
              </div>
            </li>
          </ol>

          <Button
            onClick={() => setShowIOSInstructions(false)}
            className="w-full"
          >
            Got it
          </Button>
        </div>
      </div>
    )
  }

  // iOS prompt
  if (isIOS && !showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              Install ASM Portal
            </p>
            <p className="text-sm text-neutral-500">
              Add to home screen for quick access
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
            >
              Later
            </Button>
            <Button
              size="sm"
              onClick={() => setShowIOSInstructions(true)}
            >
              Install
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Standard install prompt (Chrome, Edge, etc.)
  if (showPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              Install ASM Portal
            </p>
            <p className="text-sm text-neutral-500">
              Get faster access and offline support
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismiss}
            >
              Not now
            </Button>
            <Button
              size="sm"
              onClick={install}
            >
              Install
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
