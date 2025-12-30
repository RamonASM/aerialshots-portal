/**
 * Themed Property Details
 *
 * Property info section that adapts to the current theme
 */

'use client'

import { Bed, Bath, Square, DollarSign, Calendar, MapPin } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import type { Theme } from '@/lib/themes/property/themes'

type Listing = Database['public']['Tables']['listings']['Row']

interface ThemedPropertyDetailsProps {
  listing: Listing
  theme: Theme
  brandColor?: string
}

export function ThemedPropertyDetails({
  listing,
  theme,
  brandColor,
}: ThemedPropertyDetailsProps) {
  // Use brand color if provided, otherwise use theme primary
  const accentColor = brandColor || theme.colors.primary

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
    <section
      className="py-8"
      style={{
        backgroundColor: theme.colors.backgroundSecondary,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <div
        className="mx-auto px-4 sm:px-6 lg:px-8"
        style={{ maxWidth: theme.layout.containerWidth }}
      >
        {/* Address & Price */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div
              className="flex items-center gap-2"
              style={{ color: theme.colors.textMuted }}
            >
              <MapPin className="h-4 w-4" />
              <span className="text-[13px]">
                {listing.city && `${listing.city}, `}
                {listing.state} {listing.zip}
              </span>
            </div>
            <h1
              className="mt-2 text-[28px] sm:text-[34px] lg:text-[44px]"
              style={{
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamily,
                fontWeight: theme.typography.headingWeight,
                letterSpacing: theme.typography.letterSpacing,
              }}
            >
              {listing.address}
            </h1>
          </div>

          {listing.price && (
            <div className="flex-shrink-0">
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5"
                style={{
                  backgroundColor: `${accentColor}15`,
                  border: `1px solid ${accentColor}30`,
                  borderRadius: theme.layout.cardRadius,
                }}
              >
                <DollarSign
                  className="h-5 w-5"
                  style={{ color: accentColor }}
                />
                <span
                  className="text-[22px] sm:text-[28px]"
                  style={{
                    color: accentColor,
                    fontWeight: theme.typography.headingWeight,
                  }}
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
        <div
          className="mt-6 flex flex-wrap gap-4 pt-6"
          style={{ borderTop: `1px solid ${theme.colors.border}` }}
        >
          {stats
            .filter((stat) => stat.show)
            .map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div
                  className="p-2.5"
                  style={{
                    backgroundColor:
                      theme.id === 'minimal'
                        ? theme.colors.backgroundSecondary
                        : theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.layout.cardRadius,
                  }}
                >
                  <stat.icon
                    className="h-5 w-5"
                    style={{ color: theme.colors.textSecondary }}
                  />
                </div>
                <div>
                  <p
                    className="text-[17px]"
                    style={{
                      color: theme.colors.text,
                      fontWeight: theme.typography.headingWeight,
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-[13px]"
                    style={{ color: theme.colors.textMuted }}
                  >
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}

          {listing.dom !== null && listing.dom > 0 && (
            <div className="flex items-center gap-3">
              <div
                className="p-2.5"
                style={{
                  backgroundColor:
                    theme.id === 'minimal'
                      ? theme.colors.backgroundSecondary
                      : theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.layout.cardRadius,
                }}
              >
                <Calendar
                  className="h-5 w-5"
                  style={{ color: theme.colors.textSecondary }}
                />
              </div>
              <div>
                <p
                  className="text-[17px]"
                  style={{
                    color: theme.colors.text,
                    fontWeight: theme.typography.headingWeight,
                  }}
                >
                  {listing.dom}
                </p>
                <p
                  className="text-[13px]"
                  style={{ color: theme.colors.textMuted }}
                >
                  Days on Market
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
