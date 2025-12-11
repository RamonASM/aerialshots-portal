'use client'

import { Bed, Bath, Square, DollarSign, Calendar, MapPin } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']

interface PropertyDetailsProps {
  listing: Listing
  brandColor?: string
}

export function PropertyDetails({ listing, brandColor = '#ff4533' }: PropertyDetailsProps) {
  const stats = [
    {
      icon: Bed,
      value: listing.beds,
      label: listing.beds === 1 ? 'Bedroom' : 'Bedrooms',
      show: listing.beds !== null,
    },
    {
      icon: Bath,
      value: listing.baths,
      label: listing.baths === 1 ? 'Bathroom' : 'Bathrooms',
      show: listing.baths !== null,
    },
    {
      icon: Square,
      value: listing.sqft?.toLocaleString(),
      label: 'Sq Ft',
      show: listing.sqft !== null,
    },
  ]

  return (
    <section className="bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Address & Price */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-neutral-500">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {listing.city && `${listing.city}, `}
                {listing.state} {listing.zip}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-neutral-900 sm:text-3xl lg:text-4xl">
              {listing.address}
            </h1>
          </div>

          {listing.price && (
            <div className="flex-shrink-0">
              <div
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2"
                style={{ backgroundColor: brandColor + '15' }}
              >
                <DollarSign className="h-5 w-5" style={{ color: brandColor }} />
                <span
                  className="text-2xl font-bold sm:text-3xl"
                  style={{ color: brandColor }}
                >
                  {listing.price.toLocaleString()}
                </span>
              </div>
              {listing.status === 'sold' && (
                <p className="mt-1 text-right text-sm font-medium text-green-600">
                  SOLD
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="mt-6 flex flex-wrap gap-6 border-t border-neutral-200 pt-6">
          {stats
            .filter((stat) => stat.show)
            .map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="rounded-lg bg-neutral-100 p-2">
                  <stat.icon className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-neutral-900">{stat.value}</p>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                </div>
              </div>
            ))}

          {listing.dom !== null && listing.dom > 0 && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-neutral-100 p-2">
                <Calendar className="h-5 w-5 text-neutral-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-neutral-900">{listing.dom}</p>
                <p className="text-sm text-neutral-500">Days on Market</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
