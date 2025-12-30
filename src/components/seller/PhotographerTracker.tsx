'use client'

import { useState, useEffect } from 'react'
import {
  Navigation,
  MapPin,
  Clock,
  User,
  Phone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatLocationStatus, formatETA } from '@/hooks/usePhotographerLocation'

interface PhotographerTrackerProps {
  listingId: string
  listingAddress: string
  photographer: {
    id: string
    name: string
    phone: string | null
  } | null
  location: {
    latitude: number
    longitude: number
    status: string
    eta_minutes: number | null
    last_updated_at: string
  } | null
  isConnected: boolean
}

export function PhotographerTracker({
  listingId,
  listingAddress,
  photographer,
  location,
  isConnected,
}: PhotographerTrackerProps) {
  const [mapError, setMapError] = useState(false)

  // Simple static map URL (using OpenStreetMap tiles via a free service)
  // In production, you'd use Google Maps, Mapbox, or similar
  const getMapUrl = () => {
    if (!location) return null

    // Use a static map service
    const lat = location.latitude
    const lng = location.longitude
    const zoom = 14

    // OpenStreetMap static image (via staticmap.io - free tier)
    return `https://maps.geoapify.com/v1/staticmap?style=dark-matter-brown&width=600&height=300&center=lonlat:${lng},${lat}&zoom=${zoom}&marker=lonlat:${lng},${lat};type:material;color:%230077ff;size:medium|lonlat:${lng},${lat}&apiKey=demo`
  }

  const lastUpdatedText = location?.last_updated_at
    ? `Updated ${getRelativeTime(new Date(location.last_updated_at))}`
    : null

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-neutral-200 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-400" />
            Live Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse" />
                Live
              </Badge>
            )}
            {lastUpdatedText && (
              <span className="text-xs text-neutral-500">{lastUpdatedText}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {/* Map */}
        <div className="aspect-[2/1] bg-neutral-800 relative">
          {location && !mapError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Placeholder for map - in production use Google Maps or Mapbox */}
              <div className="w-full h-full bg-neutral-800 flex flex-col items-center justify-center relative">
                {/* Simple visualization */}
                <div className="absolute inset-0 opacity-30">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, rgba(0, 119, 255, 0.3) 0%, transparent 50%)`,
                    }}
                  />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                    <Navigation className="h-6 w-6 text-white" />
                  </div>
                  <p className="mt-2 text-sm text-neutral-300">
                    {formatLocationStatus(location.status as never)}
                  </p>
                  {location.eta_minutes && (
                    <p className="text-xs text-neutral-400 mt-1">
                      ETA: {formatETA(location.eta_minutes)}
                    </p>
                  )}
                </div>
                {/* Destination marker */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-neutral-900/80 px-3 py-1.5 rounded-full">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-neutral-300">Your property</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Location not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Photographer Info */}
        {photographer && (
          <div className="px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{photographer.name}</p>
                <p className="text-xs text-neutral-400">Your Photographer</p>
              </div>
            </div>
            {photographer.phone && (
              <a
                href={`tel:${photographer.phone}`}
                className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/30 transition-colors"
              >
                <Phone className="h-5 w-5 text-blue-400" />
              </a>
            )}
          </div>
        )}

        {/* ETA Banner */}
        {location?.eta_minutes && location.eta_minutes > 0 && (
          <div className="mx-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-300">
                  Estimated arrival in {formatETA(location.eta_minutes)}
                </p>
                <p className="text-xs text-blue-400/70">
                  We&apos;ll notify you when they arrive
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper to format relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 10) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  return `${Math.floor(diffSecs / 3600)}h ago`
}
