'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MapPin, CheckCircle, Loader2, Camera } from 'lucide-react'

interface PhotographerCheckInProps {
  assignmentId: string
  listingId: string
  type: 'checkin' | 'checkout'
  compact?: boolean
}

export function PhotographerCheckIn({
  assignmentId,
  listingId,
  type,
  compact = false,
}: PhotographerCheckInProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'))
          return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords

      // Send to API
      const response = await fetch('/api/team/photographer/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          listingId,
          type,
          lat: latitude,
          lng: longitude,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check in')
      }

      router.refresh()
    } catch (err) {
      console.error('Check-in error:', err)
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Please enable location services.')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Please try again.')
            break
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.')
            break
        }
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleAction()
        }}
        disabled={isLoading}
        className="flex-1"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : type === 'checkin' ? (
          <>
            <Camera className="h-4 w-4 mr-2" />
            Check In
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </>
        )}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAction}
        disabled={isLoading}
        className={`w-full ${
          type === 'checkout'
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            {type === 'checkin' ? 'Checking in...' : 'Completing...'}
          </>
        ) : type === 'checkin' ? (
          <>
            <MapPin className="h-5 w-5 mr-2" />
            Check In & Start
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete & Check Out
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
