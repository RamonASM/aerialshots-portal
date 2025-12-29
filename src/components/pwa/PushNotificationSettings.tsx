'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Loader2, AlertCircle } from 'lucide-react'

interface PushNotificationSettingsProps {
  userType: 'agent' | 'staff' | 'client'
  userId: string
}

export function PushNotificationSettings({ userType, userId }: PushNotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription:', err)
    }
  }

  const subscribe = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Request permission if needed
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') {
          setError('Permission denied. Enable notifications in browser settings.')
          return
        }
      } else if (Notification.permission === 'denied') {
        setError('Notifications are blocked. Enable them in browser settings.')
        return
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-public-key')
      const { publicKey } = await vapidResponse.json()

      if (!publicKey) {
        throw new Error('VAPID public key not configured')
      }

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(publicKey)

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userType,
          userId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('Subscribe error:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Remove from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            userType,
            userId,
          }),
        })
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe error:', err)
      setError('Failed to disable notifications')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#8e8e93]/20 p-2.5">
            <BellOff className="h-5 w-5 text-[#8e8e93]" />
          </div>
          <div>
            <h3 className="font-medium text-white">Push Notifications</h3>
            <p className="text-sm text-[#8e8e93]">
              Not supported in this browser
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${isSubscribed ? 'bg-green-500/20' : 'bg-[#0077ff]/20'}`}>
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-400" />
            ) : (
              <Bell className="h-5 w-5 text-[#0077ff]" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-white">Push Notifications</h3>
            <p className="text-sm text-[#8e8e93]">
              {isSubscribed
                ? 'Receiving notifications on this device'
                : 'Get notified about orders, updates, and more'
              }
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading || permission === 'denied'}
          className={`relative rounded-full w-12 h-7 transition-colors ${
            isSubscribed ? 'bg-green-500' : 'bg-[#8e8e93]'
          } ${isLoading ? 'opacity-50' : ''}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
              isSubscribed ? 'left-6' : 'left-1'
            }`}
          />
          {isLoading && (
            <Loader2 className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-5 text-white animate-spin" />
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-400">
            Notifications are blocked. To enable them, click the lock icon in your browser&apos;s
            address bar and allow notifications.
          </p>
        </div>
      )}

      {isSubscribed && (
        <div className="mt-4 pt-4 border-t border-white/[0.08]">
          <h4 className="text-sm font-medium text-white mb-3">Notification Types</h4>
          <div className="space-y-2">
            {[
              { id: 'orders', label: 'Order updates', enabled: true },
              { id: 'deliveries', label: 'Media deliveries', enabled: true },
              { id: 'reminders', label: 'Shoot reminders', enabled: true },
              { id: 'marketing', label: 'Tips & promotions', enabled: false },
            ].map((type) => (
              <label
                key={type.id}
                className="flex items-center justify-between py-1.5 cursor-pointer"
              >
                <span className="text-sm text-[#a1a1a6]">{type.label}</span>
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    type.enabled ? 'bg-[#0077ff]' : 'bg-[#8e8e93]/50'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      type.enabled ? 'left-5' : 'left-1'
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
