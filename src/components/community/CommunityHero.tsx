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
    <div className="relative h-[450px] w-full overflow-hidden bg-black">
      {/* Background Image */}
      {heroImage ? (
        <Image
          src={heroImage}
          alt={name}
          fill
          className="object-cover opacity-70"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0077ff]/30 to-transparent" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              {/* Location Badge */}
              {location && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/[0.08] px-3 py-1.5 text-[13px] text-white/90 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </div>
              )}

              {/* Community Name */}
              <h1 className="text-[34px] font-semibold tracking-tight text-white md:text-[44px]">
                {name}
              </h1>

              {/* Tagline */}
              {tagline && (
                <p className="mt-2 text-[17px] text-white/80 md:text-lg">
                  {tagline}
                </p>
              )}

              {/* Quick Facts Bar */}
              {quickFacts && (
                <div className="mt-4 flex flex-wrap gap-4">
                  {quickFacts.population && (
                    <div className="flex items-center gap-2 text-[#a1a1a6]">
                      <Users className="h-4 w-4" />
                      <span className="text-[13px]">
                        {quickFacts.population.toLocaleString()} residents
                      </span>
                    </div>
                  )}
                  {quickFacts.founded && (
                    <div className="flex items-center gap-2 text-[#a1a1a6]">
                      <Calendar className="h-4 w-4" />
                      <span className="text-[13px]">Est. {quickFacts.founded}</span>
                    </div>
                  )}
                  {quickFacts.area_sqmi && (
                    <div className="flex items-center gap-2 text-[#a1a1a6]">
                      <Home className="h-4 w-4" />
                      <span className="text-[13px]">
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
                variant="outline"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
