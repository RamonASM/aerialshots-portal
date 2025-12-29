/**
 * usePhotographerLocation
 *
 * Real-time subscription to photographer location updates.
 * Used by sellers to track their photographer during scheduled shoots.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PhotographerLocation {
  id: string
  latitude: number
  longitude: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  status: 'en_route' | 'arriving' | 'on_site' | 'shooting' | 'departing' | 'offline'
  eta_minutes: number | null
  last_updated_at: string
  staff: {
    id: string
    name: string
  } | null
}

interface UsePhotographerLocationOptions {
  listingId: string
  enabled?: boolean
}

interface UsePhotographerLocationReturn {
  location: PhotographerLocation | null
  isLoading: boolean
  error: string | null
  isConnected: boolean
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

export function usePhotographerLocation({
  listingId,
  enabled = true,
}: UsePhotographerLocationOptions): UsePhotographerLocationReturn {
  const [location, setLocation] = useState<PhotographerLocation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch initial location
  const fetchLocation = useCallback(async () => {
    if (!listingId || !enabled) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/team/location?listing_id=${listingId}`)

      if (!response.ok) {
        if (response.status === 403) {
          setError('Not authorized to view photographer location')
        } else {
          setError('Failed to fetch location')
        }
        return
      }

      const data = await response.json()
      setLocation(data.location)

      if (data.location) {
        setLastUpdated(new Date(data.location.last_updated_at))
      }
    } catch (err) {
      setError('Network error')
      console.error('Error fetching photographer location:', err)
    } finally {
      setIsLoading(false)
    }
  }, [listingId, enabled])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!listingId || !enabled) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      // Initial fetch
      await fetchLocation()

      // Subscribe to realtime changes
      channel = supabase
        .channel(`photographer-location-${listingId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photographer_locations',
            filter: `listing_id=eq.${listingId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newLocation = payload.new as Record<string, unknown>
              setLocation({
                id: newLocation.id as string,
                latitude: newLocation.latitude as number,
                longitude: newLocation.longitude as number,
                accuracy: newLocation.accuracy as number | null,
                heading: newLocation.heading as number | null,
                speed: newLocation.speed as number | null,
                status: newLocation.status as PhotographerLocation['status'],
                eta_minutes: newLocation.eta_minutes as number | null,
                last_updated_at: newLocation.last_updated_at as string,
                staff: null, // Will be populated on next fetch
              })
              setLastUpdated(new Date(newLocation.last_updated_at as string))
            } else if (payload.eventType === 'DELETE') {
              setLocation(null)
              setLastUpdated(null)
            }
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED')
        })
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [listingId, enabled, fetchLocation])

  return {
    location,
    isLoading,
    error,
    isConnected,
    lastUpdated,
    refresh: fetchLocation,
  }
}

// Helper to format status for display
export function formatLocationStatus(status: PhotographerLocation['status']): string {
  const statusLabels: Record<PhotographerLocation['status'], string> = {
    en_route: 'On the way',
    arriving: 'Arriving soon',
    on_site: 'Arrived at property',
    shooting: 'Shooting in progress',
    departing: 'Leaving property',
    offline: 'Offline',
  }
  return statusLabels[status] || status
}

// Helper to get status color
export function getLocationStatusColor(status: PhotographerLocation['status']): string {
  const statusColors: Record<PhotographerLocation['status'], string> = {
    en_route: 'text-blue-500',
    arriving: 'text-yellow-500',
    on_site: 'text-green-500',
    shooting: 'text-purple-500',
    departing: 'text-orange-500',
    offline: 'text-neutral-500',
  }
  return statusColors[status] || 'text-neutral-500'
}

// Helper to format ETA
export function formatETA(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return 'Unknown'
  if (minutes <= 0) return 'Arriving now'
  if (minutes === 1) return '1 minute'
  if (minutes < 60) return `${minutes} minutes`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}
