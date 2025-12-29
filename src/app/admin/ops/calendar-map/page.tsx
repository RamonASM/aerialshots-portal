'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  List,
  Map,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Assignment {
  id: string
  listing_id: string
  photographer_id: string
  scheduled_date: string
  scheduled_time: string | null
  status: string
  photographer: {
    id: string
    name: string
  } | null
  listing: {
    id: string
    address: string
    city: string
    state: string
    zip: string
    lat: number | null
    lng: number | null
  } | null
}

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

export default function CalendarMapPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  const formatDate = (date: Date) => date.toISOString().slice(0, 10)

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = formatDate(selectedDate)
      const response = await fetch(`/api/admin/team/assignments?date=${dateStr}`)

      if (response.ok) {
        const data = await response.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  // Calculate map center based on assignments
  const getMapCenter = (): { lat: number; lng: number } => {
    const validAssignments = assignments.filter(
      (a) => a.listing?.lat && a.listing?.lng
    )

    if (validAssignments.length === 0) {
      // Default to Central Florida
      return { lat: 28.5383, lng: -81.3792 }
    }

    const sumLat = validAssignments.reduce((sum, a) => sum + (a.listing?.lat || 0), 0)
    const sumLng = validAssignments.reduce((sum, a) => sum + (a.listing?.lng || 0), 0)

    return {
      lat: sumLat / validAssignments.length,
      lng: sumLng / validAssignments.length,
    }
  }

  // Group assignments by photographer
  const assignmentsByPhotographer = assignments.reduce((acc, assignment) => {
    const photographerId = assignment.photographer_id
    if (!acc[photographerId]) {
      acc[photographerId] = {
        photographer: assignment.photographer,
        assignments: [],
      }
    }
    acc[photographerId].assignments.push(assignment)
    return acc
  }, {} as Record<string, { photographer: Assignment['photographer']; assignments: Assignment[] }>)

  const mapCenter = getMapCenter()

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <Link href="/admin/ops">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Schedule Map View
            </h1>
            <p className="text-sm text-neutral-500">
              {assignments.length} assignments for {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate(-1)}
              className="rounded-r-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={formatDate(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border-0 bg-transparent px-2 py-1 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate(1)}
              className="rounded-l-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="rounded-r-none"
            >
              <Map className="mr-1 h-4 w-4" />
              Map
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="mr-1 h-4 w-4" />
              List
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchAssignments} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : viewMode === 'map' ? (
          <>
            {/* Map View */}
            <div className="relative flex-1 bg-neutral-100 dark:bg-neutral-800">
              {/* Placeholder for actual map - in production, integrate with Google Maps or Mapbox */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                <MapPin className="mb-4 h-16 w-16 text-neutral-300" />
                <p className="text-lg font-medium">Map View</p>
                <p className="mt-2 text-sm">
                  Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </p>
                <p className="mt-1 text-sm">
                  {assignments.filter((a) => a.listing?.lat).length} locations with coordinates
                </p>
                <p className="mt-4 max-w-md text-center text-xs text-neutral-400">
                  To enable the interactive map, add Google Maps or Mapbox integration.
                  Set NEXT_PUBLIC_GOOGLE_MAPS_KEY or NEXT_PUBLIC_MAPBOX_TOKEN.
                </p>
              </div>

              {/* Assignment Markers (visual representation) */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => setSelectedAssignment(assignment)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white shadow-lg transition-transform hover:scale-105 ${
                      STATUS_COLORS[assignment.status] || 'bg-neutral-500'
                    }`}
                  >
                    <MapPin className="h-3 w-3" />
                    {assignment.listing?.city || 'Unknown'}
                    {assignment.scheduled_time && (
                      <span className="opacity-80">
                        @ {assignment.scheduled_time.slice(0, 5)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 overflow-auto border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4">
                <h2 className="mb-4 font-semibold text-neutral-900 dark:text-white">
                  By Photographer
                </h2>
                <div className="space-y-4">
                  {Object.entries(assignmentsByPhotographer).map(([id, group]) => (
                    <div
                      key={id}
                      className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {group.photographer?.name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.assignments.map((assignment) => (
                          <button
                            key={assignment.id}
                            onClick={() => setSelectedAssignment(assignment)}
                            className={`w-full rounded-md p-2 text-left transition-colors ${
                              selectedAssignment?.id === assignment.id
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  STATUS_COLORS[assignment.status] || 'bg-neutral-500'
                                }`}
                              />
                              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                {assignment.listing?.address || 'Unknown'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                              <Clock className="h-3 w-3" />
                              {assignment.scheduled_time || 'No time set'}
                              <span className="ml-auto capitalize">{assignment.status}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {Object.keys(assignmentsByPhotographer).length === 0 && (
                    <div className="text-center text-neutral-500">
                      No assignments for this date
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* List View */
          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              {assignments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
                  <Calendar className="mx-auto h-12 w-12 text-neutral-400" />
                  <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">
                    No assignments
                  </h3>
                  <p className="mt-2 text-neutral-500">
                    No shoots scheduled for this date.
                  </p>
                </div>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              STATUS_COLORS[assignment.status] || 'bg-neutral-500'
                            }`}
                          />
                          <h3 className="font-semibold text-neutral-900 dark:text-white">
                            {assignment.listing?.address || 'Unknown Address'}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">
                          {assignment.listing?.city}, {assignment.listing?.state}{' '}
                          {assignment.listing?.zip}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Clock className="h-4 w-4" />
                          {assignment.scheduled_time || 'No time set'}
                        </div>
                        <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {assignment.photographer?.name || 'Unassigned'}
                        </span>
                      </div>
                      {assignment.listing?.lat && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span className="text-xs text-neutral-500">
                            {assignment.listing.lat.toFixed(4)}, {assignment.listing.lng?.toFixed(4)}
                          </span>
                        </div>
                      )}
                      <Link
                        href={`/admin/ops/jobs/${assignment.listing_id}`}
                        className="ml-auto text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Assignment Detail Modal */}
      {selectedAssignment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {selectedAssignment.listing?.address}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {selectedAssignment.listing?.city}, {selectedAssignment.listing?.state}{' '}
              {selectedAssignment.listing?.zip}
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Time</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {selectedAssignment.scheduled_time || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Photographer</span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {selectedAssignment.photographer?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Status</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs text-white ${
                    STATUS_COLORS[selectedAssignment.status] || 'bg-neutral-500'
                  }`}
                >
                  {selectedAssignment.status}
                </span>
              </div>
              {selectedAssignment.listing?.lat && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Coordinates</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedAssignment.listing.lat.toFixed(6)},{' '}
                    {selectedAssignment.listing.lng?.toFixed(6)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedAssignment(null)}
              >
                Close
              </Button>
              <Link href={`/admin/ops/jobs/${selectedAssignment.listing_id}`} className="flex-1">
                <Button className="w-full">View Job Details</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
