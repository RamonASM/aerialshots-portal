'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useBookingStore } from '@/stores/useBookingStore'

const SYNC_DEBOUNCE_MS = 2000 // Sync every 2 seconds of inactivity
const MIN_STEP_FOR_SYNC = 1 // Only sync after package selection

/**
 * Hook to sync booking store with server for cart recovery
 */
export function useBookingSync() {
  const store = useBookingStore()
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedDataRef = useRef<string>('')

  // Sync session to server
  const syncToServer = useCallback(async () => {
    const { formData, currentStep, pricing } = useBookingStore.getState()

    // Only sync if we have meaningful data
    if (currentStep < MIN_STEP_FOR_SYNC || !formData.sessionId) {
      return
    }

    // Create a hash of current data to avoid unnecessary syncs
    const dataHash = JSON.stringify({
      step: currentStep,
      package: formData.packageKey,
      address: formData.propertyAddress,
      date: formData.scheduledDate,
      email: formData.contactEmail,
    })

    if (dataHash === lastSyncedDataRef.current) {
      return // No changes
    }

    try {
      const response = await fetch('/api/booking/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: formData.sessionId,
          currentStep,
          formData: {
            packageKey: formData.packageKey,
            sqftTier: formData.sqftTier,
            addons: formData.addons,
            propertyAddress: formData.propertyAddress,
            propertyCity: formData.propertyCity,
            propertyState: formData.propertyState,
            propertyZip: formData.propertyZip,
            propertyLat: formData.propertyLat,
            propertyLng: formData.propertyLng,
            scheduledDate: formData.scheduledDate,
            scheduledTime: formData.scheduledTime,
            contactName: formData.contactName,
            contactEmail: formData.contactEmail,
            contactPhone: formData.contactPhone,
            couponCode: formData.couponCode,
            utmSource: formData.utmSource,
            utmMedium: formData.utmMedium,
            utmCampaign: formData.utmCampaign,
          },
          pricing: {
            packagePrice: pricing.packagePrice,
            addonsTotal: pricing.addonsTotal,
            travelFee: pricing.travelFee,
            subtotal: pricing.subtotal,
            total: pricing.total,
          },
        }),
      })

      if (response.ok) {
        lastSyncedDataRef.current = dataHash
      }
    } catch (error) {
      console.error('Failed to sync booking session:', error)
    }
  }, [])

  // Debounced sync on store changes
  useEffect(() => {
    // Initialize session on mount
    store.initSession()

    // Subscribe to store changes
    const unsubscribe = useBookingStore.subscribe(() => {
      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Schedule new sync
      syncTimeoutRef.current = setTimeout(syncToServer, SYNC_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [store, syncToServer])

  // Sync before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable sync on page close
      const { formData, currentStep, pricing } = useBookingStore.getState()

      if (currentStep >= MIN_STEP_FOR_SYNC && formData.sessionId) {
        const data = JSON.stringify({
          sessionId: formData.sessionId,
          currentStep,
          formData,
          pricing: {
            packagePrice: pricing.packagePrice,
            addonsTotal: pricing.addonsTotal,
            travelFee: pricing.travelFee,
            subtotal: pricing.subtotal,
            total: pricing.total,
          },
        })

        navigator.sendBeacon('/api/booking/session', data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Mark session as converted
  const markConverted = useCallback(async () => {
    const { formData } = useBookingStore.getState()

    if (!formData.sessionId) return

    try {
      await fetch('/api/booking/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: formData.sessionId,
          action: 'convert',
        }),
      })
    } catch (error) {
      console.error('Failed to mark session as converted:', error)
    }
  }, [])

  // Recover session from server
  const recoverSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/booking/session?sessionId=${sessionId}`)

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      if (data.found && data.session) {
        // Restore the session to the store
        useBookingStore.setState({
          currentStep: data.session.currentStep,
          formData: {
            ...useBookingStore.getState().formData,
            ...data.session.formData,
            sessionId,
          },
        })

        // Recalculate pricing
        useBookingStore.getState().recalculatePricing()

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to recover session:', error)
      return false
    }
  }, [])

  return {
    syncToServer,
    markConverted,
    recoverSession,
  }
}

/**
 * Hook for exit intent detection
 */
export function useExitIntent(onExitIntent: () => void) {
  const triggeredRef = useRef(false)

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the page
      if (e.clientY <= 0 && !triggeredRef.current) {
        const { currentStep } = useBookingStore.getState()

        // Only show exit intent if they're past the first step
        if (currentStep >= 1) {
          triggeredRef.current = true
          onExitIntent()
        }
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [onExitIntent])

  // Reset trigger (e.g., after closing modal)
  const reset = useCallback(() => {
    triggeredRef.current = false
  }, [])

  return { reset }
}
