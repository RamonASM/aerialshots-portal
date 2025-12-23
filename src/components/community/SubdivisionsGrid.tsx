import Image from 'next/image'
import { Home, Calendar, DollarSign } from 'lucide-react'
import type { CommunitySubdivision } from '@/lib/supabase/types'

interface SubdivisionsGridProps {
  subdivisions: CommunitySubdivision[]
  communityName: string
}

export function SubdivisionsGrid({ subdivisions, communityName }: SubdivisionsGridProps) {
  if (!subdivisions || subdivisions.length === 0) return null

  return (
    <section>
      <h2 className="text-[22px] font-semibold text-white">
        Neighborhoods in {communityName}
      </h2>
      <p className="mt-2 text-[#a1a1a6]">
        Explore the distinct neighborhoods that make up this community
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {subdivisions.map((subdivision, index) => (
          <div
            key={index}
            className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] transition-all duration-200 hover:border-white/[0.16]"
          >
            {/* Image */}
            {subdivision.image_url ? (
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={subdivision.image_url}
                  alt={subdivision.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#0077ff]/20 to-transparent">
                <Home className="h-12 w-12 text-[#0077ff]/40" />
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-white">{subdivision.name}</h3>

              {subdivision.description && (
                <p className="mt-1 text-[13px] text-[#a1a1a6] line-clamp-2">
                  {subdivision.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
                {subdivision.price_range && (
                  <div className="flex items-center gap-1 text-[#636366]">
                    <DollarSign className="h-3.5 w-3.5" />
                    {subdivision.price_range}
                  </div>
                )}
                {subdivision.year_built && (
                  <div className="flex items-center gap-1 text-[#636366]">
                    <Calendar className="h-3.5 w-3.5" />
                    {subdivision.year_built}
                  </div>
                )}
                {subdivision.homes_count && (
                  <div className="flex items-center gap-1 text-[#636366]">
                    <Home className="h-3.5 w-3.5" />
                    {subdivision.homes_count.toLocaleString()} homes
                  </div>
                )}
              </div>

              {subdivision.home_styles && subdivision.home_styles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {subdivision.home_styles.slice(0, 3).map((style, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white/5 border border-white/[0.08] px-2 py-0.5 text-[11px] text-[#a1a1a6]"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
