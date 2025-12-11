'use client'

import { useState } from 'react'
import { Star, MapPin, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NearbyPlace, PlaceCategory } from '@/lib/utils/category-info'
import { getPlaceCategoryDisplayInfo } from '@/lib/utils/category-info'

interface LifeHereSectionProps {
  places: Record<PlaceCategory, NearbyPlace[]>
  walkScoreAddress?: string
  lat?: number
  lng?: number
}

export function LifeHereSection({ places, walkScoreAddress, lat, lng }: LifeHereSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<PlaceCategory | null>('dining')

  const categories = Object.keys(places) as PlaceCategory[]
  const hasPlaces = categories.some((cat) => places[cat].length > 0)

  if (!hasPlaces && !walkScoreAddress) return null

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-neutral-900">Life Here</h2>
        <p className="mt-2 text-neutral-600">
          Discover what makes this neighborhood special
        </p>

        {/* Walk Score Widget */}
        {walkScoreAddress && (
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Walkability</h3>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <iframe
                src={`https://www.walkscore.com/serve-walkscore-tile.php?wsid=&s=${encodeURIComponent(
                  walkScoreAddress
                )}&o=h&c=f&h=500&fh=0&w=100%25`}
                height="500"
                className="w-full border-0"
                title="Walk Score"
              />
            </div>
          </div>
        )}

        {/* Nearby Places */}
        {hasPlaces && (
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nearby Places</h3>

            <div className="space-y-2">
              {categories.map((category) => {
                const info = getPlaceCategoryDisplayInfo(category)
                const categoryPlaces = places[category]
                const isExpanded = expandedCategory === category

                if (categoryPlaces.length === 0) return null

                return (
                  <div
                    key={category}
                    className="overflow-hidden rounded-lg border border-neutral-200"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() =>
                        setExpandedCategory(isExpanded ? null : category)
                      }
                      className="flex w-full items-center justify-between bg-neutral-50 px-4 py-3 text-left hover:bg-neutral-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <h4 className="font-medium text-neutral-900">
                            {info.title}
                          </h4>
                          <p className="text-sm text-neutral-500">
                            {categoryPlaces.length} places nearby
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-400" />
                      )}
                    </button>

                    {/* Places List */}
                    {isExpanded && (
                      <div className="divide-y divide-neutral-100">
                        {categoryPlaces.map((place) => (
                          <div
                            key={place.id}
                            className="flex items-start gap-4 px-4 py-3"
                          >
                            <div className="flex-1">
                              <h5 className="font-medium text-neutral-900">
                                {place.name}
                              </h5>
                              <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                                <MapPin className="h-3 w-3" />
                                {place.address}
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                {place.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm font-medium text-neutral-700">
                                      {place.rating.toFixed(1)}
                                    </span>
                                    {place.reviewCount > 0 && (
                                      <span className="text-sm text-neutral-400">
                                        ({place.reviewCount})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {place.distance && (
                                  <span className="text-sm text-neutral-500">
                                    {place.distance.toFixed(1)} mi
                                  </span>
                                )}
                                {place.isOpen !== undefined && (
                                  <span
                                    className={`text-sm ${
                                      place.isOpen
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {place.isOpen ? 'Open' : 'Closed'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {place.priceLevel && (
                              <div className="text-sm text-neutral-500">
                                {'$'.repeat(place.priceLevel)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Map Link */}
        {lat && lng && (
          <div className="mt-6">
            <Button variant="outline" asChild>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Google Maps
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
