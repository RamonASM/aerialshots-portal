'use client'

import { useState, useEffect } from 'react'
import {
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Thermometer,
} from 'lucide-react'

interface WeatherForecastProps {
  lat: number | null
  lng: number | null
  selectedDate?: string
  onDateSelect?: (date: string, isGoodForShoot: boolean) => void
  className?: string
}

interface WeatherAlert {
  type: 'rain' | 'wind' | 'storm' | 'heat' | 'cold'
  severity: 'warning' | 'caution' | 'info'
  message: string
}

interface ForecastDay {
  date: string
  forecast: {
    date: string
    conditions: string
    icon: string
    high_temp_f: number
    low_temp_f: number
    precipitation_chance: number
    wind_speed_mph: number
    humidity: number
    uv_index: number
    sunrise: string
    sunset: string
    description: string
  }
  alerts: WeatherAlert[]
  is_good_for_shoot: boolean
}

interface ForecastResponse {
  success: boolean
  location: { lat: number; lng: number }
  forecasts: ForecastDay[]
  summary: {
    total_days: number
    good_days: number
    has_alerts: boolean
  }
}

function getWeatherIcon(conditions: string, className: string = 'h-5 w-5') {
  const condition = conditions.toLowerCase()
  if (condition.includes('thunder') || condition.includes('storm')) {
    return <CloudLightning className={`${className} text-amber-400`} />
  }
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return <CloudRain className={`${className} text-blue-400`} />
  }
  if (condition.includes('cloud') || condition.includes('overcast')) {
    return <Cloud className={`${className} text-[#a1a1a6]`} />
  }
  return <Sun className={`${className} text-yellow-400`} />
}

function formatDate(dateStr: string): { day: string; date: string } {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const targetDate = new Date(dateStr + 'T12:00:00')

  if (targetDate.toDateString() === today.toDateString()) {
    return { day: 'Today', date: dateStr }
  }
  if (targetDate.toDateString() === tomorrow.toDateString()) {
    return { day: 'Tomorrow', date: dateStr }
  }

  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

export function WeatherForecast({
  lat,
  lng,
  selectedDate,
  onDateSelect,
  className = '',
}: WeatherForecastProps) {
  const [forecasts, setForecasts] = useState<ForecastDay[]>([])
  const [summary, setSummary] = useState<ForecastResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  useEffect(() => {
    async function fetchForecast() {
      if (!lat || !lng) {
        setForecasts([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
        })

        const response = await fetch(`/api/weather/forecast?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch weather forecast')
        }

        setForecasts(data.forecasts)
        setSummary(data.summary)
      } catch (err) {
        console.error('Weather forecast error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load forecast')
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [lat, lng])

  if (!lat || !lng) {
    return null
  }

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-sm text-[#a1a1a6]">Loading weather forecast...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 ${className}`}
      >
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (forecasts.length === 0) {
    return null
  }

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-400" />
          <h4 className="font-medium text-white">7-Day Forecast</h4>
        </div>
        {summary && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400">{summary.good_days} good days</span>
          </div>
        )}
      </div>

      {/* Forecast Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {forecasts.map((day) => {
          const { day: dayLabel, date: dateLabel } = formatDate(day.date)
          const isSelected = selectedDate === day.date
          const isExpanded = expandedDate === day.date

          return (
            <button
              key={day.date}
              onClick={() => {
                setExpandedDate(isExpanded ? null : day.date)
                onDateSelect?.(day.date, day.is_good_for_shoot)
              }}
              className={`group relative flex flex-col items-center rounded-lg p-2 transition-all ${
                isSelected
                  ? 'bg-blue-500/20 ring-1 ring-blue-500/50'
                  : day.is_good_for_shoot
                    ? 'bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'bg-red-500/10 hover:bg-red-500/15'
              }`}
            >
              {/* Day label */}
              <span className="text-[10px] font-medium uppercase text-[#8e8e93]">
                {dayLabel}
              </span>

              {/* Weather icon */}
              <div className="my-1.5">{getWeatherIcon(day.forecast.conditions)}</div>

              {/* Temperature */}
              <span className="text-xs font-medium text-white">
                {day.forecast.high_temp_f}°
              </span>
              <span className="text-[10px] text-[#8e8e93]">
                {day.forecast.low_temp_f}°
              </span>

              {/* Alert indicator */}
              {day.alerts.length > 0 && (
                <div className="absolute -right-0.5 -top-0.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      day.alerts.some((a) => a.severity === 'warning')
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
              )}

              {/* Good for shoot indicator */}
              {day.is_good_for_shoot && (
                <CheckCircle2 className="absolute -left-0.5 -top-0.5 h-3 w-3 text-green-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Expanded Day Details */}
      {expandedDate && (
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          {(() => {
            const day = forecasts.find((f) => f.date === expandedDate)
            if (!day) return null

            const { date: dateLabel } = formatDate(day.date)

            return (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWeatherIcon(day.forecast.conditions, 'h-6 w-6')}
                    <div>
                      <span className="font-medium text-white">
                        {dateLabel}
                      </span>
                      <span className="ml-2 text-sm text-[#a1a1a6]">
                        {day.forecast.conditions}
                      </span>
                    </div>
                  </div>
                  {day.is_good_for_shoot ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Good for shoot
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
                      <AlertTriangle className="h-3 w-3" />
                      Not ideal
                    </span>
                  )}
                </div>

                {/* Weather Details Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#8e8e93]">
                      <Thermometer className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">Temp</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-white">
                      {day.forecast.high_temp_f}° / {day.forecast.low_temp_f}°
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#8e8e93]">
                      <Droplets className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">Rain</span>
                    </div>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        day.forecast.precipitation_chance >= 30
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      {day.forecast.precipitation_chance}%
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#8e8e93]">
                      <Wind className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">Wind</span>
                    </div>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        day.forecast.wind_speed_mph >= 15
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      {day.forecast.wind_speed_mph} mph
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-1.5 text-[#8e8e93]">
                      <Sun className="h-3.5 w-3.5" />
                      <span className="text-[10px] uppercase">UV</span>
                    </div>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        day.forecast.uv_index >= 8
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      {day.forecast.uv_index}
                    </p>
                  </div>
                </div>

                {/* Sunrise/Sunset */}
                <div className="flex items-center justify-center gap-6 text-sm text-[#a1a1a6]">
                  <span>Sunrise: {day.forecast.sunrise}</span>
                  <span>Sunset: {day.forecast.sunset}</span>
                </div>

                {/* Alerts */}
                {day.alerts.length > 0 && (
                  <div className="space-y-2">
                    {day.alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-lg p-2.5 ${
                          alert.severity === 'warning'
                            ? 'bg-red-500/10 text-red-400'
                            : alert.severity === 'caution'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Footer tip */}
      <p className="mt-3 text-center text-[10px] text-[#8e8e93]">
        Tap a day for details. Green check = ideal shooting conditions.
      </p>
    </div>
  )
}
