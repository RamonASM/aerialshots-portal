/**
 * Open House RSVP Component
 *
 * Allows visitors to RSVP for open houses
 */

'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, MapPin, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface OpenHouse {
  id: string
  event_date: string
  start_time: string
  end_time: string
  title?: string | null
  description?: string | null
  max_attendees?: number | null
  current_rsvps?: number
}

interface OpenHouseRSVPProps {
  openHouse: OpenHouse
  listingAddress: string
  brandColor?: string
  className?: string
}

export function OpenHouseRSVP({
  openHouse,
  listingAddress,
  brandColor = '#0077ff',
  className,
}: OpenHouseRSVPProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    partySize: 1,
    notes: '',
  })

  // Format date and time
  const eventDate = new Date(openHouse.event_date)
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const timeRange = `${formatTime(openHouse.start_time)} - ${formatTime(openHouse.end_time)}`

  // Check if at capacity
  const isAtCapacity =
    openHouse.max_attendees &&
    openHouse.current_rsvps &&
    openHouse.current_rsvps >= openHouse.max_attendees

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/open-house/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openHouseId: openHouse.id,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit RSVP')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-[#1c1c1e] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ backgroundColor: `${brandColor}15` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: brandColor }}
          >
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {openHouse.title || 'Open House'}
            </h3>
            <p className="text-sm text-[#a1a1a6]">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-[#a1a1a6]">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{timeRange}</span>
        </div>

        <div className="flex items-center gap-2 text-[#a1a1a6]">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{listingAddress}</span>
        </div>

        {openHouse.max_attendees && (
          <div className="flex items-center gap-2 text-[#a1a1a6]">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {openHouse.current_rsvps || 0} / {openHouse.max_attendees} registered
            </span>
          </div>
        )}

        {openHouse.description && (
          <p className="text-sm text-[#636366] mt-2">{openHouse.description}</p>
        )}
      </div>

      {/* RSVP Section */}
      <div className="border-t border-white/[0.08] p-4">
        {isSuccess ? (
          <div className="text-center py-4">
            <div
              className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <Check className="h-6 w-6" style={{ color: brandColor }} />
            </div>
            <h4 className="font-semibold text-white">You're Registered!</h4>
            <p className="text-sm text-[#a1a1a6] mt-1">
              We'll send you a reminder before the open house.
            </p>
          </div>
        ) : isOpen ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <input
              type="text"
              placeholder="Your name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
            />

            <input
              type="email"
              placeholder="Email address"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
            />

            <input
              type="tel"
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-white placeholder:text-[#636366] focus:border-[#0077ff] focus:outline-none"
            />

            <div className="flex items-center gap-3">
              <label className="text-sm text-[#a1a1a6]">Party size:</label>
              <select
                value={formData.partySize}
                onChange={(e) =>
                  setFormData({ ...formData, partySize: parseInt(e.target.value) })
                }
                className="rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-white focus:border-[#0077ff] focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'person' : 'people'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Confirm RSVP'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            onClick={() => setIsOpen(true)}
            disabled={!!isAtCapacity}
            className="w-full"
            style={{
              backgroundColor: isAtCapacity ? undefined : brandColor,
            }}
          >
            {isAtCapacity ? 'Event is Full' : 'RSVP Now'}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Open House Card for listing multiple open houses
 */
interface OpenHouseCardProps {
  openHouse: OpenHouse
  brandColor?: string
  onClick?: () => void
}

export function OpenHouseCard({
  openHouse,
  brandColor = '#0077ff',
  onClick,
}: OpenHouseCardProps) {
  const eventDate = new Date(openHouse.event_date)
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNumber = eventDate.getDate()
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' })

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 text-left transition-colors hover:border-white/[0.15] w-full"
    >
      {/* Date Badge */}
      <div
        className="flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[60px]"
        style={{ backgroundColor: `${brandColor}15` }}
      >
        <span className="text-[10px] uppercase" style={{ color: brandColor }}>
          {dayName}
        </span>
        <span
          className="text-[22px] font-bold"
          style={{ color: brandColor }}
        >
          {dayNumber}
        </span>
        <span className="text-[10px] uppercase" style={{ color: brandColor }}>
          {month}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white truncate">
          {openHouse.title || 'Open House'}
        </h4>
        <p className="text-sm text-[#a1a1a6] mt-0.5">
          {formatTime(openHouse.start_time)} - {formatTime(openHouse.end_time)}
        </p>
        {openHouse.max_attendees && (
          <p className="text-xs text-[#636366] mt-1">
            {openHouse.current_rsvps || 0} registered
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="text-[#636366]">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  )
}
