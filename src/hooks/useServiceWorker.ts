'use client'

import { useEffect, useState, useCallback } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
  updateAvailable: boolean
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
    updateAvailable: false,
  })

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isSupported = 'serviceWorker' in navigator
    setState((prev) => ({ ...prev, isSupported }))

    if (!isSupported) return

    // Set initial online status
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }))

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, updateAvailable: true }))
              }
            })
          }
        })

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Every hour
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    registerSW()

    // Online/offline listeners
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update service worker
  const update = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }, [state.registration])

  // Clear cache
  const clearCache = useCallback(async () => {
    if (!state.registration?.active) return false

    return new Promise<boolean>((resolve) => {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success)
      }
      state.registration?.active?.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    })
  }, [state.registration])

  // Get version
  const getVersion = useCallback(async () => {
    if (!state.registration?.active) return null

    return new Promise<string | null>((resolve) => {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version)
      }
      state.registration?.active?.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      )
    })
  }, [state.registration])

  return {
    ...state,
    update,
    clearCache,
    getVersion,
  }
}
