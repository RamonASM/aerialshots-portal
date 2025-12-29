'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isStandalone: boolean
}

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isStandalone: false,
  })
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    // Check if already installed (check localStorage)
    const isInstalled = localStorage.getItem('pwa-installed') === 'true' || isStandalone

    setState((prev) => ({
      ...prev,
      isIOS,
      isStandalone,
      isInstalled,
    }))

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState((prev) => ({ ...prev, isInstallable: true }))
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      localStorage.setItem('pwa-installed', 'true')
      setState((prev) => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Trigger install prompt
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        localStorage.setItem('pwa-installed', 'true')
        setState((prev) => ({
          ...prev,
          isInstallable: false,
          isInstalled: true,
        }))
        return true
      }

      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }, [deferredPrompt])

  // Dismiss install prompt
  const dismiss = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    setState((prev) => ({ ...prev, isInstallable: false }))
  }, [])

  // Check if prompt was recently dismissed
  const wasDismissed = useCallback((): boolean => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (!dismissed) return false

    const dismissedAt = parseInt(dismissed, 10)
    const dayInMs = 24 * 60 * 60 * 1000
    return Date.now() - dismissedAt < dayInMs * 7 // Show again after 7 days
  }, [])

  return {
    ...state,
    install,
    dismiss,
    wasDismissed,
    showPrompt: state.isInstallable && !state.isInstalled && !wasDismissed(),
  }
}
