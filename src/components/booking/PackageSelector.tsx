'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LISTING_PACKAGES, SQFT_TIERS, formatCurrency, type SqftTierId } from '@/lib/pricing/config'

interface PackageSelectorProps {
  selectedPackage: string | null
  selectedSqft: SqftTierId
  onPackageSelect: (key: string) => void
  onSqftSelect: (sqft: SqftTierId) => void
}

export function PackageSelector({
  selectedPackage,
  selectedSqft,
  onPackageSelect,
  onSqftSelect,
}: PackageSelectorProps) {
  return (
    <div className="space-y-12">
      {/* Property Size Selection */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
          Property Size
        </p>
        <p className="text-[14px] text-[#8A847F] mb-6">
          Select your property size for accurate pricing.
        </p>
        <div className="flex flex-wrap gap-2">
          {SQFT_TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => onSqftSelect(tier.id)}
              className={cn(
                'px-5 py-3 text-[14px] font-medium transition-all border',
                selectedSqft === tier.id
                  ? 'bg-[#A29991] border-[#A29991] text-black'
                  : 'bg-transparent border-white/[0.12] text-white hover:border-white/[0.24]'
              )}
            >
              {tier.label} sqft
            </button>
          ))}
        </div>
      </div>

      {/* Package Selection */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
          Select Package
        </p>
        <p className="text-[14px] text-[#8A847F] mb-6">
          Choose the package that best fits your listing needs.
        </p>

        <div className="grid lg:grid-cols-3 gap-px bg-white/[0.06]">
          {LISTING_PACKAGES.map((pkg, index) => {
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
                  'relative flex flex-col p-8 text-left transition-all bg-black',
                  isSelected && 'bg-[#A29991]/[0.04]'
                )}
              >
                {/* Popular badge */}
                {pkg.recommended && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-[#A29991]" />
                )}

                {/* Package number */}
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4">
                  0{index + 1}
                </span>

                {/* Package name & tagline */}
                <div className="mb-6">
                  <h3 className="font-serif text-2xl text-white mb-1">{pkg.name}</h3>
                  <p className="text-[13px] text-[#8A847F]">{pkg.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <span className="font-serif text-4xl text-white">
                    {formatCurrency(price)}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {includedFeatures.slice(0, 6).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px]">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 mt-2 shrink-0',
                          feature.level === 'premium'
                            ? 'bg-[#A29991]'
                            : feature.level === 'enhanced'
                            ? 'bg-[#B5ADA6]'
                            : 'bg-[#6a6765]'
                        )}
                      />
                      <span className="text-[#B5ADA6]">
                        {feature.name}
                        {feature.value !== 'Included' &&
                          feature.value !== '-' && (
                            <span className="text-[#6a6765]"> ({feature.value})</span>
                          )}
                      </span>
                    </li>
                  ))}

                  {includedFeatures.length > 6 && (
                    <li className="text-[13px] text-[#6a6765] pl-4">
                      +{includedFeatures.length - 6} more features
                    </li>
                  )}
                </ul>

                {/* Selection indicator */}
                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                  <div
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 border transition-colors',
                      isSelected
                        ? 'bg-[#A29991] border-[#A29991] text-black'
                        : 'bg-transparent border-white/[0.12] text-white hover:border-white/[0.24]'
                    )}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    <span className="text-[14px] font-medium">
                      {isSelected ? 'Selected' : 'Select Package'}
                    </span>
                  </div>
                </div>

                {/* Recommended label */}
                {pkg.recommended && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-[#A29991] text-black text-[10px] uppercase tracking-[0.15em] font-medium">
                      Most Popular
                    </span>
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
