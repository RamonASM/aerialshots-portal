'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ClientMessage = Database['public']['Tables']['client_messages']['Row']

interface UseClientMessagesOptions {
  listingId: string
  shareLinkId?: string | null
  enabled?: boolean
}

interface UseClientMessagesResult {
  messages: ClientMessage[]
  isLoading: boolean
  error: Error | null
  sendMessage: (content: string, senderName?: string, senderEmail?: string) => Promise<boolean>
  markAsRead: (messageIds?: string[]) => Promise<void>
  unreadCount: number
  refetch: () => Promise<void>
}

export function useClientMessages({
  listingId,
  shareLinkId,
  enabled = true,
}: UseClientMessagesOptions): UseClientMessagesResult {
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!enabled || !listingId) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ listing_id: listingId })
      if (shareLinkId) {
        params.append('share_link_id', shareLinkId)
      }

      const response = await fetch(`/api/messages?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled, listingId, shareLinkId])

  // Setup real-time subscription
  useEffect(() => {
    if (!enabled || !listingId) return

    // Initial fetch
    fetchMessages()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`messages:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newMessage = payload.new as ClientMessage
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ClientMessage
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, listingId, supabase, fetchMessages])

  // Send message
  const sendMessage = useCallback(
    async (content: string, senderName?: string, senderEmail?: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            listing_id: listingId,
            share_link_id: shareLinkId,
            content,
            sender_name: senderName,
            sender_email: senderEmail,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message')
        }

        // Optimistically add message (real-time will update if needed)
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) {
              return prev
            }
            return [...prev, data.message]
          })
        }

        return true
      } catch (err) {
        console.error('Error sending message:', err)
        return false
      }
    },
    [listingId, shareLinkId]
  )

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds?: string[]) => {
      try {
        const response = await fetch('/api/messages', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            listing_id: listingId,
            message_ids: messageIds,
            mark_all: !messageIds?.length,
          }),
        })

        if (response.ok) {
          // Update local state
          const now = new Date().toISOString()
          setMessages((prev) =>
            prev.map((m) => {
              if (!messageIds?.length || messageIds.includes(m.id)) {
                return { ...m, read_at: m.read_at || now }
              }
              return m
            })
          )
        }
      } catch (err) {
        console.error('Error marking messages as read:', err)
      }
    },
    [listingId]
  )

  // Calculate unread count
  const unreadCount = messages.filter((m) => !m.read_at).length

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    unreadCount,
    refetch: fetchMessages,
  }
}
