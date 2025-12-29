'use client'

import { usePageTracking } from '@/hooks/useAnalytics'

interface PropertyPageTrackerProps {
  listingId: string
  agentId?: string | null
}

/**
 * Client component for tracking property page analytics.
 * Renders nothing but tracks page views, scroll depth, and session data.
 */
export function PropertyPageTracker({ listingId, agentId }: PropertyPageTrackerProps) {
  usePageTracking({
    pageType: 'property',
    listingId,
    agentId: agentId ?? undefined,
  })

  return null
}
