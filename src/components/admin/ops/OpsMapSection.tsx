'use client'

import { useState, useEffect } from 'react'
import { CalendarMapView, type MapJob } from './CalendarMapView'
import { Button } from '@/components/ui/button'
import { MapPin, List } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ListingData {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  lat?: number | null
  lng?: number | null
  scheduled_at?: string | null
  ops_status: string | null
  agent?: { name: string } | null
  services?: string[]
}

interface OpsMapSectionProps {
  listings: ListingData[]
}

export function OpsMapSection({ listings }: OpsMapSectionProps) {
  const router = useRouter()
  const [showMap, setShowMap] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Transform listings to map jobs
  const mapJobs: MapJob[] = listings
    .filter((l) => l.lat && l.lng && l.scheduled_at)
    .map((l) => ({
      id: l.id,
      listing_id: l.id,
      address: l.address || '',
      city: l.city || '',
      state: l.state || '',
      zip: l.zip || '',
      lat: l.lat as number,
      lng: l.lng as number,
      scheduled_date: l.scheduled_at as string,
      status: (l.ops_status === 'delivered'
        ? 'completed'
        : l.ops_status === 'in_progress'
          ? 'in_progress'
          : l.ops_status === 'cancelled'
            ? 'cancelled'
            : 'scheduled') as MapJob['status'],
      agent_name: l.agent?.name,
      services: l.services || [],
    }))

  const handleJobClick = (job: MapJob) => {
    router.push(`/admin/ops/jobs/${job.id}`)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    router.refresh()
    setTimeout(() => setIsLoading(false), 1000)
  }

  if (!showMap) {
    return (
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(true)}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          Show Map View
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(false)}
          className="gap-2"
        >
          <List className="h-4 w-4" />
          Hide Map
        </Button>
      </div>
      <CalendarMapView
        jobs={mapJobs}
        onJobClick={handleJobClick}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
      {mapJobs.length === 0 && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          No jobs with location data available. Jobs require lat/lng coordinates
          to appear on the map.
        </p>
      )}
    </div>
  )
}
