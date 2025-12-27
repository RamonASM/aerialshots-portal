'use client'

import { useState } from 'react'
import { Car, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { ThemeParkWithWaits, RideWaitTime } from '@/lib/api/types'

interface ThemeParksSectionProps {
  parks: ThemeParkWithWaits[]
}

function getWaitTimeColor(minutes: number | null): string {
  if (minutes === null) return 'text-[#636366]'
  if (minutes <= 20) return 'text-green-500'
  if (minutes <= 45) return 'text-yellow-500'
  return 'text-red-500'
}

function getWaitTimeBg(minutes: number | null): string {
  if (minutes === null) return 'bg-[#636366]/20'
  if (minutes <= 20) return 'bg-green-500/20'
  if (minutes <= 45) return 'bg-yellow-500/20'
  return 'bg-red-500/20'
}

function RideWaitBadge({ ride }: { ride: RideWaitTime }) {
  const isAvailable = ride.status === 'operating' && ride.waitMinutes !== null

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getWaitTimeBg(ride.waitMinutes)}`}>
      <span className="text-xs text-white/80 truncate max-w-[120px]">{ride.name}</span>
      {isAvailable ? (
        <span className={`text-xs font-medium ${getWaitTimeColor(ride.waitMinutes)}`}>
          {ride.waitMinutes} min
        </span>
      ) : (
        <span className="text-xs text-[#636366]">
          {ride.status === 'down' ? 'Down' : ride.status === 'refurbishment' ? 'Closed' : 'N/A'}
        </span>
      )}
    </div>
  )
}

function ParkCard({ park }: { park: ThemeParkWithWaits }) {
  const [expanded, setExpanded] = useState(false)
  const hasWaits = park.topRides && park.topRides.length > 0

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-medium text-white">{park.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#a1a1a6]">
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                {park.distanceMiles.toFixed(1)} mi
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {park.driveDurationMinutes} min
              </span>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              park.isOpen
                ? 'bg-green-500/20 text-green-500'
                : 'bg-[#636366]/20 text-[#636366]'
            }`}
          >
            {park.isOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {park.operatingHours && park.isOpen && (
          <p className="text-xs text-[#636366] mb-3">
            Hours: {park.operatingHours.open} - {park.operatingHours.close}
          </p>
        )}

        {hasWaits && (
          <>
            <div className="flex flex-wrap gap-2">
              {(expanded ? park.topRides : park.topRides.slice(0, 3)).map((ride) => (
                <RideWaitBadge key={ride.id} ride={ride} />
              ))}
            </div>

            {park.topRides.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 flex items-center gap-1 text-xs text-[#a1a1a6] hover:text-white transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {park.topRides.length - 3} more rides
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {park.driveDurationWithTraffic > park.driveDurationMinutes + 5 && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-white/[0.06]">
          <p className="text-xs text-yellow-500">
            ~{park.driveDurationWithTraffic - park.driveDurationMinutes} min delay due to traffic
          </p>
        </div>
      )}
    </div>
  )
}

export function ThemeParksSection({ parks }: ThemeParksSectionProps) {
  if (!parks || parks.length === 0) {
    return null
  }

  // Sort by distance
  const sortedParks = [...parks].sort((a, b) => a.distanceMiles - b.distanceMiles)
  const closestPark = sortedParks[0]

  return (
    <section className="py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Theme Parks</h2>
          </div>
          <p className="text-sm text-[#a1a1a6]">
            {closestPark.name} is just {Math.round(closestPark.driveDurationMinutes)} minutes away
          </p>
        </div>
        <span className="text-xs text-[#636366]">
          {parks.length} parks nearby
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedParks.map((park) => (
          <ParkCard key={park.id} park={park} />
        ))}
      </div>

      <p className="mt-4 text-xs text-[#636366]">
        Wait times updated in real-time via ThemeParks.wiki
      </p>
    </section>
  )
}
