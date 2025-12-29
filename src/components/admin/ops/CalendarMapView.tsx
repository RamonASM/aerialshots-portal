'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Camera,
  Maximize2,
  Minimize2,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'

// Job data structure for map display
export interface MapJob {
  id: string
  listing_id: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  scheduled_date: string
  scheduled_time?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  photographer_name?: string
  photographer_id?: string
  services: string[]
  agent_name?: string
  sqft?: number
}

interface CalendarMapViewProps {
  jobs: MapJob[]
  selectedDate?: Date
  onJobClick?: (job: MapJob) => void
  onRefresh?: () => void
  isLoading?: boolean
  className?: string
}

// Status colors for markers
const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6', // blue
  in_progress: '#f59e0b', // amber
  completed: '#10b981', // green
  cancelled: '#ef4444', // red
}

// Default center (Orlando, FL area)
const DEFAULT_CENTER: [number, number] = [-81.3792, 28.5383]
const DEFAULT_ZOOM = 9

export function CalendarMapView({
  jobs,
  selectedDate,
  onJobClick,
  onRefresh,
  isLoading = false,
  className = '',
}: CalendarMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<MapJob | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets')

  // Filter jobs based on status
  const filteredJobs = jobs.filter((job) => {
    if (filterStatus === 'all') return true
    return job.status === filterStatus
  })

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Use public token or environment variable
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    if (!mapboxgl.accessToken) {
      console.warn('Mapbox token not configured')
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:
        mapStyle === 'streets'
          ? 'mapbox://styles/mapbox/light-v11'
          : 'mapbox://styles/mapbox/satellite-streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (!map.current) return
    map.current.setStyle(
      mapStyle === 'streets'
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/satellite-streets-v12'
    )
  }, [mapStyle])

  // Create marker element
  const createMarkerElement = useCallback((job: MapJob) => {
    const el = document.createElement('div')
    el.className = 'map-marker'
    el.style.cssText = `
      width: 32px;
      height: 32px;
      background-color: ${STATUS_COLORS[job.status]};
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    `
    el.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    `
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)'
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
    })
    return el
  }, [])

  // Update markers when jobs change
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove())
    markers.current = []

    // Add new markers
    filteredJobs.forEach((job) => {
      if (!job.lat || !job.lng) return

      const el = createMarkerElement(job)

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${job.address}</div>
          <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
            ${job.city}, ${job.state} ${job.zip}
          </div>
          <div style="display: flex; gap: 8px; font-size: 12px; color: #666;">
            <span>${format(new Date(job.scheduled_date), 'MMM d, yyyy')}</span>
            ${job.scheduled_time ? `<span>${job.scheduled_time}</span>` : ''}
          </div>
          ${job.photographer_name ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">📷 ${job.photographer_name}</div>` : ''}
          <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px;">
            ${job.services
              .slice(0, 3)
              .map(
                (s) =>
                  `<span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${s}</span>`
              )
              .join('')}
            ${job.services.length > 3 ? `<span style="font-size: 11px; color: #666;">+${job.services.length - 3} more</span>` : ''}
          </div>
        </div>
      `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([job.lng, job.lat])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener('click', () => {
        setSelectedJob(job)
        onJobClick?.(job)
      })

      markers.current.push(marker)
    })

    // Fit bounds to show all markers
    if (filteredJobs.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      filteredJobs.forEach((job) => {
        if (job.lat && job.lng) {
          bounds.extend([job.lng, job.lat])
        }
      })
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 })
    }
  }, [filteredJobs, createMarkerElement, onJobClick])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setTimeout(() => {
      map.current?.resize()
    }, 100)
  }

  // Get job counts by status
  const statusCounts = {
    all: jobs.length,
    scheduled: jobs.filter((j) => j.status === 'scheduled').length,
    in_progress: jobs.filter((j) => j.status === 'in_progress').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    cancelled: jobs.filter((j) => j.status === 'cancelled').length,
  }

  return (
    <Card
      className={`${className} ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">
              Geographic View
              {selectedDate && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All ({statusCounts.all})
                </SelectItem>
                <SelectItem value="scheduled">
                  Scheduled ({statusCounts.scheduled})
                </SelectItem>
                <SelectItem value="in_progress">
                  In Progress ({statusCounts.in_progress})
                </SelectItem>
                <SelectItem value="completed">
                  Completed ({statusCounts.completed})
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Map style toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMapStyle(mapStyle === 'streets' ? 'satellite' : 'streets')
              }
            >
              <Layers className="h-4 w-4" />
            </Button>

            {/* Refresh */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            )}

            {/* Fullscreen toggle */}
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-4 mt-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {/* Map container */}
          <div
            ref={mapContainer}
            className={`w-full ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[400px]'} rounded-b-lg`}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No token warning */}
          {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-b-lg">
              <div className="text-center p-4">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Mapbox token not configured
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add NEXT_PUBLIC_MAPBOX_TOKEN to enable map view
                </p>
              </div>
            </div>
          )}

          {/* Selected job sidebar */}
          {selectedJob && (
            <div className="absolute top-2 left-2 w-64 bg-card border rounded-lg shadow-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge
                  variant={
                    selectedJob.status === 'completed'
                      ? 'default'
                      : selectedJob.status === 'in_progress'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {selectedJob.status.replace('_', ' ')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedJob(null)}
                >
                  ×
                </Button>
              </div>
              <h4 className="font-semibold text-sm mb-1">
                {selectedJob.address}
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                {selectedJob.city}, {selectedJob.state} {selectedJob.zip}
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedJob.scheduled_date), 'MMM d, yyyy')}
                  </span>
                </div>
                {selectedJob.scheduled_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedJob.scheduled_time}</span>
                  </div>
                )}
                {selectedJob.photographer_name && (
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedJob.photographer_name}</span>
                  </div>
                )}
                {selectedJob.agent_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedJob.agent_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {selectedJob.services.map((service, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>

              {onJobClick && (
                <Button
                  className="w-full mt-3"
                  size="sm"
                  onClick={() => onJobClick(selectedJob)}
                >
                  View Details
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
