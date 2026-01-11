'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Loader2,
  Sun,
  Palmtree,
  Stethoscope,
  GraduationCap,
  Wrench,
  Heart,
  HelpCircle,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type WeeklySchedule = {
  id: string
  staff_id: string
  day_of_week: number
  available_from: string
  available_to: string
  is_available: boolean
  max_jobs: number
}

type AvailabilityOverride = {
  id: string
  staff_id: string
  date: string
  available_from: string | null
  available_to: string | null
  is_available: boolean
  max_jobs_override: number | null
  notes: string | null
}

type TimeOffRequest = {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string
  reason_details: string | null
  status: string
  requested_at: string
  reviewed_at: string | null
  review_notes: string | null
  reviewer: { name: string } | null
}

type Assignment = {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  status: string
  listing: { address: string; city: string } | null
}

type Props = {
  staff: {
    id: string
    name: string | null
    email: string
    team_role: string | null
    max_daily_jobs: number | null
  }
  weeklySchedule: WeeklySchedule[]
  availabilityOverrides: AvailabilityOverride[]
  timeOffRequests: TimeOffRequest[]
  upcomingAssignments: Assignment[]
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const REASON_ICONS: Record<string, typeof Palmtree> = {
  vacation: Palmtree,
  sick: Stethoscope,
  personal: Heart,
  training: GraduationCap,
  equipment_maintenance: Wrench,
  family_emergency: Heart,
  other: HelpCircle,
}

const REASON_LABELS: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick Leave',
  personal: 'Personal',
  training: 'Training',
  equipment_maintenance: 'Equipment Maintenance',
  family_emergency: 'Family Emergency',
  other: 'Other',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-400' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400' },
  cancelled: { bg: 'bg-neutral-500/20', text: 'text-neutral-400' },
}

export function AvailabilityClient({
  staff,
  weeklySchedule,
  availabilityOverrides,
  timeOffRequests,
  upcomingAssignments,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Time off form state
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: '',
    end_date: '',
    reason: 'vacation',
    reason_details: '',
  })

  // Default values until migration is applied
  // TODO: Update to use staff.vacation_days_total etc. after migration
  const vacationRemaining = 15
  const sickRemaining = 5

  // Get schedule for a day of week
  const getScheduleForDay = (dayOfWeek: number) => {
    return weeklySchedule.find((s) => s.day_of_week === dayOfWeek)
  }

  // Get override for a specific date
  const getOverrideForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availabilityOverrides.find((o) => o.date === dateStr)
  }

  // Check if date has assignment
  const getAssignmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return upcomingAssignments.filter((a) => a.scheduled_date === dateStr)
  }

  // Check if date is in approved time off
  const isDateInTimeOff = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return timeOffRequests.some(
      (t) =>
        t.status === 'approved' &&
        dateStr >= t.start_date &&
        dateStr <= t.end_date
    )
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: Date[] = []

    // Add padding for days before first day of month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    // Add padding for days after last day of month
    const endPadding = 6 - lastDay.getDay()
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleSubmitTimeOff = async () => {
    if (!timeOffForm.start_date || !timeOffForm.end_date) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/team/photographer/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staff.id,
          ...timeOffForm,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit request')
      }

      // Refresh the page to show new request
      window.location.reload()
    } catch (error) {
      console.error('Failed to submit time off request:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Availability</h1>
          <p className="mt-1 text-neutral-400">Manage your schedule and request time off</p>
        </div>
        <Button onClick={() => setShowTimeOffModal(true)} className="bg-blue-500 hover:bg-blue-600">
          <Plus className="mr-2 h-4 w-4" />
          Request Time Off
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-green-400" />
            <p className="text-[13px] text-neutral-400">Vacation Days</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {vacationRemaining}
            <span className="text-sm text-neutral-500 ml-1">/ 15</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-400" />
            <p className="text-[13px] text-neutral-400">Sick Days</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {sickRemaining}
            <span className="text-sm text-neutral-500 ml-1">/ 5</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            <p className="text-[13px] text-neutral-400">Upcoming Jobs</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{upcomingAssignments.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <p className="text-[13px] text-neutral-400">Pending Requests</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {timeOffRequests.filter((t) => t.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-neutral-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {SHORT_DAYS.map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-neutral-500">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
              const isToday = date.toDateString() === today.toDateString()
              const isPast = date < today
              const override = getOverrideForDate(date)
              const assignments = getAssignmentsForDate(date)
              const isTimeOff = isDateInTimeOff(date)
              const schedule = getScheduleForDay(date.getDay())
              const isAvailable = override
                ? override.is_available
                : schedule
                ? schedule.is_available
                : date.getDay() >= 1 && date.getDay() <= 5

              return (
                <div
                  key={index}
                  className={`
                    relative p-2 min-h-[80px] rounded-lg border transition-colors
                    ${isCurrentMonth ? 'border-white/[0.05]' : 'border-transparent opacity-40'}
                    ${isToday ? 'border-blue-500/50 bg-blue-500/10' : 'bg-white/[0.02]'}
                    ${isPast ? 'opacity-50' : ''}
                    ${isTimeOff ? 'bg-red-500/10 border-red-500/30' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        isToday ? 'text-blue-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {!isPast && isCurrentMonth && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isTimeOff
                            ? 'bg-red-400'
                            : isAvailable
                            ? 'bg-green-400'
                            : 'bg-neutral-600'
                        }`}
                      />
                    )}
                  </div>

                  {/* Assignments */}
                  {assignments.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {assignments.slice(0, 2).map((assignment) => (
                        <div
                          key={assignment.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 truncate"
                        >
                          {assignment.scheduled_time?.slice(0, 5) || ''} {assignment.listing?.city}
                        </div>
                      ))}
                      {assignments.length > 2 && (
                        <div className="text-[10px] text-neutral-500">
                          +{assignments.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Time Off Indicator */}
                  {isTimeOff && !isPast && (
                    <div className="absolute bottom-1 left-1 right-1 text-[10px] text-red-400 text-center">
                      Time Off
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-600" />
              Unavailable
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Time Off
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-purple-500/20" />
              Scheduled Job
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-6">
          {/* Default Schedule */}
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
            <h3 className="text-sm font-medium text-white mb-4">Weekly Schedule</h3>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day, index) => {
                const schedule = getScheduleForDay(index)
                const isAvailable = schedule?.is_available ?? (index >= 1 && index <= 5)
                const startTime = schedule?.available_from || '08:00'
                const endTime = schedule?.available_to || '18:00'

                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isAvailable ? 'bg-green-500/10' : 'bg-neutral-500/10'
                    }`}
                  >
                    <span className="text-sm text-neutral-300">{day}</span>
                    {isAvailable ? (
                      <span className="text-xs text-green-400">
                        {startTime.slice(0, 5)} - {endTime.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">Off</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time Off Requests */}
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
            <h3 className="text-sm font-medium text-white mb-4">Recent Requests</h3>
            {timeOffRequests.length === 0 ? (
              <p className="text-sm text-neutral-500">No time off requests yet</p>
            ) : (
              <div className="space-y-3">
                {timeOffRequests.slice(0, 5).map((request) => {
                  const ReasonIcon = REASON_ICONS[request.reason] || HelpCircle
                  const statusColor = STATUS_COLORS[request.status] || STATUS_COLORS.pending

                  return (
                    <div key={request.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ReasonIcon className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm text-white">
                            {REASON_LABELS[request.reason]}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor.bg} ${statusColor.text}`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {new Date(request.start_date).toLocaleDateString()} -{' '}
                        {new Date(request.end_date).toLocaleDateString()}
                      </p>
                      {request.review_notes && (
                        <p className="mt-2 text-xs text-neutral-400 italic">
                          &ldquo;{request.review_notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Assignments</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-white">
                    {new Date(assignment.scheduled_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {assignment.scheduled_time && (
                    <span className="text-sm text-neutral-400">
                      @ {assignment.scheduled_time.slice(0, 5)}
                    </span>
                  )}
                </div>
                {assignment.listing && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {assignment.listing.address}, {assignment.listing.city}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Off Request Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1c1c1e] border border-white/[0.08] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Request Time Off</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={timeOffForm.start_date}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={timeOffForm.end_date}
                    onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                    min={timeOffForm.start_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Reason</label>
                <select
                  value={timeOffForm.reason}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm"
                >
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Additional Details (optional)</label>
                <textarea
                  value={timeOffForm.reason_details}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, reason_details: e.target.value })}
                  rows={3}
                  placeholder="Any additional information..."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-neutral-600 resize-none"
                />
              </div>

              {/* Days calculation */}
              {timeOffForm.start_date && timeOffForm.end_date && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300">
                    <strong>
                      {Math.ceil(
                        (new Date(timeOffForm.end_date).getTime() -
                          new Date(timeOffForm.start_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1}
                    </strong>{' '}
                    day(s) requested
                    {timeOffForm.reason === 'vacation' && (
                      <span className="ml-2 text-neutral-400">
                        ({vacationRemaining} vacation days remaining)
                      </span>
                    )}
                    {timeOffForm.reason === 'sick' && (
                      <span className="ml-2 text-neutral-400">
                        ({sickRemaining} sick days remaining)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowTimeOffModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={handleSubmitTimeOff}
                disabled={!timeOffForm.start_date || !timeOffForm.end_date || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
