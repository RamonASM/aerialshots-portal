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
      <h2 className="text-2xl font-bold text-neutral-900">
        Neighborhoods in {communityName}
      </h2>
      <p className="mt-2 text-neutral-600">
        Explore the distinct neighborhoods that make up this community
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {subdivisions.map((subdivision, index) => (
          <div
            key={index}
            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-lg"
          >
            {/* Image */}
            {subdivision.image_url ? (
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={subdivision.image_url}
                  alt={subdivision.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                <Home className="h-12 w-12 text-blue-300" />
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-neutral-900">{subdivision.name}</h3>

              {subdivision.description && (
                <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                  {subdivision.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {subdivision.price_range && (
                  <div className="flex items-center gap-1 text-neutral-500">
                    <DollarSign className="h-3.5 w-3.5" />
                    {subdivision.price_range}
                  </div>
                )}
                {subdivision.year_built && (
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {subdivision.year_built}
                  </div>
                )}
                {subdivision.homes_count && (
                  <div className="flex items-center gap-1 text-neutral-500">
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
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
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
