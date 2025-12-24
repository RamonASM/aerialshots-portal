'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Listing {
  id: string
  address: string
  city: string | null
  state: string
  ops_status: string | null
  is_rush: boolean | null
  scheduled_at: string | null
  staged_at?: string | null
  editing_started_at?: string | null
  editing_completed_at?: string | null
  editor_id?: string | null
  photographer_id?: string | null
  agent_id: string | null
  [key: string]: unknown
}

interface UseRealtimeListingsOptions {
  statuses?: string[]
  editorId?: string
  photographerId?: string
  onUpdate?: (listing: Listing) => void
  onInsert?: (listing: Listing) => void
  onDelete?: (id: string) => void
}

/**
 * Hook for real-time listing updates using Supabase Realtime
 * Subscribes to changes in the listings table and updates local state
 */
export function useRealtimeListings(options: UseRealtimeListingsOptions = {}) {
  const { statuses, editorId, photographerId, onUpdate, onInsert, onDelete } = options
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch initial data
  const fetchListings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase.from('listings').select('*')

      if (statuses && statuses.length > 0) {
        query = query.in('ops_status', statuses)
      }

      if (editorId) {
        query = query.eq('editor_id', editorId)
      }

      if (photographerId) {
        query = query.eq('photographer_id', photographerId)
      }

      const { data, error: fetchError } = await query.order('scheduled_at', { ascending: true })

      if (fetchError) throw fetchError

      setListings(data || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch listings'))
    } finally {
      setIsLoading(false)
    }
  }, [statuses, editorId, photographerId])

  // Handle realtime updates
  const handleRealtimeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Listing>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload

      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            // Check if it matches our filter
            const matchesFilter =
              (!statuses || statuses.length === 0 || (newRecord.ops_status && statuses.includes(newRecord.ops_status))) &&
              (!editorId || newRecord.editor_id === editorId) &&
              (!photographerId || newRecord.photographer_id === photographerId)

            if (matchesFilter) {
              setListings((prev) => [...prev, newRecord as Listing])
              onInsert?.(newRecord as Listing)
            }
          }
          break

        case 'UPDATE':
          if (newRecord) {
            const matchesFilter =
              (!statuses || statuses.length === 0 || (newRecord.ops_status && statuses.includes(newRecord.ops_status))) &&
              (!editorId || newRecord.editor_id === editorId) &&
              (!photographerId || newRecord.photographer_id === photographerId)

            setListings((prev) => {
              const existingIndex = prev.findIndex((l) => l.id === newRecord.id)

              if (existingIndex >= 0) {
                if (matchesFilter) {
                  // Update existing
                  const updated = [...prev]
                  updated[existingIndex] = newRecord as Listing
                  onUpdate?.(newRecord as Listing)
                  return updated
                } else {
                  // Remove if no longer matches filter
                  return prev.filter((l) => l.id !== newRecord.id)
                }
              } else if (matchesFilter) {
                // Add if now matches filter
                onInsert?.(newRecord as Listing)
                return [...prev, newRecord as Listing]
              }

              return prev
            })
          }
          break

        case 'DELETE':
          if (oldRecord && oldRecord.id) {
            setListings((prev) => prev.filter((l) => l.id !== oldRecord.id))
            onDelete?.(oldRecord.id)
          }
          break
      }
    },
    [statuses, editorId, photographerId, onUpdate, onInsert, onDelete]
  )

  // Set up realtime subscription
  useEffect(() => {
    fetchListings()

    const supabase = createClient()
    const channel = supabase
      .channel('listings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
        },
        handleRealtimeChange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchListings, handleRealtimeChange])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchListings()
  }, [fetchListings])

  return {
    listings,
    isLoading,
    error,
    refresh,
  }
}

/**
 * Hook for real-time single listing updates
 */
export function useRealtimeListing(listingId: string) {
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial data
    const fetchListing = async () => {
      setIsLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single()

        if (fetchError) throw fetchError
        setListing(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch listing'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchListing()

    // Subscribe to changes
    const channel = supabase
      .channel(`listing-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
          filter: `id=eq.${listingId}`,
        },
        (payload) => {
          if (payload.new) {
            setListing(payload.new as Listing)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [listingId])

  return { listing, isLoading, error }
}
