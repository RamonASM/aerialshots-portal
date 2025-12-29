'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeNotification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  metadata?: Record<string, unknown>
}

export interface UseRealtimeNotificationsOptions {
  /** Maximum number of notifications to keep in state */
  limit?: number
  /** Whether to auto-connect on mount */
  autoConnect?: boolean
  /** Callback when a new notification arrives */
  onNotification?: (notification: RealtimeNotification) => void
  /** Play sound on new notification */
  playSound?: boolean
  /** Show browser notification */
  showBrowserNotification?: boolean
}

export interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[]
  unreadCount: number
  isConnected: boolean
  isLoading: boolean
  error: Error | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearAll: () => void
  refresh: () => Promise<void>
  connect: () => void
  disconnect: () => void
}

// Notification type titles
const NOTIFICATION_TITLES: Record<string, string> = {
  job_assigned: 'New Job Assigned',
  job_completed: 'Job Completed',
  edit_complete: 'Editing Complete',
  qc_complete: 'QC Approved',
  delivery_ready: 'Ready for Delivery',
  payment_received: 'Payment Received',
  message_received: 'New Message',
  alert: 'Alert',
  photographer_assigned: 'Photographer Assigned',
  editor_assigned: 'Editor Assigned',
  status_update: 'Status Update',
  booking_confirmed: 'Booking Confirmed',
  order_created: 'New Order',
}

export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    limit = 50,
    autoConnect = true,
    onNotification,
    playSound = false,
    showBrowserNotification = false,
  } = options

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (typeof window !== 'undefined' && playSound) {
      try {
        const audio = new Audio('/sounds/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {
          // Ignore autoplay errors
        })
      } catch {
        // Ignore audio errors
      }
    }
  }, [playSound])

  // Show browser notification
  const showBrowserNotificationFn = useCallback(
    (notification: RealtimeNotification) => {
      if (
        typeof window !== 'undefined' &&
        showBrowserNotification &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        })
      }
    },
    [showBrowserNotification]
  )

  // Request browser notification permission
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      showBrowserNotification &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission()
    }
  }, [showBrowserNotification])

  // Transform database record to notification
  const transformNotification = useCallback(
    (record: Record<string, unknown>): RealtimeNotification => {
      const type = (record.notification_type as string) || 'default'
      const metadata = record.metadata as Record<string, unknown> | undefined

      return {
        id: record.id as string,
        type,
        title: NOTIFICATION_TITLES[type] || 'Notification',
        message: metadata?.message as string ||
          (record.template_id
            ? `Notification sent via ${record.channel}`
            : 'New notification'),
        link: metadata?.link as string | undefined,
        is_read: record.status === 'opened' || record.status === 'delivered',
        created_at: record.created_at as string,
        priority: metadata?.priority as RealtimeNotification['priority'] || 'normal',
        metadata,
      }
    },
    []
  )

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      if (data) {
        const transformedNotifications = data.map(transformNotification)
        setNotifications(transformedNotifications)
        setUnreadCount(
          transformedNotifications.filter((n) => !n.is_read).length
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, limit, transformNotification])

  // Connect to realtime channel
  const connect = useCallback(() => {
    if (channelRef.current) return

    channelRef.current = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
        },
        (payload) => {
          const newNotification = transformNotification(
            payload.new as Record<string, unknown>
          )

          setNotifications((prev) => {
            const updated = [newNotification, ...prev]
            return updated.slice(0, limit)
          })
          setUnreadCount((prev) => prev + 1)

          // Trigger callbacks
          onNotification?.(newNotification)
          playNotificationSound()
          showBrowserNotificationFn(newNotification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_logs',
        },
        (payload) => {
          const updated = transformNotification(
            payload.new as Record<string, unknown>
          )
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.is_read).length)
            return prev
          })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })
  }, [
    supabase,
    limit,
    transformNotification,
    onNotification,
    playNotificationSound,
    showBrowserNotificationFn,
  ])

  // Disconnect from realtime channel
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [supabase])

  // Mark notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const { error: updateError } = await supabase
          .from('notification_logs')
          .update({ status: 'opened' })
          .eq('id', id)

        if (updateError) throw updateError

        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    },
    [supabase]
  )

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    try {
      const { error: updateError } = await supabase
        .from('notification_logs')
        .update({ status: 'opened' })
        .in('id', unreadIds)

      if (updateError) throw updateError

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [supabase, notifications])

  // Clear all notifications from state (not database)
  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  // Refresh notifications
  const refresh = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  // Auto-connect and fetch on mount
  useEffect(() => {
    fetchNotifications()

    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect, fetchNotifications])

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
    connect,
    disconnect,
  }
}
