'use client'

import { useState, useMemo } from 'react'
import {
  Check,
  X,
  Star,
  Sparkles,
  Camera,
  Video,
  Home,
  Plane,
  Image,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LISTING_PACKAGES, SQFT_TIERS, type SqftTierId, type ListingPackage } from '@/lib/pricing/config'
import { useBookingStore } from '@/stores/useBookingStore'

interface PackageSelectionProps {
  onSelect?: (packageKey: string, sqftTier: SqftTierId) => void
  className?: string
}

// Feature icons
const featureIcons: Record<string, typeof Camera> = {
  'Professional Photography': Camera,
  'Aerial/Drone Photography': Plane,
  'Zillow 3D Tour': Home,
  'Virtual Staging': Image,
  'Listing Video': Video,
  'Social Media Reel': Sparkles,
}

export function PackageSelection({ onSelect, className }: PackageSelectionProps) {
  const { formData, pricing, setPackage, nextStep } = useBookingStore()
  const [selectedSqft, setSelectedSqft] = useState<SqftTierId>(formData.sqftTier || 'lt2000')
  const [selectedPackage, setSelectedPackage] = useState<string | null>(formData.packageKey || null)
  const [hoveredPackage, setHoveredPackage] = useState<string | null>(null)

  // Calculate savings for each package
  const packageSavings = useMemo(() => {
    // A la carte value estimates (based on individual service prices)
    const alaCarteValues: Record<string, Record<SqftTierId, number>> = {
      essentials: {
        lt2000: 500, '2001_3500': 580, '3501_5000': 660, '5001_6500': 740, over6500: 880,
      },
      signature: {
        lt2000: 750, '2001_3500': 850, '3501_5000': 930, '5001_6500': 1010, over6500: 1150,
      },
      premier: {
        lt2000: 1100, '2001_3500': 1200, '3501_5000': 1350, '5001_6500': 1450, over6500: 1700,
      },
    }

    return LISTING_PACKAGES.reduce((acc, pkg) => {
      const alaCarteValue = alaCarteValues[pkg.key]?.[selectedSqft] || 0
      const packagePrice = pkg.pricing[selectedSqft]
      acc[pkg.key] = alaCarteValue - packagePrice
      return acc
    }, {} as Record<string, number>)
  }, [selectedSqft])

  const handlePackageSelect = (packageKey: string) => {
    setSelectedPackage(packageKey)
    setPackage(packageKey, selectedSqft)
    onSelect?.(packageKey, selectedSqft)
  }

  const handleContinue = () => {
    if (selectedPackage) {
      nextStep()
    }
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground md:text-3xl">
          Choose Your Package
        </h2>
        <p className="mt-2 text-muted-foreground">
          Professional media that sells homes faster
        </p>
      </div>

      {/* Square Footage Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Property Size (sq ft)</label>
        <div className="flex flex-wrap gap-2">
          {SQFT_TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => {
                setSelectedSqft(tier.id)
                if (selectedPackage) {
                  setPackage(selectedPackage, tier.id)
                }
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                selectedSqft === tier.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              )}
            >
              {tier.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {LISTING_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.key}
            package={pkg}
            sqftTier={selectedSqft}
            isSelected={selectedPackage === pkg.key}
            isHovered={hoveredPackage === pkg.key}
            savings={packageSavings[pkg.key]}
            onSelect={() => handlePackageSelect(pkg.key)}
            onHover={(hovered) => setHoveredPackage(hovered ? pkg.key : null)}
          />
        ))}
      </div>

      {/* Selected Package Summary */}
      {selectedPackage && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selected Package</p>
              <p className="text-lg font-semibold text-foreground">
                {LISTING_PACKAGES.find(p => p.key === selectedPackage)?.name} •{' '}
                ${LISTING_PACKAGES.find(p => p.key === selectedPackage)?.pricing[selectedSqft]}
              </p>
            </div>
            <Button onClick={handleContinue} size="lg">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>24-hour delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>MLS-ready</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>100% satisfaction</span>
        </div>
      </div>
    </div>
  )
}

interface PackageCardProps {
  package: ListingPackage
  sqftTier: SqftTierId
  isSelected: boolean
  isHovered: boolean
  savings: number
  onSelect: () => void
  onHover: (hovered: boolean) => void
}

function PackageCard({
  package: pkg,
  sqftTier,
  isSelected,
  isHovered,
  savings,
  onSelect,
  onHover,
}: PackageCardProps) {
  const price = pkg.pricing[sqftTier]
  const isRecommended = pkg.recommended

  // Key features to highlight
  const keyFeatures = pkg.features.filter(f =>
    ['Professional Photography', 'Aerial/Drone Photography', 'Zillow 3D Tour', 'Virtual Staging', 'Listing Video', 'Social Media Reel'].includes(f.name)
  )

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        'relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-500/5'
          : isHovered
          ? 'border-white/20 bg-white/[0.02]'
          : 'border-white/[0.08] bg-[#1c1c1e]',
        isRecommended && !isSelected && 'border-amber-500/50'
      )}
    >
      {/* Popular Badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <Star className="h-3 w-3" />
            Most Popular
          </div>
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {pkg.tagline}
        </p>
        <h3 className="mt-1 text-2xl font-bold text-foreground">{pkg.name}</h3>
        <div className="mt-3">
          <span className="text-4xl font-bold text-foreground">${price}</span>
        </div>
        {savings > 0 && (
          <p className="mt-1 text-sm text-green-400">
            Save ${savings} vs. à la carte
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="my-6 border-t border-white/[0.08]" />

      {/* Key Features */}
      <ul className="space-y-3">
        {keyFeatures.map((feature) => {
          const isIncluded = feature.level !== 'not-included'
          const Icon = featureIcons[feature.name] || Check

          return (
            <li key={feature.name} className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
                  isIncluded
                    ? feature.level === 'premium'
                      ? 'bg-amber-500/20'
                      : feature.level === 'enhanced'
                      ? 'bg-blue-500/20'
                      : 'bg-green-500/20'
                    : 'bg-neutral-500/20'
                )}
              >
                {isIncluded ? (
                  <Icon
                    className={cn(
                      'h-3 w-3',
                      feature.level === 'premium'
                        ? 'text-amber-400'
                        : feature.level === 'enhanced'
                        ? 'text-blue-400'
                        : 'text-green-400'
                    )}
                  />
                ) : (
                  <X className="h-3 w-3 text-neutral-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-sm',
                    isIncluded ? 'text-foreground' : 'text-neutral-500'
                  )}
                >
                  {feature.name}
                </span>
                {isIncluded && feature.value !== 'Included' && (
                  <span
                    className={cn(
                      'ml-1 text-xs',
                      feature.level === 'premium'
                        ? 'text-amber-400'
                        : feature.level === 'enhanced'
                        ? 'text-blue-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    • {feature.value}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* CTA */}
      <div className="mt-6">
        <Button
          variant={isSelected ? 'default' : 'outline'}
          className={cn(
            'w-full',
            isSelected && 'bg-blue-500 hover:bg-blue-600'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          {isSelected ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Selected
            </>
          ) : (
            'Select Package'
          )}
        </Button>
      </div>
    </div>
  )
}

// Compact Package Comparison Table
export function PackageComparisonTable({ sqftTier }: { sqftTier: SqftTierId }) {
  const allFeatures = LISTING_PACKAGES[0].features.map(f => f.name)

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.08] bg-[#1c1c1e]">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
              Feature
            </th>
            {LISTING_PACKAGES.map((pkg) => (
              <th key={pkg.key} className="px-4 py-3 text-center">
                <div className="text-sm font-semibold text-foreground">{pkg.name}</div>
                <div className="text-lg font-bold text-blue-400">
                  ${pkg.pricing[sqftTier]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map((featureName, i) => (
            <tr
              key={featureName}
              className={cn(
                'border-b border-white/[0.05]',
                i % 2 === 0 ? 'bg-[#0a0a0a]' : 'bg-[#0f0f0f]'
              )}
            >
              <td className="px-4 py-2.5 text-sm text-foreground">{featureName}</td>
              {LISTING_PACKAGES.map((pkg) => {
                const feature = pkg.features.find(f => f.name === featureName)
                const isIncluded = feature?.level !== 'not-included'
                return (
                  <td key={pkg.key} className="px-4 py-2.5 text-center">
                    {isIncluded ? (
                      <span
                        className={cn(
                          'text-sm',
                          feature?.level === 'premium' && 'text-amber-400 font-medium',
                          feature?.level === 'enhanced' && 'text-blue-400',
                          feature?.level === 'included' && 'text-green-400',
                          feature?.level === 'standard' && 'text-foreground',
                          feature?.level === 'basic' && 'text-muted-foreground'
                        )}
                      >
                        {feature?.value}
                      </span>
                    ) : (
                      <X className="mx-auto h-4 w-4 text-neutral-600" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
