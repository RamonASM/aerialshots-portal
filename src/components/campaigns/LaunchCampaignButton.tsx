'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout, FETCH_TIMEOUTS, isTimeoutError } from '@/lib/utils/fetch-with-timeout'

interface LaunchCampaignButtonProps {
  listingId: string
  agentId: string
  listingAddress: string
}

export function LaunchCampaignButton({
  listingId,
  agentId,
  listingAddress,
}: LaunchCampaignButtonProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLaunchCampaign = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetchWithTimeout('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          agentId,
        }),
        timeout: FETCH_TIMEOUTS.DEFAULT,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create campaign')
      }

      const { campaignId } = await response.json()
      router.push(`/campaigns/${campaignId}`)
    } catch (err) {
      console.error('Error creating campaign:', err)
      if (isTimeoutError(err)) {
        setError('Request timed out. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create campaign')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleLaunchCampaign}
        disabled={isCreating}
        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
      >
        {isCreating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Launch Campaign
          </>
        )}
      </Button>
      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  )
}
