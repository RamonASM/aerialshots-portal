'use client'

/**
 * useRealtimeCollaboration Hook
 *
 * Provides real-time collaboration features using Supabase Realtime.
 * Handles presence, cursors, and optimistic updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import {
  createPresenceState,
  updatePresenceState,
  createCursor,
  updateCursor,
  calculateCursorInterpolation,
  createCollaborationSession,
  addParticipant,
  removeParticipant,
  updateParticipant,
  getActiveParticipants,
  type PresenceState,
  type Cursor,
  type CollaborationSession,
  type PresenceLocation,
} from '@/lib/realtime/collaboration'

interface UseRealtimeCollaborationOptions {
  resourceType: string
  resourceId: string
  userId: string
  userName: string
  userAvatar?: string
  enabled?: boolean
  trackCursor?: boolean
  heartbeatInterval?: number
  onParticipantJoin?: (presence: PresenceState) => void
  onParticipantLeave?: (userId: string) => void
  onCursorUpdate?: (cursor: Cursor) => void
}

interface UseRealtimeCollaborationReturn {
  session: CollaborationSession | null
  participants: PresenceState[]
  cursors: Map<string, Cursor>
  myPresence: PresenceState | null
  isConnected: boolean
  error: Error | null
  updateLocation: (location: PresenceLocation) => void
  updateStatus: (status: PresenceState['status']) => void
  updateCursorPosition: (position: { x: number; y: number }) => void
  disconnect: () => void
}

export function useRealtimeCollaboration(
  options: UseRealtimeCollaborationOptions
): UseRealtimeCollaborationReturn {
  const {
    resourceType,
    resourceId,
    userId,
    userName,
    userAvatar,
    enabled = true,
    trackCursor = false,
    heartbeatInterval = 10000,
    onParticipantJoin,
    onParticipantLeave,
    onCursorUpdate,
  } = options

  // State
  const [session, setSession] = useState<CollaborationSession | null>(null)
  const [myPresence, setMyPresence] = useState<PresenceState | null>(null)
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const cursorChannelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const callbacksRef = useRef({ onParticipantJoin, onParticipantLeave, onCursorUpdate })

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = { onParticipantJoin, onParticipantLeave, onCursorUpdate }
  }, [onParticipantJoin, onParticipantLeave, onCursorUpdate])

  // Initialize presence and session
  useEffect(() => {
    if (!enabled) return

    const presence = createPresenceState({
      userId,
      userName,
      userAvatar,
    })

    const newSession = createCollaborationSession({
      resourceType,
      resourceId,
      ownerId: userId,
    })

    setMyPresence(presence)
    setSession(addParticipant(newSession, presence, 'owner'))
  }, [enabled, userId, userName, userAvatar, resourceType, resourceId])

  // Set up Supabase Realtime connection
  useEffect(() => {
    if (!enabled || !myPresence) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channelName = `presence-${resourceType}-${resourceId}`

    // Main presence channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channelRef.current = channel

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceState>()

      setSession((prev) => {
        if (!prev) return prev

        let updated = prev

        // Update with all current presences
        Object.entries(state).forEach(([key, presences]) => {
          if (presences.length > 0) {
            const presence = presences[0] as unknown as PresenceState
            // Reconstruct dates
            const reconstructed: PresenceState = {
              ...presence,
              lastSeen: new Date(presence.lastSeen),
            }

            if (key !== userId) {
              if (!updated.participants.some((p) => p.userId === key)) {
                updated = addParticipant(updated, reconstructed)
                callbacksRef.current.onParticipantJoin?.(reconstructed)
              } else {
                updated = updateParticipant(updated, reconstructed)
              }
            }
          }
        })

        return updated
      })
    })

    // Handle joins
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (key === userId) return

      const presence = newPresences[0] as unknown as PresenceState
      const reconstructed: PresenceState = {
        ...presence,
        lastSeen: new Date(presence.lastSeen),
      }

      setSession((prev) => {
        if (!prev) return prev
        return addParticipant(prev, reconstructed)
      })

      callbacksRef.current.onParticipantJoin?.(reconstructed)
    })

    // Handle leaves
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key === userId) return

      setSession((prev) => {
        if (!prev) return prev
        return removeParticipant(prev, key)
      })

      setCursors((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })

      callbacksRef.current.onParticipantLeave?.(key)
    })

    // Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence
        await channel.track(myPresence)
        setIsConnected(true)
        setError(null)
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false)
        setError(new Error('Failed to connect to collaboration channel'))
      } else if (status === 'CLOSED') {
        setIsConnected(false)
      }
    })

    // Set up cursor channel if tracking
    if (trackCursor) {
      const cursorChannel = supabase.channel(`cursors-${resourceType}-${resourceId}`)
      cursorChannelRef.current = cursorChannel

      cursorChannel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId === userId) return

        const cursor: Cursor = {
          ...payload,
          timestamp: new Date(payload.timestamp),
        }

        setCursors((prev) => {
          const next = new Map(prev)
          const existing = next.get(cursor.userId)

          if (existing) {
            next.set(cursor.userId, updateCursor(existing, cursor.position))
          } else {
            next.set(cursor.userId, cursor)
          }

          return next
        })

        callbacksRef.current.onCursorUpdate?.(cursor)
      })

      cursorChannel.subscribe()
    }

    // Heartbeat to keep presence alive
    heartbeatRef.current = setInterval(() => {
      const updatedPresence = updatePresenceState(myPresence, {})
      setMyPresence(updatedPresence)
      channel.track(updatedPresence)
    }, heartbeatInterval)

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      if (cursorChannelRef.current) {
        supabase.removeChannel(cursorChannelRef.current)
      }
    }
  }, [
    enabled,
    myPresence?.userId,
    resourceType,
    resourceId,
    userId,
    trackCursor,
    heartbeatInterval,
  ])

  // Update location
  const updateLocation = useCallback(
    (location: PresenceLocation) => {
      if (!myPresence || !channelRef.current) return

      const updated = updatePresenceState(myPresence, { location })
      setMyPresence(updated)
      channelRef.current.track(updated)
    },
    [myPresence]
  )

  // Update status
  const updateStatus = useCallback(
    (status: PresenceState['status']) => {
      if (!myPresence || !channelRef.current) return

      const updated = updatePresenceState(myPresence, { status })
      setMyPresence(updated)
      channelRef.current.track(updated)
    },
    [myPresence]
  )

  // Update cursor position
  const updateCursorPosition = useCallback(
    (position: { x: number; y: number }) => {
      if (!trackCursor || !cursorChannelRef.current) return

      const cursor = createCursor({
        userId,
        position,
        color: generateUserColor(userId),
        label: userName,
      })

      cursorChannelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: cursor,
      })
    },
    [trackCursor, userId, userName]
  )

  // Disconnect
  const disconnect = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (cursorChannelRef.current) {
      supabase.removeChannel(cursorChannelRef.current)
      cursorChannelRef.current = null
    }

    setIsConnected(false)
  }, [])

  // Get active participants (excluding self)
  const participants = session
    ? getActiveParticipants(session).filter((p) => p.userId !== userId)
    : []

  return {
    session,
    participants,
    cursors,
    myPresence,
    isConnected,
    error,
    updateLocation,
    updateStatus,
    updateCursorPosition,
    disconnect,
  }
}

// Helper to generate consistent color for a user
function generateUserColor(userId: string): string {
  const colors = [
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#14B8A6', // teal
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Hook for displaying cursor positions with interpolation
 */
export function useInterpolatedCursors(cursors: Map<string, Cursor>) {
  const [interpolatedCursors, setInterpolatedCursors] = useState<
    Map<string, { x: number; y: number; color?: string; label?: string }>
  >(new Map())

  useEffect(() => {
    const interval = setInterval(() => {
      const interpolated = new Map<
        string,
        { x: number; y: number; color?: string; label?: string }
      >()

      cursors.forEach((cursor, userId) => {
        const position = calculateCursorInterpolation(cursor)
        interpolated.set(userId, {
          ...position,
          color: cursor.color,
          label: cursor.label,
        })
      })

      setInterpolatedCursors(interpolated)
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [cursors])

  return interpolatedCursors
}
