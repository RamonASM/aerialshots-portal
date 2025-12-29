'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  MapPin,
  Clock,
  Camera,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StaffMember {
  id: string
  name: string
  role: string
  team_role: string | null
  max_daily_jobs: number
  is_active: boolean
}

interface Assignment {
  id: string
  listing_id: string
  photographer_id: string
  scheduled_date: string
  scheduled_time: string | null
  status: string
  listing?: {
    address: string
    city: string
  }
}

interface DayData {
  date: string
  assignments: Assignment[]
  staffAssignments: Record<string, Assignment[]>
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default function TeamAvailabilityPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Get start and end dates based on view
      const startDate = new Date(currentDate)
      const endDate = new Date(currentDate)

      if (viewMode === 'week') {
        // Start of week (Sunday)
        startDate.setDate(startDate.getDate() - startDate.getDay())
        endDate.setDate(startDate.getDate() + 6)
      } else {
        // Start of month
        startDate.setDate(1)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
      }

      const [staffResponse, assignmentsResponse] = await Promise.all([
        fetch('/api/admin/team/staff'),
        fetch(
          `/api/admin/team/assignments?from=${formatDate(startDate)}&to=${formatDate(endDate)}`
        ),
      ])

      if (staffResponse.ok) {
        const data = await staffResponse.json()
        // Filter to photographers/videographers only
        setStaff(
          (data.staff || []).filter(
            (s: StaffMember) =>
              s.is_active &&
              ['photographer', 'videographer'].includes(s.team_role || '')
          )
        )
      }

      if (assignmentsResponse.ok) {
        const data = await assignmentsResponse.json()
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentDate, viewMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get dates for the current view
  const getDates = (): Date[] => {
    if (viewMode === 'week') {
      const dates: Date[] = []
      const startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - startDate.getDay())
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        dates.push(date)
      }
      return dates
    } else {
      return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())
    }
  }

  // Group assignments by date and staff
  const getAssignmentsForDate = (date: string): Record<string, Assignment[]> => {
    const grouped: Record<string, Assignment[]> = {}
    for (const assignment of assignments) {
      if (assignment.scheduled_date === date) {
        if (!grouped[assignment.photographer_id]) {
          grouped[assignment.photographer_id] = []
        }
        grouped[assignment.photographer_id].push(assignment)
      }
    }
    return grouped
  }

  const getAvailabilityColor = (
    staffMember: StaffMember,
    assignmentCount: number
  ): string => {
    const capacity = staffMember.max_daily_jobs || 6
    const ratio = assignmentCount / capacity

    if (ratio === 0) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    if (ratio < 0.5) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
    if (ratio < 1) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  const dates = getDates()
  const today = formatDate(new Date())

  // Format header
  const getHeaderText = () => {
    if (viewMode === 'week') {
      const start = dates[0]
      const end = dates[6]
      const startMonth = start.toLocaleString('default', { month: 'short' })
      const endMonth = end.toLocaleString('default', { month: 'short' })
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
    }
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Team Availability
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            View photographer schedules and capacity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'week'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'month'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={navigatePrevious}
          className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          {getHeaderText()}
        </h2>
        <button
          onClick={navigateNext}
          className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-neutral-600 dark:text-neutral-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-neutral-600 dark:text-neutral-400">Light Load</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-neutral-600 dark:text-neutral-400">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-neutral-600 dark:text-neutral-400">At Capacity</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <Users className="mx-auto h-12 w-12 text-neutral-400" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900 dark:text-white">
            No photographers found
          </h3>
          <p className="mt-2 text-neutral-500">
            Add team members with photographer or videographer role to see availability.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[800px]">
            {/* Date Headers */}
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900">
                <th className="sticky left-0 z-10 border-r border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                  Team Member
                </th>
                {dates.map((date) => {
                  const dateStr = formatDate(date)
                  const isToday = dateStr === today
                  return (
                    <th
                      key={dateStr}
                      className={`border-b border-neutral-200 px-2 py-3 text-center dark:border-neutral-800 ${
                        isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {DAYS_OF_WEEK[date.getDay()]}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          isToday
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {staff.map((staffMember) => (
                <tr key={staffMember.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="sticky left-0 z-10 border-r border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        {staffMember.team_role === 'videographer' ? (
                          <Video className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        ) : (
                          <Camera className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">
                          {staffMember.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Max {staffMember.max_daily_jobs} jobs/day
                        </div>
                      </div>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const dateStr = formatDate(date)
                    const isToday = dateStr === today
                    const dateAssignments = getAssignmentsForDate(dateStr)
                    const staffAssignments = dateAssignments[staffMember.id] || []
                    const count = staffAssignments.length

                    return (
                      <td
                        key={dateStr}
                        className={`px-2 py-2 text-center ${
                          isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div
                          className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${getAvailabilityColor(
                            staffMember,
                            count
                          )}`}
                          title={`${count} / ${staffMember.max_daily_jobs} jobs`}
                        >
                          {count > 0 ? count : '-'}
                        </div>
                        {staffAssignments.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {staffAssignments.slice(0, 2).map((a) => (
                              <div
                                key={a.id}
                                className="truncate text-xs text-neutral-500 dark:text-neutral-400"
                                title={a.listing?.address}
                              >
                                {a.scheduled_time || '—'}
                              </div>
                            ))}
                            {staffAssignments.length > 2 && (
                              <div className="text-xs text-neutral-400">
                                +{staffAssignments.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && staff.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {staff.length}
                </div>
                <div className="text-sm text-neutral-500">Active Team</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {assignments.length}
                </div>
                <div className="text-sm text-neutral-500">Scheduled Jobs</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {staff.reduce((sum, s) => sum + (s.max_daily_jobs || 6), 0)}
                </div>
                <div className="text-sm text-neutral-500">Daily Capacity</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {Math.round(
                    (assignments.length /
                      (staff.reduce((sum, s) => sum + (s.max_daily_jobs || 6), 0) *
                        dates.length)) *
                      100
                  ) || 0}%
                </div>
                <div className="text-sm text-neutral-500">Utilization</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
