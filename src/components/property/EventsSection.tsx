'use client'

import Image from 'next/image'
import { Calendar, MapPin, Ticket, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LocalEvent } from '@/lib/integrations/ticketmaster/client'

interface EventsSectionProps {
  events: LocalEvent[]
}

export function EventsSection({ events }: EventsSectionProps) {
  if (events.length === 0) return null

  return (
    <section className="bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-neutral-900">Upcoming Events</h2>
        <p className="mt-2 text-neutral-600">
          Things to do nearby in the coming weeks
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-lg"
            >
              {/* Event Image */}
              {event.imageUrl && (
                <div className="relative h-40 overflow-hidden bg-neutral-100">
                  <Image
                    src={event.imageUrl}
                    alt={event.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Event Details */}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                    {event.category}
                  </span>
                  {event.genre && (
                    <span className="text-xs text-neutral-500">{event.genre}</span>
                  )}
                </div>

                <h3 className="mt-2 line-clamp-2 font-semibold text-neutral-900 group-hover:text-[#ff4533]">
                  {event.name}
                </h3>

                <div className="mt-auto space-y-1 pt-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {event.date}
                      {event.time && ` at ${event.time}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {event.venue}
                      {event.city && `, ${event.city}`}
                    </span>
                  </div>

                  {event.priceRange && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Ticket className="h-4 w-4 flex-shrink-0" />
                      <span>{event.priceRange}</span>
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>

        {events.length > 6 && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <a
                href="https://www.ticketmaster.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View More Events
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
