'use client'

import { usePageTracking } from '@/hooks/useAnalytics'

interface DeliveryPageTrackerProps {
  listingId: string
  agentId?: string | null
}

/**
 * Client component for tracking delivery page analytics.
 * Tracks page views, scroll depth, and session data.
 */
export function DeliveryPageTracker({ listingId, agentId }: DeliveryPageTrackerProps) {
  usePageTracking({
    pageType: 'delivery',
    listingId,
    agentId: agentId ?? undefined,
  })

  return null
}
