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
  development: 'bg-blue-100 text-blue-700 border-blue-200',
  infrastructure: 'bg-purple-100 text-purple-700 border-purple-200',
  business: 'bg-green-100 text-green-700 border-green-200',
  event: 'bg-amber-100 text-amber-700 border-amber-200',
  school: 'bg-red-100 text-red-700 border-red-200',
  park: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between py-4 text-left hover:bg-neutral-50 px-2 -mx-2 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <span className="font-medium text-neutral-900">
              {categoryLabels[category]}
            </span>
            <span className="ml-2 text-sm text-neutral-500">
              {places.length} nearby
            </span>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-neutral-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="pb-4 space-y-2">
          {places.slice(0, 5).map((place) => (
            <div
              key={place.id}
              className="flex items-start gap-3 rounded-lg bg-neutral-50 p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-neutral-900 truncate">
                  {place.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-sm text-neutral-500">
                  {place.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {place.rating}
                      {place.reviewCount > 0 && (
                        <span className="text-neutral-400">
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
                          ? 'text-green-600'
                          : 'text-red-500'
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
          <h2 className="text-2xl font-bold text-neutral-900">
            Life Here
          </h2>
          <p className="mt-2 text-neutral-600">
            Explore what&apos;s nearby
          </p>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
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
          <h2 className="text-2xl font-bold text-neutral-900">
            Upcoming Events
          </h2>
          <p className="mt-2 text-neutral-600">
            Things happening nearby
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {events.slice(0, 4).map((event) => (
              <a
                key={event.id}
                href={event.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md"
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
                  <h4 className="font-medium text-neutral-900 line-clamp-2 group-hover:text-blue-600">
                    {event.name}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.date}
                    {event.time && ` at ${event.time}`}
                  </div>
                  <div className="mt-1 text-sm text-neutral-500 truncate">
                    {event.venue}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-blue-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* What's Coming */}
      {curatedItems && curatedItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-neutral-900">
              What&apos;s Coming
            </h2>
          </div>
          <p className="mt-2 text-neutral-600">
            New developments and upcoming changes
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {curatedItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  curatedCategoryColors[item.category] || 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <span className="text-xs font-medium uppercase tracking-wide">
                  {item.category}
                </span>
                <h4 className="mt-1 font-semibold">{item.title}</h4>
                {item.description && (
                  <p className="mt-1 text-sm opacity-80">{item.description}</p>
                )}
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm hover:underline"
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
