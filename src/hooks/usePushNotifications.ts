'use client'

import { useEffect, useState, useCallback } from 'react'

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | 'default'
  subscription: PushSubscription | null
  isSubscribed: boolean
}

// VAPID public key - should be set in environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    subscription: null,
    isSubscribed: false,
  })

  // Check support and current state
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    const permission = 'Notification' in window ? Notification.permission : 'default'

    setState((prev) => ({
      ...prev,
      isSupported,
      permission,
    }))

    if (!isSupported) return

    // Get existing subscription
    const getSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setState((prev) => ({
          ...prev,
          subscription,
          isSubscribed: !!subscription,
        }))
      } catch (error) {
        console.error('Error getting push subscription:', error)
      }
    }

    getSubscription()
  }, [])

  // Request permission and subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false

    try {
      // Request permission
      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      if (permission !== 'granted') return false

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setState((prev) => ({
        ...prev,
        subscription,
        isSubscribed: true,
      }))

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return false
    }
  }, [state.isSupported])

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return false

    try {
      await state.subscription.unsubscribe()

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: state.subscription.endpoint }),
      })

      setState((prev) => ({
        ...prev,
        subscription: null,
        isSubscribed: false,
      }))

      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }, [state.subscription])

  // Send a test notification (for development)
  const sendTestNotification = useCallback(async () => {
    if (!state.isSubscribed) return

    try {
      await fetch('/api/push/test', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }, [state.isSubscribed])

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
