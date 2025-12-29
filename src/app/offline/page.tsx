'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 mb-6">
          <WifiOff className="w-10 h-10 text-neutral-500" />
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          You&apos;re Offline
        </h1>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
          It looks like you&apos;ve lost your internet connection. Some features may not be
          available until you&apos;re back online.
        </p>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <p className="text-sm text-neutral-500">
            Your data will sync automatically when you reconnect.
          </p>
        </div>

        <div className="mt-8 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-sm max-w-sm mx-auto">
          <h2 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Available Offline
          </h2>
          <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 text-left">
            <li>• View cached pages</li>
            <li>• Access downloaded media</li>
            <li>• Review saved schedules</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
