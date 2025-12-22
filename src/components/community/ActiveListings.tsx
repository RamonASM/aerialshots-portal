import Image from 'next/image'
import Link from 'next/link'
import { Bed, Bath, Square, Building } from 'lucide-react'
import type { Tables } from '@/lib/supabase/types'

interface ListingWithMedia extends Tables<'listings'> {
  media_assets?: Tables<'media_assets'>[]
}

interface ActiveListingsProps {
  listings: ListingWithMedia[]
  communityName: string
}

export function ActiveListings({ listings, communityName }: ActiveListingsProps) {
  if (!listings || listings.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            Homes for Sale
          </h2>
          <p className="mt-1 text-neutral-600">
            {listings.length} active listing{listings.length !== 1 ? 's' : ''} in {communityName}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.slice(0, 6).map((listing) => {
          const heroImage = listing.media_assets?.find((m) => m.type === 'photo')

          return (
            <Link
              key={listing.id}
              href={`/property/${listing.id}`}
              className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:shadow-lg"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                {heroImage?.aryeo_url ? (
                  <Image
                    src={heroImage.aryeo_url}
                    alt={listing.address}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Building className="h-12 w-12 text-neutral-300" />
                  </div>
                )}

                {/* Price Badge */}
                {listing.price && (
                  <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-1.5 font-bold text-neutral-900 shadow-sm backdrop-blur-sm">
                    ${listing.price.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <h3 className="font-semibold text-neutral-900 truncate">
                  {listing.address}
                </h3>
                <p className="text-sm text-neutral-500">
                  {[listing.city, listing.state, listing.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-sm text-neutral-600">
                  {listing.beds && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {listing.beds} bd
                    </div>
                  )}
                  {listing.baths && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {listing.baths} ba
                    </div>
                  )}
                  {listing.sqft && (
                    <div className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      {listing.sqft.toLocaleString()} sqft
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {listings.length > 6 && (
        <div className="mt-6 text-center">
          <Link
            href="/dashboard/listings"
            className="text-blue-600 hover:underline"
          >
            View all {listings.length} listings →
          </Link>
        </div>
      )}
    </section>
  )
}
