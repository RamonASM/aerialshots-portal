'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Maximize2, Minimize2 } from 'lucide-react'

interface RouteJob {
  id: string
  address: string
  lat: number
  lng: number
  status: string
  scheduledTime: string | null
}

interface DailyRouteMapProps {
  jobs: RouteJob[]
  className?: string
}

// Status colors for markers
const STATUS_COLORS: Record<string, string> = {
  assigned: '#6b7280', // gray
  en_route: '#3b82f6', // blue
  in_progress: '#f59e0b', // amber
  completed: '#10b981', // green
  cancelled: '#ef4444', // red
}

export function DailyRouteMap({ jobs, className = '' }: DailyRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Filter out jobs without coordinates
  const validJobs = jobs.filter((job) => job.lat && job.lng)

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // Silently fail - user location is optional
        }
      )
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    if (!mapboxgl.accessToken) {
      console.warn('Mapbox token not configured')
      return
    }

    // Calculate center from jobs or use default
    let center: [number, number] = [-81.3792, 28.5383] // Orlando default
    if (validJobs.length > 0) {
      const avgLat = validJobs.reduce((sum, j) => sum + j.lat, 0) / validJobs.length
      const avgLng = validJobs.reduce((sum, j) => sum + j.lng, 0) / validJobs.length
      center = [avgLng, avgLat]
    } else if (userLocation) {
      center = [userLocation.lng, userLocation.lat]
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 10,
    })

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'top-right'
    )

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    )

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update markers when jobs change
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add markers for each job
    validJobs.forEach((job, index) => {
      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'daily-route-marker'
      el.style.cssText = `
        width: 36px;
        height: 36px;
        background-color: ${STATUS_COLORS[job.status] || STATUS_COLORS.assigned};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        font-weight: bold;
        color: white;
        font-size: 14px;
      `
      el.innerHTML = `${index + 1}`

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${job.address}</div>
          ${job.scheduledTime ? `
            <div style="color: #666; font-size: 12px;">
              ${format(new Date(job.scheduledTime), 'h:mm a')}
            </div>
          ` : ''}
          <div style="margin-top: 8px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              background: ${job.status === 'completed' ? '#dcfce7' : job.status === 'in_progress' ? '#fef3c7' : '#f3f4f6'};
              color: ${job.status === 'completed' ? '#166534' : job.status === 'in_progress' ? '#92400e' : '#374151'};
            ">
              ${job.status === 'completed' ? 'Completed' : job.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        </div>
      `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([job.lng, job.lat])
        .setPopup(popup)
        .addTo(map.current!)

      markersRef.current.push(marker)
    })

    // Fit bounds to show all markers
    if (validJobs.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      validJobs.forEach((job) => bounds.extend([job.lng, job.lat]))
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat])
      }
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 })
    }

    // Draw route line if multiple jobs
    if (validJobs.length > 1 && map.current.getSource('route')) {
      map.current.removeLayer('route')
      map.current.removeSource('route')
    }

    if (validJobs.length > 1) {
      const coordinates = validJobs.map((job) => [job.lng, job.lat])

      map.current.on('load', () => {
        if (!map.current) return

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        })

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.6,
            'line-dasharray': [2, 2],
          },
        })
      })
    }
  }, [validJobs, userLocation])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setTimeout(() => {
      map.current?.resize()
    }, 100)
  }

  // Open navigation to next pending job
  const navigateToNext = () => {
    const nextJob = validJobs.find(
      (job) => job.status === 'assigned' || job.status === 'en_route'
    )
    if (nextJob) {
      window.open(
        `https://maps.google.com/?daddr=${nextJob.lat},${nextJob.lng}`,
        '_blank'
      )
    }
  }

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className={`bg-neutral-100 rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
        <p className="text-neutral-600">Map view unavailable</p>
        <p className="text-sm text-neutral-500 mt-1">
          Mapbox token not configured
        </p>
      </div>
    )
  }

  if (validJobs.length === 0) {
    return (
      <div className={`bg-neutral-100 rounded-lg p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 mx-auto text-neutral-400 mb-2" />
        <p className="text-neutral-600">No locations to display</p>
      </div>
    )
  }

  return (
    <div
      className={`relative ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''
      }`}
    >
      {/* Map Container */}
      <div
        ref={mapContainer}
        className={`w-full ${isFullscreen ? 'h-full' : 'h-64'} rounded-b-lg`}
      />

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={navigateToNext}
          className="flex-1 bg-white/90 backdrop-blur"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Navigate to Next
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleFullscreen}
          className="bg-white/90 backdrop-blur"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS.assigned }}
          />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS.in_progress }}
          />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS.completed }}
          />
          <span>Completed</span>
        </div>
      </div>
    </div>
  )
}
