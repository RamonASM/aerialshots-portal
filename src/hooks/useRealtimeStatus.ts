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

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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
