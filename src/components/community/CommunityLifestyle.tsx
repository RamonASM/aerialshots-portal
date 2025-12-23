'use client'

import { useState } from 'react'
import {
  Utensils,
  ShoppingBag,
  Dumbbell,
  Film,
  Building2,
  GraduationCap,
  ChevronDown,
  Star,
  MapPin,
  Clock,
  Calendar,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import type { NearbyPlace, PlaceCategory } from '@/lib/integrations/google-places/client'
import type { LocalEvent } from '@/lib/integrations/ticketmaster/client'
import type { CuratedItem } from '@/lib/utils/category-info'

interface CommunityLifestyleProps {
  nearbyPlaces: Record<PlaceCategory, NearbyPlace[]> | null
  events: LocalEvent[]
  curatedItems: CuratedItem[]
  lat: number
  lng: number
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dining: Utensils,
  shopping: ShoppingBag,
  fitness: Dumbbell,
  entertainment: Film,
  services: Building2,
  education: GraduationCap,
}

const categoryLabels: Record<string, string> = {
  dining: 'Dining',
  shopping: 'Shopping',
  fitness: 'Fitness & Recreation',
  entertainment: 'Entertainment',
  services: 'Services',
  education: 'Education',
}

const curatedCategoryColors: Record<string, string> = {
  development: 'bg-[#0077ff]/20 text-[#3395ff] border-[#0077ff]/30',
  infrastructure: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  business: 'bg-green-500/20 text-green-400 border-green-500/30',
  event: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  school: 'bg-red-500/20 text-red-400 border-red-500/30',
  park: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

function PlaceCategory({
  category,
  places,
}: {
  category: string
  places: NearbyPlace[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = categoryIcons[category] || Building2

  if (!places || places.length === 0) return null

  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4 text-left hover:bg-white/5 px-2 -mx-2 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0077ff]/10">
            <Icon className="h-5 w-5 text-[#0077ff]" />
          </div>
          <div>
            <span className="font-medium text-white">
              {categoryLabels[category]}
            </span>
            <span className="ml-2 text-[13px] text-[#636366]">
              {places.length} nearby
            </span>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-[#636366] transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="pb-4 space-y-2">
          {places.slice(0, 5).map((place) => (
            <div
              key={place.id}
              className="flex items-start gap-3 rounded-xl bg-[#0a0a0a] border border-white/[0.08] p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">
                  {place.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-[#636366]">
                  {place.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {place.rating}
                      {place.reviewCount > 0 && (
                        <span className="text-[#636366]">
                          ({place.reviewCount})
                        </span>
                      )}
                    </span>
                  )}
                  {place.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {place.distance.toFixed(1)} mi
                    </span>
                  )}
                  {place.isOpen !== undefined && (
                    <span
                      className={`flex items-center gap-1 ${
                        place.isOpen
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {place.isOpen ? 'Open' : 'Closed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CommunityLifestyle({
  nearbyPlaces,
  events,
  curatedItems,
}: CommunityLifestyleProps) {
  const categories: PlaceCategory[] = ['dining', 'shopping', 'fitness', 'entertainment', 'services', 'education']

  return (
    <section className="space-y-8">
      {/* Nearby Places */}
      {nearbyPlaces && (
        <div>
          <h2 className="text-[22px] font-semibold text-white">
            Life Here
          </h2>
          <p className="mt-2 text-[#a1a1a6]">
            Explore what&apos;s nearby
          </p>

          <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#1c1c1e] divide-y divide-white/[0.08] px-4">
            {categories.map((category) => (
              <PlaceCategory
                key={category}
                category={category}
                places={nearbyPlaces[category] || []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Local Events */}
      {events && events.length > 0 && (
        <div>
          <h2 className="text-[22px] font-semibold text-white">
            Upcoming Events
          </h2>
          <p className="mt-2 text-[#a1a1a6]">
            Things happening nearby
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {events.slice(0, 4).map((event) => (
              <a
                key={event.id}
                href={event.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 transition-all duration-200 hover:border-white/[0.16]"
              >
                {event.imageUrl && (
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white line-clamp-2 group-hover:text-[#0077ff] transition-colors">
                    {event.name}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-[#636366]">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.date}
                    {event.time && ` at ${event.time}`}
                  </div>
                  <div className="mt-1 text-[13px] text-[#636366] truncate">
                    {event.venue}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-[#636366] group-hover:text-[#0077ff] transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* What's Coming */}
      {curatedItems && curatedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-400" />
            <h2 className="text-[22px] font-semibold text-white">
              What&apos;s Coming
            </h2>
          </div>
          <p className="mt-2 text-[#a1a1a6]">
            New developments and upcoming changes
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {curatedItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  curatedCategoryColors[item.category] || 'bg-white/5 border-white/[0.08] text-[#a1a1a6]'
                }`}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  {item.category}
                </span>
                <h4 className="mt-1 font-semibold text-white">{item.title}</h4>
                {item.description && (
                  <p className="mt-1 text-[13px] opacity-80">{item.description}</p>
                )}
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[13px] text-[#0077ff] hover:text-[#3395ff] transition-colors"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
