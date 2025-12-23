'use client'

import { Bed, Bath, Square, DollarSign, Calendar, MapPin } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']

interface PropertyDetailsProps {
  listing: Listing
  brandColor?: string
}

export function PropertyDetails({ listing, brandColor = '#0077ff' }: PropertyDetailsProps) {
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
    <section className="bg-[#0a0a0a] py-8 border-b border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Address & Price */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#636366]">
              <MapPin className="h-4 w-4" />
              <span className="text-[13px]">
                {listing.city && `${listing.city}, `}
                {listing.state} {listing.zip}
              </span>
            </div>
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-white sm:text-[34px] lg:text-[44px]">
              {listing.address}
            </h1>
          </div>

          {listing.price && (
            <div className="flex-shrink-0">
              <div
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border"
                style={{
                  backgroundColor: brandColor + '15',
                  borderColor: brandColor + '30'
                }}
              >
                <DollarSign className="h-5 w-5" style={{ color: brandColor }} />
                <span
                  className="text-[22px] font-semibold sm:text-[28px]"
                  style={{ color: brandColor }}
                >
                  {listing.price.toLocaleString()}
                </span>
              </div>
              {listing.status === 'sold' && (
                <p className="mt-2 text-right text-[11px] font-medium text-green-400 uppercase tracking-wider">
                  SOLD
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="mt-6 flex flex-wrap gap-4 border-t border-white/[0.08] pt-6">
          {stats
            .filter((stat) => stat.show)
            .map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-2.5">
                  <stat.icon className="h-5 w-5 text-[#a1a1a6]" />
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-white">{stat.value}</p>
                  <p className="text-[13px] text-[#636366]">{stat.label}</p>
                </div>
              </div>
            ))}

          {listing.dom !== null && listing.dom > 0 && (
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-2.5">
                <Calendar className="h-5 w-5 text-[#a1a1a6]" />
              </div>
              <div>
                <p className="text-[17px] font-semibold text-white">{listing.dom}</p>
                <p className="text-[13px] text-[#636366]">Days on Market</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
