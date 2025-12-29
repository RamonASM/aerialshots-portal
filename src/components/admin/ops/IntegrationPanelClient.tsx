'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { IntegrationStatusPanel } from './IntegrationStatusPanel'
import type { IntegrationStatus, Zillow3DStatus } from '@/lib/supabase/types'

interface IntegrationData {
  fotello: {
    status: IntegrationStatus
    external_id: string | null
  }
  cubicasa: {
    status: IntegrationStatus
    external_id: string | null
  }
  zillow_3d: {
    status: Zillow3DStatus
    external_id: string | null
  }
}

interface IntegrationPanelClientProps {
  listingId: string
  integrations: IntegrationData
  errorMessage?: string | null
  lastCheck?: string | null
}

export function IntegrationPanelClient({
  listingId,
  integrations: initialIntegrations,
  errorMessage: initialErrorMessage,
  lastCheck,
}: IntegrationPanelClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage)

  const handleStatusUpdate = async (integration: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${listingId}/integration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      // Update local state
      setIntegrations((prev) => ({
        ...prev,
        [integration]: {
          ...prev[integration as keyof typeof prev],
          status: newStatus,
        },
      }))

      // Clear error if we successfully set a non-error status
      if (newStatus === 'delivered' || newStatus === 'live') {
        setErrorMessage(null)
      }

      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error updating integration status:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update status'
      )
    }
  }

  const handleOrderIntegration = async (integration: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${listingId}/integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle expected "not available" responses
        if (data.action === 'manual') {
          setErrorMessage(data.error || data.message)
          return
        }
        throw new Error(data.error || 'Failed to order integration')
      }

      // Update local state to 'ordered'
      setIntegrations((prev) => ({
        ...prev,
        [integration]: {
          ...prev[integration as keyof typeof prev],
          status: 'ordered',
        },
      }))

      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error ordering integration:', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to order integration'
      )
    }
  }

  return (
    <IntegrationStatusPanel
      listingId={listingId}
      integrations={integrations}
      errorMessage={errorMessage}
      lastCheck={lastCheck}
      onStatusUpdate={handleStatusUpdate}
      onOrderIntegration={handleOrderIntegration}
      isUpdating={isPending}
    />
  )
}
