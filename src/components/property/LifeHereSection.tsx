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
    <section className="bg-[#0a0a0a] py-12 border-t border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-[22px] font-semibold text-white">Life Here</h2>
        <p className="mt-2 text-[15px] text-[#a1a1a6]">
          Discover what makes this neighborhood special
        </p>

        {/* Walk Score Widget */}
        {walkScoreAddress && (
          <div className="mt-8">
            <h3 className="mb-4 text-[17px] font-semibold text-white">Walkability</h3>
            <div className="overflow-hidden rounded-xl border border-white/[0.08]">
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
            <h3 className="mb-4 text-[17px] font-semibold text-white">Nearby Places</h3>

            <div className="space-y-2">
              {categories.map((category) => {
                const info = getPlaceCategoryDisplayInfo(category)
                const categoryPlaces = places[category]
                const isExpanded = expandedCategory === category

                if (categoryPlaces.length === 0) return null

                return (
                  <div
                    key={category}
                    className="overflow-hidden rounded-xl border border-white/[0.08]"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() =>
                        setExpandedCategory(isExpanded ? null : category)
                      }
                      className="flex w-full items-center justify-between bg-[#1c1c1e] px-4 py-3.5 text-left transition-colors hover:bg-[#2c2c2e]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <h4 className="font-medium text-white">
                            {info.title}
                          </h4>
                          <p className="text-[13px] text-[#636366]">
                            {categoryPlaces.length} places nearby
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-[#636366]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#636366]" />
                      )}
                    </button>

                    {/* Places List */}
                    {isExpanded && (
                      <div className="divide-y divide-white/[0.08]">
                        {categoryPlaces.map((place) => (
                          <div
                            key={place.id}
                            className="flex items-start gap-4 px-4 py-3 bg-[#0a0a0a]"
                          >
                            <div className="flex-1">
                              <h5 className="font-medium text-white">
                                {place.name}
                              </h5>
                              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#636366]">
                                <MapPin className="h-3 w-3" />
                                {place.address}
                              </p>
                              <div className="mt-1.5 flex items-center gap-3">
                                {place.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[13px] font-medium text-white">
                                      {place.rating.toFixed(1)}
                                    </span>
                                    {place.reviewCount > 0 && (
                                      <span className="text-[13px] text-[#636366]">
                                        ({place.reviewCount})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {place.distance && (
                                  <span className="text-[13px] text-[#a1a1a6]">
                                    {place.distance.toFixed(1)} mi
                                  </span>
                                )}
                                {place.isOpen !== undefined && (
                                  <span
                                    className={`text-[13px] ${
                                      place.isOpen
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    }`}
                                  >
                                    {place.isOpen ? 'Open' : 'Closed'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {place.priceLevel && (
                              <div className="text-[13px] text-[#636366]">
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
