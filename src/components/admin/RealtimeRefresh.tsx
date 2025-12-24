'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Bell, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus'

interface RealtimeRefreshProps {
  /** Statuses to listen for */
  statuses?: string[]
  /** Auto-refresh when updates are received */
  autoRefresh?: boolean
  /** Show connection status indicator */
  showConnectionStatus?: boolean
  /** Custom message when updates are available */
  updateMessage?: string
  /** Callback when an update is received */
  onUpdate?: () => void
}

/**
 * Drop-in component to add realtime refresh capability to server-rendered pages.
 * Shows a notification when new data is available and offers refresh options.
 *
 * @example
 * // In a server component page, add this client component:
 * <RealtimeRefresh statuses={['ready_for_qc', 'in_qc']} />
 */
export function RealtimeRefresh({
  statuses,
  autoRefresh = false,
  showConnectionStatus = true,
  updateMessage = 'New updates available',
  onUpdate,
}: RealtimeRefreshProps) {
  const router = useRouter()
  const [pendingUpdates, setPendingUpdates] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const handleUpdate = useCallback(() => {
    setPendingUpdates((count) => count + 1)
    setLastUpdate(new Date())

    if (onUpdate) {
      onUpdate()
    }

    if (autoRefresh) {
      router.refresh()
      setPendingUpdates(0)
    }
  }, [autoRefresh, router, onUpdate])

  const { isConnected, error } = useRealtimeStatus({
    statuses,
    onUpdate: handleUpdate,
    enabled: true,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    setPendingUpdates(0)
    // Small delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsRefreshing(false)
  }

  // If there are no pending updates and autoRefresh is on, don't show anything
  if (autoRefresh && pendingUpdates === 0 && !showConnectionStatus) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      {showConnectionStatus && (
        <div
          className={`flex items-center gap-1 text-xs ${
            isConnected ? 'text-green-600' : 'text-neutral-400'
          }`}
          title={isConnected ? 'Real-time connected' : 'Connecting...'}
        >
          {isConnected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">
            {isConnected ? 'Live' : 'Connecting'}
          </span>
        </div>
      )}

      {/* Update Notification */}
      {pendingUpdates > 0 && !autoRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="animate-pulse bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          {isRefreshing ? (
            <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <Bell className="mr-2 h-3 w-3" />
          )}
          {pendingUpdates} {pendingUpdates === 1 ? 'update' : 'updates'}
        </Button>
      )}

      {/* Manual Refresh Button */}
      {pendingUpdates === 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
      )}

      {/* Error indicator */}
      {error && (
        <span className="text-xs text-red-500" title={error.message}>
          Connection error
        </span>
      )}
    </div>
  )
}

/**
 * Lightweight version that just shows connection status
 */
export function RealtimeIndicator() {
  const { isConnected } = useRealtimeStatus({ enabled: true })

  return (
    <div
      className={`flex items-center gap-1 text-xs ${
        isConnected ? 'text-green-600' : 'text-neutral-400'
      }`}
    >
      <div
        className={`h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'
        }`}
      />
      <span>{isConnected ? 'Live' : 'Offline'}</span>
    </div>
  )
}
