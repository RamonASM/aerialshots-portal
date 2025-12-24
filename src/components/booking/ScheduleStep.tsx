'use client'

import { useState, useMemo } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_TIME_SLOTS } from '@/lib/booking/config'

interface ScheduleStepProps {
  selectedDate: string | null
  selectedTime: string | null
  onDateSelect: (date: string) => void
  onTimeSelect: (time: string) => void
}

export function ScheduleStep({
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}: ScheduleStepProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  const calendar = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: Array<{ date: Date; isCurrentMonth: boolean; isAvailable: boolean }> = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isAvailable: false,
      })
    }

    // Current month days
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const isPast = date < today
      const isTooFar = date > new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

      days.push({
        date,
        isCurrentMonth: true,
        isAvailable: !isPast && !isWeekend && !isTooFar,
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        isAvailable: false,
      })
    }

    return days
  }, [currentMonth])

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-2">
          Schedule Your Shoot
        </h3>
        <p className="text-neutral-400">
          Pick a date and time that works best for you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Calendar */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-400 mb-4">
            <Calendar className="w-4 h-4" />
            <span>Select Date</span>
          </div>

          <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-400" />
              </button>
              <span className="font-medium text-white">{monthLabel}</span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-neutral-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((day, i) => {
                const dateStr = formatDate(day.date)
                const isSelected = selectedDate === dateStr

                return (
                  <button
                    key={i}
                    onClick={() => day.isAvailable && onDateSelect(dateStr)}
                    disabled={!day.isAvailable}
                    className={cn(
                      'aspect-square rounded-lg text-sm font-medium transition-all',
                      !day.isCurrentMonth && 'text-neutral-700',
                      day.isCurrentMonth && !day.isAvailable && 'text-neutral-600 cursor-not-allowed',
                      day.isCurrentMonth && day.isAvailable && 'text-neutral-300 hover:bg-neutral-800',
                      isSelected && 'bg-blue-500 text-white hover:bg-blue-600'
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-400 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              {selectedDate
                ? `Available Times for ${formatDisplayDate(selectedDate)}`
                : 'Select a date first'}
            </span>
          </div>

          {selectedDate ? (
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_TIME_SLOTS.map((slot) => {
                const isSelected = selectedTime === slot.time

                return (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && onTimeSelect(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      'px-4 py-3 rounded-lg text-sm font-medium transition-all border-2',
                      !slot.available && 'opacity-50 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-600',
                      slot.available && !isSelected && 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500',
                      isSelected && 'bg-blue-500/20 border-blue-500 text-blue-400'
                    )}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500">
                Select a date on the calendar to see available times
              </p>
            </div>
          )}

          {selectedDate && selectedTime && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-400 font-medium">
                Scheduled for {formatDisplayDate(selectedDate)} at{' '}
                {DEFAULT_TIME_SLOTS.find((s) => s.time === selectedTime)?.label}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
