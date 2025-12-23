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
    <section className="bg-black py-12 border-t border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-[22px] font-semibold text-white">Upcoming Events</h2>
        <p className="mt-2 text-[15px] text-[#a1a1a6]">
          Things to do nearby in the coming weeks
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 6).map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] transition-all duration-200 hover:border-white/[0.16] hover:bg-[#2c2c2e]"
            >
              {/* Event Image */}
              {event.imageUrl && (
                <div className="relative h-40 overflow-hidden bg-[#0a0a0a]">
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
                  <span className="inline-block rounded-full bg-white/5 border border-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-[#a1a1a6]">
                    {event.category}
                  </span>
                  {event.genre && (
                    <span className="text-[11px] text-[#636366]">{event.genre}</span>
                  )}
                </div>

                <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold text-white group-hover:text-[#0077ff] transition-colors">
                  {event.name}
                </h3>

                <div className="mt-auto space-y-1.5 pt-3">
                  <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-[#636366]" />
                    <span>
                      {event.date}
                      {event.time && ` at ${event.time}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-[#636366]" />
                    <span className="line-clamp-1">
                      {event.venue}
                      {event.city && `, ${event.city}`}
                    </span>
                  </div>

                  {event.priceRange && (
                    <div className="flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                      <Ticket className="h-4 w-4 flex-shrink-0 text-[#636366]" />
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
