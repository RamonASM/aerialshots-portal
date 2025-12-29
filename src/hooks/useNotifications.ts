'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Note: user_notifications table is created in migration 20241228_006_phase12_realtime.sql
// Type safety is bypassed until types are regenerated after running the migration

export interface Notification {
  id: string
  user_id: string
  user_type: 'staff' | 'agent'
  title: string
  message: string
  type:
    | 'order_new'
    | 'order_status'
    | 'payment_received'
    | 'qc_complete'
    | 'delivery_ready'
    | 'edit_request'
    | 'task_assigned'
    | 'task_due'
    | 'system'
    | 'info'
    | 'warning'
    | 'error'
  entity_type?: string
  entity_id?: string
  action_url?: string
  is_read: boolean
  read_at?: string
  is_archived: boolean
  archived_at?: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface UseNotificationsOptions {
  userId?: string
  userType?: 'staff' | 'agent'
  limit?: number
  includeArchived?: boolean
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  archiveNotification: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { userId, userType = 'staff', limit = 50, includeArchived = false } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('user_type', userType)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!includeArchived) {
        query = query.eq('is_archived', false)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const typedData = (data || []) as Notification[]
      setNotifications(typedData)
      setUnreadCount(typedData.filter((n) => !n.is_read).length)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, userType, limit, includeArchived])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    const setupRealtime = async () => {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updated = payload.new as Notification
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            )
            // Recalculate unread count
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.is_read && !n.is_archived).length)
              return prev
            })
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = useCallback(
    async (id: string) => {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) {
        console.error('Error marking notification as read:', updateError)
        return
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    []
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_read', false)

    if (updateError) {
      console.error('Error marking all notifications as read:', updateError)
      return
    }

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)
  }, [userId, userType])

  const archiveNotification = useCallback(async (id: string) => {
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('user_notifications')
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Error archiving notification:', updateError)
      return
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id))
    // Update unread count if archived notification was unread
    const notification = notifications.find((n) => n.id === id)
    if (notification && !notification.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }, [notifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    refetch: fetchNotifications,
  }
}
