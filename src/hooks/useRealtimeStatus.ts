'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ListingUpdate {
  id: string
  ops_status: string
  updated_at: string
  [key: string]: unknown
}

interface UseRealtimeStatusOptions {
  /** Filter to only listen for specific listing IDs */
  listingIds?: string[]
  /** Filter to only listen for specific statuses */
  statuses?: string[]
  /** Callback when a listing status changes */
  onStatusChange?: (payload: ListingUpdate) => void
  /** Callback when any listing is updated */
  onUpdate?: (payload: ListingUpdate) => void
  /** Enable/disable the subscription */
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time listing status updates
 *
 * @example
 * // Listen to all status changes
 * const { updates, isConnected } = useRealtimeStatus({
 *   onStatusChange: (listing) => console.log('Status changed:', listing)
 * })
 *
 * @example
 * // Listen to specific listings
 * const { updates } = useRealtimeStatus({
 *   listingIds: ['uuid1', 'uuid2'],
 *   onUpdate: (listing) => refreshList()
 * })
 */
export function useRealtimeStatus(options: UseRealtimeStatusOptions = {}) {
  const {
    listingIds,
    statuses,
    onStatusChange,
    onUpdate,
    enabled = true,
  } = options

  const [updates, setUpdates] = useState<ListingUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const clearUpdates = useCallback(() => {
    setUpdates([])
  }, [])

  useEffect(() => {
    if (!enabled) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      setError(new Error('Supabase realtime not configured'))
      setIsConnected(false)
      return
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseKey)

    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      try {
        // Build filter for specific listings if provided
        let filter = 'ops_status=neq.null'
        if (listingIds && listingIds.length > 0) {
          filter = `id=in.(${listingIds.join(',')})`
        }

        channel = supabase
          .channel('listings-status-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'listings',
              filter,
            },
            (payload) => {
              const listing = payload.new as ListingUpdate
              const oldListing = payload.old as Partial<ListingUpdate>

              // Check if status actually changed
              const statusChanged = oldListing.ops_status !== listing.ops_status

              // Filter by specific statuses if provided
              if (statuses && statuses.length > 0) {
                if (!statuses.includes(listing.ops_status)) {
                  return
                }
              }

              // Add to updates list
              setUpdates((prev) => [listing, ...prev.slice(0, 49)])

              // Call callbacks
              if (statusChanged && onStatusChange) {
                onStatusChange(listing)
              }

              if (onUpdate) {
                onUpdate(listing)
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              setError(null)
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false)
              setError(new Error('Failed to connect to realtime channel'))
            } else if (status === 'CLOSED') {
              setIsConnected(false)
            }
          })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setIsConnected(false)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [enabled, listingIds?.join(','), statuses?.join(','), onStatusChange, onUpdate])

  return {
    /** Recent updates (most recent first, max 50) */
    updates,
    /** Whether the realtime connection is active */
    isConnected,
    /** Any connection error */
    error,
    /** Clear the updates list */
    clearUpdates,
  }
}

/**
 * Hook for subscribing to assignment changes
 */
export function useRealtimeAssignments(options: {
  staffId?: string
  onAssignment?: (assignment: unknown) => void
  enabled?: boolean
} = {}) {
  const { staffId, onAssignment, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      setIsConnected(false)
      return
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseKey)

    let filter = undefined
    if (staffId) {
      filter = `photographer_id=eq.${staffId}`
    }

    const channel = supabase
      .channel('photographer-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photographer_assignments',
          filter,
        },
        (payload) => {
          if (onAssignment) {
            onAssignment(payload.new)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, staffId, onAssignment])

  return { isConnected }
}

/**
 * Hook for subscribing to QC queue changes
 */
export function useRealtimeQCQueue(options: {
  onUpdate?: () => void
  enabled?: boolean
} = {}) {
  const { onUpdate, enabled = true } = options
  const [count, setCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      setIsConnected(false)
      return
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseKey)

    const channel = supabase
      .channel('qc-queue')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
          filter: 'ops_status=in.(ready_for_qc,in_qc)',
        },
        () => {
          setCount((c) => c + 1)
          if (onUpdate) {
            onUpdate()
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, onUpdate])

  return {
    /** Number of updates received */
    updateCount: count,
    isConnected,
  }
}

/**
 * Hook for subscribing to order changes
 */
export function useRealtimeOrders(options: {
  orderId?: string
  agentId?: string
  onInsert?: (order: unknown) => void
  onUpdate?: (order: unknown) => void
  enabled?: boolean
} = {}) {
  const { orderId, agentId, onInsert, onUpdate, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<unknown>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let filter: string | undefined
    if (orderId) {
      filter = `id=eq.${orderId}`
    } else if (agentId) {
      filter = `agent_id=eq.${agentId}`
    }

    const channel = supabase
      .channel(`orders-${orderId || agentId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          setLastUpdate(payload.new)
          onInsert?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          setLastUpdate(payload.new)
          onUpdate?.(payload.new)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, orderId, agentId, onInsert, onUpdate])

  return { isConnected, lastUpdate }
}

/**
 * Hook for subscribing to media asset changes
 */
export function useRealtimeMediaAssets(options: {
  listingId?: string
  onInsert?: (asset: unknown) => void
  onUpdate?: (asset: unknown) => void
  onDelete?: (asset: unknown) => void
  enabled?: boolean
} = {}) {
  const { listingId, onInsert, onUpdate, onDelete, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [assetCount, setAssetCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const filter = listingId ? `listing_id=eq.${listingId}` : undefined

    const channel = supabase
      .channel(`media-assets-${listingId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media_assets',
          filter,
        },
        (payload) => {
          setAssetCount((c) => c + 1)
          onInsert?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_assets',
          filter,
        },
        (payload) => {
          onUpdate?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'media_assets',
          filter,
        },
        (payload) => {
          setAssetCount((c) => Math.max(0, c - 1))
          onDelete?.(payload.old)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, listingId, onInsert, onUpdate, onDelete])

  return { isConnected, assetCount }
}

/**
 * Hook for subscribing to client messages
 */
export function useRealtimeMessages(options: {
  listingId?: string
  shareToken?: string
  onNewMessage?: (message: unknown) => void
  enabled?: boolean
} = {}) {
  const { listingId, shareToken, onNewMessage, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let filter: string | undefined
    if (listingId) {
      filter = `listing_id=eq.${listingId}`
    }

    const channel = supabase
      .channel(`messages-${listingId || shareToken || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter,
        },
        (payload) => {
          setUnreadCount((c) => c + 1)
          onNewMessage?.(payload.new)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, listingId, shareToken, onNewMessage])

  return { isConnected, unreadCount, clearUnread: () => setUnreadCount(0) }
}

/**
 * Hook for subscribing to job task changes
 */
export function useRealtimeJobTasks(options: {
  listingId?: string
  assigneeId?: string
  onTaskChange?: (task: unknown, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  enabled?: boolean
} = {}) {
  const { listingId, assigneeId, onTaskChange, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [pendingTasks, setPendingTasks] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let filter: string | undefined
    if (listingId) {
      filter = `listing_id=eq.${listingId}`
    } else if (assigneeId) {
      filter = `assignee_id=eq.${assigneeId}`
    }

    const channel = supabase
      .channel(`job-tasks-${listingId || assigneeId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_tasks',
          filter,
        },
        (payload) => {
          setPendingTasks((c) => c + 1)
          onTaskChange?.(payload.new, 'INSERT')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_tasks',
          filter,
        },
        (payload) => {
          const task = payload.new as { status?: string }
          if (task.status === 'completed') {
            setPendingTasks((c) => Math.max(0, c - 1))
          }
          onTaskChange?.(payload.new, 'UPDATE')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'job_tasks',
          filter,
        },
        (payload) => {
          setPendingTasks((c) => Math.max(0, c - 1))
          onTaskChange?.(payload.old, 'DELETE')
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, listingId, assigneeId, onTaskChange])

  return { isConnected, pendingTasks }
}

/**
 * Hook for subscribing to notification log changes
 */
export function useRealtimeNotificationLogs(options: {
  onNewNotification?: (notification: unknown) => void
  enabled?: boolean
} = {}) {
  const { onNewNotification, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('notification-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
        },
        (payload) => {
          setCount((c) => c + 1)
          onNewNotification?.(payload.new)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, onNewNotification])

  return { isConnected, count }
}

/**
 * Generic hook for subscribing to any table
 */
export function useRealtimeTable<T = unknown>(options: {
  table: string
  filter?: string
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[]
  onChange?: (data: T, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  enabled?: boolean
}) {
  const { table, filter, events = ['INSERT', 'UPDATE', 'DELETE'], onChange, enabled = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastData, setLastData] = useState<T | null>(null)
  const [lastEventType, setLastEventType] = useState<'INSERT' | 'UPDATE' | 'DELETE' | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let channel = supabase.channel(`${table}-${filter || 'all'}`)

    // Subscribe to INSERT events if requested
    if (events.includes('INSERT')) {
      channel = channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        (payload) => {
          const data = payload.new as T
          setLastData(data)
          setLastEventType('INSERT')
          onChange?.(data, 'INSERT')
        }
      )
    }

    // Subscribe to UPDATE events if requested
    if (events.includes('UPDATE')) {
      channel = channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter },
        (payload) => {
          const data = payload.new as T
          setLastData(data)
          setLastEventType('UPDATE')
          onChange?.(data, 'UPDATE')
        }
      )
    }

    // Subscribe to DELETE events if requested
    if (events.includes('DELETE')) {
      channel = channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter },
        (payload) => {
          const data = payload.old as T
          setLastData(data)
          setLastEventType('DELETE')
          onChange?.(data, 'DELETE')
        }
      )
    }

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, table, filter, events.join(','), onChange])

  return { isConnected, lastData, lastEventType }
}
