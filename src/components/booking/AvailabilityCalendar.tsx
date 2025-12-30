'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isWeekend,
  isBefore,
  startOfDay,
  addMonths,
  isToday,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DEFAULT_TIME_SLOTS, type TimeSlot } from '@/lib/booking/config'

// Weather data structure (matches weather client)
export interface DayWeather {
  conditions: string
  icon: string
  high: number
  low: number
  rainChance: number
  windSpeed: number
  isGoodForShoot: boolean
  alerts: Array<{
    type: 'rain' | 'wind' | 'storm' | 'heat'
    severity: 'warning' | 'caution' | 'info'
    message: string
  }>
}

interface AvailabilityCalendarProps {
  selectedDate?: string
  selectedTime?: string
  onSelect: (date: string, time: string) => void
  lat?: number
  lng?: number
  minDate?: Date
  maxDays?: number
  excludeWeekends?: boolean
  className?: string
}

// Weather icon component
function WeatherIcon({
  condition,
  className,
}: {
  condition: string
  className?: string
}) {
  const lowerCondition = condition.toLowerCase()

  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
    return <CloudLightning className={cn('text-amber-500', className)} />
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return <CloudRain className={cn('text-blue-400', className)} />
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return <Cloud className={cn('text-neutral-400', className)} />
  }
  return <Sun className={cn('text-amber-400', className)} />
}

// Day cell component
interface DayCellProps {
  date: Date
  weather?: DayWeather
  isSelected: boolean
  isDisabled: boolean
  isCurrentMonth: boolean
  onClick: () => void
}

function DayCell({
  date,
  weather,
  isSelected,
  isDisabled,
  isCurrentMonth,
  onClick,
}: DayCellProps) {
  const dayNum = format(date, 'd')
  const isCurrentDay = isToday(date)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'relative flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg transition-all min-h-[60px] sm:min-h-[72px]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isDisabled && 'opacity-30 cursor-not-allowed',
        !isDisabled && 'hover:bg-neutral-800/50 cursor-pointer',
        !isCurrentMonth && 'opacity-40',
        isSelected && 'bg-blue-600 hover:bg-blue-600 text-white',
        isCurrentDay && !isSelected && 'ring-2 ring-blue-500/50'
      )}
    >
      <span
        className={cn(
          'text-sm font-medium',
          isSelected ? 'text-white' : 'text-foreground'
        )}
      >
        {dayNum}
      </span>

      {weather && !isDisabled && (
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <WeatherIcon condition={weather.conditions} className="h-4 w-4" />
          <span
            className={cn(
              'text-[10px]',
              isSelected ? 'text-white/80' : 'text-muted-foreground'
            )}
          >
            {weather.rainChance}%
          </span>
          {!weather.isGoodForShoot && (
            <AlertTriangle className="h-3 w-3 text-amber-500" />
          )}
        </div>
      )}
    </button>
  )
}

// Time slot grid component
interface TimeSlotGridProps {
  slots: TimeSlot[]
  selectedTime?: string
  onSelect: (time: string) => void
  weather?: DayWeather
}

function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  weather,
}: TimeSlotGridProps) {
  // Determine best times based on weather
  const getBestTimeRange = (): string | null => {
    if (!weather) return null

    // In Florida summer, morning is usually best
    if (weather.high > 90) {
      return 'Morning slots recommended (cooler temps)'
    }

    // If rain is likely, suggest earlier times
    if (weather.rainChance > 40) {
      return 'Earlier times recommended (rain likely in afternoon)'
    }

    return null
  }

  const recommendation = getBestTimeRange()

  return (
    <div className="space-y-3">
      {recommendation && (
        <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>{recommendation}</span>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {slots.map((slot) => (
          <button
            key={slot.time}
            type="button"
            onClick={() => onSelect(slot.time)}
            disabled={!slot.available}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              !slot.available && 'opacity-30 cursor-not-allowed bg-neutral-800',
              slot.available &&
                selectedTime !== slot.time &&
                'bg-neutral-800/50 hover:bg-neutral-700 text-foreground',
              selectedTime === slot.time &&
                'bg-blue-600 text-white hover:bg-blue-600'
            )}
          >
            {slot.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AvailabilityCalendar({
  selectedDate,
  selectedTime,
  onSelect,
  lat,
  lng,
  minDate = new Date(),
  maxDays = 30,
  excludeWeekends = true,
  className,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(minDate))
  const [weatherData, setWeatherData] = useState<Record<string, DayWeather>>({})
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    selectedDate ? new Date(selectedDate) : null
  )

  // Calculate date range
  const maxDate = useMemo(() => addDays(minDate, maxDays), [minDate, maxDays])

  // Get all days for current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Get weekday headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Fetch weather data when lat/lng available
  useEffect(() => {
    if (!lat || !lng) return

    const fetchWeather = async () => {
      setIsLoadingWeather(true)
      try {
        const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`)
        if (response.ok) {
          const data = await response.json()

          // Transform to our format
          const weatherMap: Record<string, DayWeather> = {}
          for (const day of data.forecasts || []) {
            weatherMap[day.date] = {
              conditions: day.forecast.conditions,
              icon: day.forecast.icon,
              high: day.forecast.high_temp_f,
              low: day.forecast.low_temp_f,
              rainChance: day.forecast.precipitation_chance,
              windSpeed: day.forecast.wind_speed_mph,
              isGoodForShoot: day.is_good_for_shoot,
              alerts: day.alerts,
            }
          }
          setWeatherData(weatherMap)
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error)
      } finally {
        setIsLoadingWeather(false)
      }
    }

    fetchWeather()
  }, [lat, lng])

  // Check if a date is available
  const isDateAvailable = useCallback(
    (date: Date): boolean => {
      const today = startOfDay(new Date())

      // Must be in the future
      if (isBefore(date, today)) return false

      // Must be within max days
      if (isBefore(maxDate, date)) return false

      // Exclude weekends if configured
      if (excludeWeekends && isWeekend(date)) return false

      return true
    },
    [maxDate, excludeWeekends]
  )

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      if (!isDateAvailable(date)) return

      setInternalSelectedDate(date)
      // Clear time when date changes
      onSelect(format(date, 'yyyy-MM-dd'), '')
    },
    [isDateAvailable, onSelect]
  )

  // Handle time selection
  const handleTimeSelect = useCallback(
    (time: string) => {
      if (!internalSelectedDate) return
      onSelect(format(internalSelectedDate, 'yyyy-MM-dd'), time)
    },
    [internalSelectedDate, onSelect]
  )

  // Navigate months
  const goToPrevMonth = () => {
    const prev = addMonths(currentMonth, -1)
    if (!isBefore(endOfMonth(prev), startOfDay(minDate))) {
      setCurrentMonth(prev)
    }
  }

  const goToNextMonth = () => {
    const next = addMonths(currentMonth, 1)
    if (isBefore(startOfMonth(next), maxDate)) {
      setCurrentMonth(next)
    }
  }

  // Get padding days for calendar grid
  const firstDayOfMonth = monthDays[0].getDay()
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) =>
    addDays(monthDays[0], -(firstDayOfMonth - i))
  )

  // Get selected day's weather
  const selectedDayWeather = internalSelectedDate
    ? weatherData[format(internalSelectedDate, 'yyyy-MM-dd')]
    : undefined

  return (
    <div className={cn('space-y-6', className)}>
      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="p-1 hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            {isLoadingWeather && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            className="p-1 hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0.5 px-2 py-2 bg-neutral-900/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 p-2">
          {/* Padding days from previous month */}
          {paddingDays.map((date) => (
            <DayCell
              key={date.toISOString()}
              date={date}
              isSelected={false}
              isDisabled={true}
              isCurrentMonth={false}
              onClick={() => {}}
            />
          ))}

          {/* Current month days */}
          {monthDays.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const weather = weatherData[dateKey]
            const isSelected =
              internalSelectedDate && isSameDay(date, internalSelectedDate)

            return (
              <DayCell
                key={date.toISOString()}
                date={date}
                weather={weather}
                isSelected={!!isSelected}
                isDisabled={!isDateAvailable(date)}
                isCurrentMonth={isSameMonth(date, currentMonth)}
                onClick={() => handleDateSelect(date)}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-amber-400" />
            <span>Good weather</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Weather caution</span>
          </div>
        </div>
      </div>

      {/* Selected Date Summary & Time Slots */}
      {internalSelectedDate && (
        <div className="space-y-4">
          {/* Selected Date Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">
                {format(internalSelectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
              {selectedDayWeather && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <WeatherIcon
                    condition={selectedDayWeather.conditions}
                    className="h-4 w-4"
                  />
                  <span>{selectedDayWeather.conditions}</span>
                  <span>
                    {selectedDayWeather.high}°/{selectedDayWeather.low}°
                  </span>
                  <span>{selectedDayWeather.rainChance}% rain</span>
                </div>
              )}
            </div>

            {selectedTime && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {
                  DEFAULT_TIME_SLOTS.find((s) => s.time === selectedTime)
                    ?.label
                }
              </Badge>
            )}
          </div>

          {/* Weather Alerts */}
          {selectedDayWeather?.alerts && selectedDayWeather.alerts.length > 0 && (
            <div className="space-y-2">
              {selectedDayWeather.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 text-sm rounded-lg px-3 py-2',
                    alert.severity === 'warning' &&
                      'bg-red-500/10 text-red-400',
                    alert.severity === 'caution' &&
                      'bg-amber-500/10 text-amber-400',
                    alert.severity === 'info' && 'bg-blue-500/10 text-blue-400'
                  )}
                >
                  {alert.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Time Slots */}
          <div className="pt-2">
            <h5 className="text-sm font-medium text-foreground mb-3">
              Select a time
            </h5>
            <TimeSlotGrid
              slots={DEFAULT_TIME_SLOTS}
              selectedTime={selectedTime}
              onSelect={handleTimeSelect}
              weather={selectedDayWeather}
            />
          </div>
        </div>
      )}
    </div>
  )
}
