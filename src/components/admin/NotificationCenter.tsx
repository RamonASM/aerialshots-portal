'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Check,
  CheckCheck,
  Camera,
  Edit3,
  CheckCircle,
  Truck,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  X,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

// Notification types matching the database
export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, unknown>
}

// Icon mapping for notification types
const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  job_assigned: Camera,
  job_completed: CheckCircle,
  edit_complete: Edit3,
  qc_complete: CheckCircle,
  delivery_ready: Truck,
  payment_received: CreditCard,
  message_received: MessageSquare,
  alert: AlertTriangle,
  default: Bell,
}

// Color mapping for notification types
const NOTIFICATION_COLORS: Record<string, string> = {
  job_assigned: 'text-blue-500',
  job_completed: 'text-green-500',
  edit_complete: 'text-violet-500',
  qc_complete: 'text-cyan-500',
  delivery_ready: 'text-emerald-500',
  payment_received: 'text-green-600',
  message_received: 'text-indigo-500',
  alert: 'text-amber-500',
  default: 'text-muted-foreground',
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const supabase = createClient()

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get staff ID for the current user
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!staff) return

      // For now, we'll use the notification_logs table
      // In a full implementation, this would be a dedicated notifications table
      const { data } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) {
        // Transform notification_logs to our Notification format
        const transformedNotifications: Notification[] = data.map((log) => {
          const metadata = log.metadata as Record<string, unknown> | null
          return {
            id: log.id,
            type: log.notification_type || 'default',
            title: getNotificationTitle(log.notification_type || 'notification'),
            message: log.channel
              ? `Notification sent via ${log.channel}`
              : 'New notification',
            link: metadata?.link as string | undefined,
            is_read: log.status === 'opened' || log.status === 'delivered',
            created_at: log.created_at || new Date().toISOString(),
            metadata: metadata ?? undefined,
          }
        })
        setNotifications(transformedNotifications)
        setUnreadCount(transformedNotifications.filter((n) => !n.is_read).length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
        },
        (payload) => {
          const newLog = payload.new as Record<string, unknown>
          const newNotification: Notification = {
            id: newLog.id as string,
            type: (newLog.notification_type as string) || 'default',
            title: getNotificationTitle(
              (newLog.notification_type as string) || 'notification'
            ),
            message: newLog.template_id
              ? `Notification sent via ${newLog.channel}`
              : 'New notification',
            link: (newLog.metadata as Record<string, unknown> | undefined)
              ?.link as string | undefined,
            is_read: false,
            created_at: newLog.created_at as string,
            metadata: newLog.metadata as Record<string, unknown> | undefined,
          }
          setNotifications((prev) => [newNotification, ...prev.slice(0, 19)])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notification_logs')
        .update({ status: 'opened' })
        .eq('id', id)

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
      if (unreadIds.length === 0) return

      await supabase
        .from('notification_logs')
        .update({ status: 'opened' })
        .in('id', unreadIds)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Get notification title from type
  function getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
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
    }
    return titles[type] || 'Notification'
  }

  const Icon = (type: string) => {
    const IconComponent = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default
    return IconComponent
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault()
                  markAllAsRead()
                }}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.preventDefault()
                fetchNotifications()
              }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading && notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const IconComponent = Icon(notification.type)
              const colorClass =
                NOTIFICATION_COLORS[notification.type] ||
                NOTIFICATION_COLORS.default

              const content = (
                <div
                  className={`flex items-start gap-3 p-3 ${
                    !notification.is_read ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className={`mt-0.5 ${colorClass}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notification.is_read
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              )

              if (notification.link) {
                return (
                  <DropdownMenuItem key={notification.id} asChild className="p-0">
                    <Link
                      href={notification.link}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id)
                        }
                        setIsOpen(false)
                      }}
                    >
                      {content}
                    </Link>
                  </DropdownMenuItem>
                )
              }

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-0 cursor-default"
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id)
                    }
                  }}
                >
                  {content}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/admin/notifications"
            className="text-center text-sm text-muted-foreground justify-center"
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
