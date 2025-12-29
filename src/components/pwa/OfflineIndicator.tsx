'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { useServiceWorker } from '@/hooks/useServiceWorker'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOnline, updateAvailable, update } = useServiceWorker()

  if (isOnline && !updateAvailable) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You&apos;re offline
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Some features may be limited
            </p>
          </div>
        </div>
      )}

      {/* Update available */}
      {updateAvailable && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Update available
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Refresh to get the latest version
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={update}
            className="flex-shrink-0"
          >
            Update
          </Button>
        </div>
      )}
    </div>
  )
}
