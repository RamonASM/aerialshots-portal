'use client'

import { useState, useEffect } from 'react'
import {
  usePhotographerLocation,
  formatLocationStatus,
  getLocationStatusColor,
  formatETA,
} from '@/hooks/usePhotographerLocation'
import {
  MapPin,
  Navigation,
  Clock,
  RefreshCw,
  Loader2,
  Camera,
  CheckCircle2,
  Car,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PhotographerTrackerProps {
  listingId: string
  propertyAddress?: string
  scheduledTime?: string
  className?: string
}

export function PhotographerTracker({
  listingId,
  propertyAddress,
  scheduledTime,
  className,
}: PhotographerTrackerProps) {
  const {
    location,
    isLoading,
    error,
    isConnected,
    lastUpdated,
    refresh,
  } = usePhotographerLocation({ listingId })

  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('')

  // Update "time since last update" every 30 seconds
  useEffect(() => {
    if (!lastUpdated) return

    const updateTimeSince = () => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)

      if (diff < 60) {
        setTimeSinceUpdate('Just now')
      } else if (diff < 3600) {
        const mins = Math.floor(diff / 60)
        setTimeSinceUpdate(`${mins} min${mins > 1 ? 's' : ''} ago`)
      } else {
        setTimeSinceUpdate('Over an hour ago')
      }
    }

    updateTimeSince()
    const interval = setInterval(updateTimeSince, 30000)

    return () => clearInterval(interval)
  }, [lastUpdated])

  // Status icon based on photographer status
  const getStatusIcon = () => {
    if (!location) return <Camera className="h-5 w-5" />

    switch (location.status) {
      case 'en_route':
        return <Car className="h-5 w-5" />
      case 'arriving':
        return <Navigation className="h-5 w-5" />
      case 'on_site':
      case 'shooting':
        return <Camera className="h-5 w-5" />
      case 'departing':
        return <CheckCircle2 className="h-5 w-5" />
      default:
        return <Camera className="h-5 w-5" />
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('bg-card', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('bg-card', className)}>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
            <Button variant="ghost" size="sm" onClick={refresh} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('bg-card overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Photographer Tracker
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={refresh} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!location ? (
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Camera className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Photographer tracking will begin when they start heading to your property.
            </p>
            {scheduledTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Scheduled: {scheduledTime}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Status Banner */}
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-lg',
              location.status === 'shooting' ? 'bg-purple-500/10' :
              location.status === 'on_site' ? 'bg-green-500/10' :
              location.status === 'arriving' ? 'bg-yellow-500/10' :
              'bg-blue-500/10'
            )}>
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                location.status === 'shooting' ? 'bg-purple-500' :
                location.status === 'on_site' ? 'bg-green-500' :
                location.status === 'arriving' ? 'bg-yellow-500' :
                'bg-blue-500'
              )}>
                {getStatusIcon()}
              </div>
              <div className="flex-1">
                <p className={cn('font-medium', getLocationStatusColor(location.status))}>
                  {formatLocationStatus(location.status)}
                </p>
                {location.staff?.name && (
                  <p className="text-sm text-muted-foreground">
                    {location.staff.name}
                  </p>
                )}
              </div>
            </div>

            {/* ETA (if en route) */}
            {(location.status === 'en_route' || location.status === 'arriving') && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                  <p className="font-semibold text-lg">{formatETA(location.eta_minutes)}</p>
                </div>
              </div>
            )}

            {/* Map Placeholder - In production, integrate with Google Maps or Mapbox */}
            <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <MapPin className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Live Map View</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>

              {/* Accuracy indicator */}
              {location.accuracy && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-xs">
                  Accuracy: ±{Math.round(location.accuracy)}m
                </div>
              )}

              {/* Speed indicator (if moving) */}
              {location.speed && location.speed > 0 && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 rounded text-xs">
                  {Math.round(location.speed * 2.237)} mph
                </div>
              )}
            </div>

            {/* Property Address */}
            {propertyAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">{propertyAddress}</p>
              </div>
            )}

            {/* Last Updated */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Last updated: {timeSinceUpdate}</span>
              {location.heading !== null && (
                <span className="flex items-center gap-1">
                  <Navigation
                    className="h-3 w-3"
                    style={{ transform: `rotate(${location.heading}deg)` }}
                  />
                  {getCompassDirection(location.heading)}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Helper to convert heading to compass direction
function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return directions[index]
}

export default PhotographerTracker
