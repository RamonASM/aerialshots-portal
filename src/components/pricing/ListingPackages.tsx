'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, ArrowRight } from 'lucide-react'
import {
  LISTING_PACKAGES,
  SQFT_TIERS,
  formatCurrency,
  getPackagePrice,
  getLowestPrice,
  type SqftTierId,
  type FeatureLevel,
} from '@/lib/pricing/config'
import { SqftSelector } from './SqftSelector'
import { cn } from '@/lib/utils'

// Key features to show on package cards (subset of full features)
const KEY_FEATURES = [
  'Professional Photography',
  'Aerial/Drone Photography',
  'Zillow 3D Tour',
  '2D Floor Plans',
  'Virtual Staging',
  'Virtual Twilights',
  'Listing Video',
  'Social Media Reel',
  '3D Floor Plans',
]

function FeatureIcon({ level }: { level: FeatureLevel }) {
  if (level === 'not-included') {
    return <X className="w-4 h-4 text-neutral-600" />
  }
  return <Check className={cn(
    'w-4 h-4',
    level === 'premium' ? 'text-amber-400' :
    level === 'enhanced' ? 'text-blue-400' :
    'text-green-400'
  )} />
}

export function ListingPackages() {
  const [selectedTier, setSelectedTier] = useState<SqftTierId>('lt2000')

  return (
    <div className="space-y-8">
      {/* Sqft Selector */}
      <SqftSelector
        selected={selectedTier}
        onChange={setSelectedTier}
      />

      {/* Package Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LISTING_PACKAGES.map((pkg) => {
          const price = getPackagePrice(pkg, selectedTier)
          const lowestPrice = getLowestPrice(pkg)
          const keyFeatures = pkg.features.filter(f => KEY_FEATURES.includes(f.name))

          return (
            <div
              key={pkg.key}
              className={cn(
                'relative rounded-2xl border-2 p-6 transition-all',
                pkg.recommended
                  ? 'bg-blue-500/5 border-blue-500 shadow-lg shadow-blue-500/10'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
              )}
            >
              {/* Recommended Badge */}
              {pkg.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
                  {pkg.tagline}
                </p>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">
                    {formatCurrency(price)}
                  </span>
                </div>
                {selectedTier === 'lt2000' && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Starting price for homes under 2,000 sqft
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {keyFeatures.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex items-center gap-3"
                  >
                    <FeatureIcon level={feature.level} />
                    <span className={cn(
                      'text-sm',
                      feature.level === 'not-included'
                        ? 'text-neutral-600'
                        : 'text-neutral-300'
                    )}>
                      {feature.name}
                      {feature.level !== 'not-included' && feature.value !== 'Included' && (
                        <span className="text-neutral-500 ml-1">
                          ({feature.value})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link
                href={`/book/listing?package=${pkg.key}&sqft=${selectedTier}`}
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold transition-all',
                  pkg.recommended
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                )}
              >
                Book Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )
        })}
      </div>

      {/* Photo-Only Option */}
      <div className="mt-8 p-6 bg-neutral-900/50 rounded-xl border border-neutral-800 text-center">
        <h4 className="text-lg font-semibold text-white mb-2">
          Just Need Photos?
        </h4>
        <p className="text-neutral-400 text-sm mb-3">
          Photo-only packages available from <span className="text-white font-semibold">$175</span>
        </p>
        <Link
          href="/book/listing"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View all options
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
