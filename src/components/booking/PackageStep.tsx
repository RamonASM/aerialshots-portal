'use client'

import { Check, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LISTING_PACKAGES, SQFT_TIERS, formatCurrency, type SqftTierId } from '@/lib/pricing/config'

interface PackageStepProps {
  selectedPackage: string | null
  selectedSqft: SqftTierId
  onPackageSelect: (key: string) => void
  onSqftSelect: (sqft: SqftTierId) => void
}

export function PackageStep({
  selectedPackage,
  selectedSqft,
  onPackageSelect,
  onSqftSelect,
}: PackageStepProps) {
  return (
    <div className="space-y-8">
      {/* Sqft Selection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Property Size</h3>
        <div className="flex flex-wrap gap-2">
          {SQFT_TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => onSqftSelect(tier.id)}
              className={cn(
                'px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2',
                selectedSqft === tier.id
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:border-neutral-500'
              )}
            >
              {tier.label} sqft
            </button>
          ))}
        </div>
      </div>

      {/* Package Selection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Select Package</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {LISTING_PACKAGES.map((pkg) => {
            const price = pkg.pricing[selectedSqft]
            const isSelected = selectedPackage === pkg.key
            const includedFeatures = pkg.features.filter(
              (f) => f.level !== 'not-included'
            )

            return (
              <button
                key={pkg.key}
                onClick={() => onPackageSelect(pkg.key)}
                className={cn(
                  'relative flex flex-col p-5 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500'
                    : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
                )}
              >
                {pkg.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    {pkg.tagline}
                  </p>
                  <h4 className="text-xl font-bold text-white">{pkg.name}</h4>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(price)}
                  </span>
                </div>

                <ul className="space-y-2 flex-1">
                  {includedFeatures.slice(0, 6).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          'w-4 h-4 mt-0.5 flex-shrink-0',
                          feature.level === 'premium'
                            ? 'text-amber-400'
                            : feature.level === 'enhanced'
                            ? 'text-blue-400'
                            : 'text-green-400'
                        )}
                      />
                      <span className="text-neutral-300">
                        {feature.name}
                        {feature.value !== 'Included' &&
                          feature.value !== '-' && (
                            <span className="text-neutral-500">
                              {' '}
                              ({feature.value})
                            </span>
                          )}
                      </span>
                    </li>
                  ))}
                </ul>

                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
