'use client'

import Image from 'next/image'
import { MapPin, Users, Calendar, Home } from 'lucide-react'
import { ShareButton } from '@/components/ui/share-button'
import type { CommunityQuickFacts } from '@/lib/supabase/types'

interface CommunityHeroProps {
  name: string
  tagline?: string | null
  heroImage?: string | null
  galleryImages?: string[]
  quickFacts?: CommunityQuickFacts | null
  city?: string | null
  state?: string | null
}

export function CommunityHero({
  name,
  tagline,
  heroImage,
  quickFacts,
  city,
  state,
}: CommunityHeroProps) {
  const location = [city, state].filter(Boolean).join(', ')

  return (
    <div className="relative h-[450px] w-full overflow-hidden bg-neutral-900">
      {/* Background Image */}
      {heroImage ? (
        <Image
          src={heroImage}
          alt={name}
          fill
          className="object-cover opacity-80"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-700" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              {/* Location Badge */}
              {location && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm text-white backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </div>
              )}

              {/* Community Name */}
              <h1 className="text-4xl font-bold text-white md:text-5xl">
                {name}
              </h1>

              {/* Tagline */}
              {tagline && (
                <p className="mt-2 text-lg text-white/90 md:text-xl">
                  {tagline}
                </p>
              )}

              {/* Quick Facts Bar */}
              {quickFacts && (
                <div className="mt-4 flex flex-wrap gap-4">
                  {quickFacts.population && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">
                        {quickFacts.population.toLocaleString()} residents
                      </span>
                    </div>
                  )}
                  {quickFacts.founded && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Est. {quickFacts.founded}</span>
                    </div>
                  )}
                  {quickFacts.area_sqmi && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Home className="h-4 w-4" />
                      <span className="text-sm">
                        {quickFacts.area_sqmi} sq mi
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Share Button */}
            <div className="flex-shrink-0">
              <ShareButton
                title={`${name} - Homes & Real Estate`}
                text={tagline || `Explore homes for sale in ${name}`}
                variant="secondary"
                className="bg-white/20 text-white hover:bg-white/30 border-white/30"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
