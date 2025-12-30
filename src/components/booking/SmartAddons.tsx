'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Minus,
  Sparkles,
  Image,
  Video,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LISTING_ADDONS, type ListingAddon } from '@/lib/booking/config'
import { useBookingStore } from '@/stores/useBookingStore'

interface SmartAddonsProps {
  onContinue?: () => void
  className?: string
}

// Category configuration
const categories = [
  { id: 'staging', label: 'Virtual Staging', icon: Image },
  { id: 'photography', label: 'Photography', icon: Image },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'delivery', label: 'Delivery', icon: Zap },
] as const

// Smart recommendations based on package and property
function getRecommendations(
  packageKey: string,
  sqft?: number,
  propertyPrice?: number
): string[] {
  const recommendations: string[] = []

  // Always recommend rush delivery for urgency
  recommendations.push('rush-delivery')

  // If essentials package, recommend video add-ons
  if (packageKey === 'essentials') {
    recommendations.push('aerial-video', 'social-reel')
  }

  // For signature, recommend social reel
  if (packageKey === 'signature') {
    recommendations.push('social-reel')
  }

  // Premium staging for higher-end properties
  if (propertyPrice && propertyPrice > 500000) {
    recommendations.push('premium-staging')
  }

  // Extra twilight for larger homes
  if (sqft && sqft > 3500) {
    recommendations.push('extra-twilight')
  }

  return recommendations
}

export function SmartAddons({ onContinue, className }: SmartAddonsProps) {
  const {
    formData,
    pricing,
    toggleAddon,
    setAddonQuantity,
    nextStep,
  } = useBookingStore()

  // Get selected addons from formData
  const selectedAddons = formData.addons || []

  const [activeCategory, setActiveCategory] = useState<typeof categories[number]['id']>('staging')

  // Get smart recommendations
  const recommendations = useMemo(
    () => getRecommendations(formData.packageKey || 'signature'),
    [formData.packageKey]
  )

  // Filter add-ons by category
  const categoryAddons = useMemo(
    () => LISTING_ADDONS.filter((a) => a.category === activeCategory),
    [activeCategory]
  )

  // Recommended add-ons section
  const recommendedAddons = useMemo(
    () => LISTING_ADDONS.filter((a) => recommendations.includes(a.id) && !selectedAddons.some(s => s.id === a.id)),
    [recommendations, selectedAddons]
  )

  const handleAddAddon = useCallback((addon: ListingAddon) => {
    toggleAddon(addon.id)
    if (addon.priceType === 'per_unit') {
      setAddonQuantity(addon.id, 1)
    }
  }, [toggleAddon, setAddonQuantity])

  const handleRemoveAddon = useCallback((addonId: string) => {
    toggleAddon(addonId)
  }, [toggleAddon])

  const handleQuantityChange = useCallback((addonId: string, quantity: number) => {
    if (quantity <= 0) {
      toggleAddon(addonId)
    } else {
      setAddonQuantity(addonId, quantity)
    }
  }, [toggleAddon, setAddonQuantity])

  const handleContinue = () => {
    nextStep()
    onContinue?.()
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Enhance Your Package</h2>
        <p className="mt-1 text-muted-foreground">
          Add services to make your listing stand out
        </p>
      </div>

      {/* Smart Recommendations */}
      {recommendedAddons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <Sparkles className="h-4 w-4" />
            Recommended for you
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recommendedAddons.slice(0, 2).map((addon) => (
              <RecommendedAddonCard
                key={addon.id}
                addon={addon}
                onAdd={() => handleAddAddon(addon)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                activeCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Add-ons Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {categoryAddons.map((addon) => {
          const selected = selectedAddons.find((s) => s.id === addon.id)
          return (
            <AddonCard
              key={addon.id}
              addon={addon}
              isSelected={!!selected}
              quantity={selected?.quantity}
              onAdd={() => handleAddAddon(addon)}
              onRemove={() => handleRemoveAddon(addon.id)}
              onQuantityChange={(qty) => handleQuantityChange(addon.id, qty)}
              isRecommended={recommendations.includes(addon.id)}
            />
          )
        })}
      </div>

      {/* Selected Add-ons Summary */}
      {selectedAddons.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Selected Add-ons</span>
            <span className="text-sm font-semibold text-green-400">
              +${pricing.addonsTotal}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAddons.map((selected) => {
              const addon = LISTING_ADDONS.find((a) => a.id === selected.id)
              if (!addon) return null
              return (
                <div
                  key={selected.id}
                  className="flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1"
                >
                  <span className="text-sm text-blue-400">{addon.name}</span>
                  {selected.quantity && selected.quantity > 1 && (
                    <span className="text-xs text-blue-300">x{selected.quantity}</span>
                  )}
                  <button
                    onClick={() => handleRemoveAddon(selected.id)}
                    className="text-blue-400/60 hover:text-blue-400"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Total</p>
          <p className="text-2xl font-bold text-foreground">${pricing.total}</p>
        </div>
        <Button onClick={handleContinue} size="lg">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Skip option */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip add-ons for now
        </button>
      </div>
    </div>
  )
}

interface AddonCardProps {
  addon: ListingAddon
  isSelected: boolean
  quantity?: number
  onAdd: () => void
  onRemove: () => void
  onQuantityChange: (qty: number) => void
  isRecommended?: boolean
}

function AddonCard({
  addon,
  isSelected,
  quantity,
  onAdd,
  onRemove,
  onQuantityChange,
  isRecommended,
}: AddonCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-white/[0.08] bg-[#1c1c1e] hover:border-white/20'
      )}
    >
      {/* Popular Badge */}
      {addon.popular && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-black">
            <TrendingUp className="h-2.5 w-2.5" />
            Popular
          </div>
        </div>
      )}

      {/* Recommended Badge */}
      {isRecommended && !addon.popular && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center gap-1 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Sparkles className="h-2.5 w-2.5" />
            For you
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{addon.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {addon.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">
              ${addon.price}
            </span>
            {addon.priceType === 'per_unit' && addon.unit && (
              <span className="text-xs text-muted-foreground">/{addon.unit}</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          {isSelected ? (
            addon.priceType === 'per_unit' ? (
              // Quantity controls for per-unit add-ons
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuantityChange((quantity || 1) - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-medium">{quantity || 1}</span>
                <button
                  onClick={() => onQuantityChange((quantity || 1) + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              // Remove button for flat-price add-ons
              <button
                onClick={onRemove}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                <Minus className="h-4 w-4" />
              </button>
            )
          ) : (
            // Add button
            <button
              onClick={onAdd}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface RecommendedAddonCardProps {
  addon: ListingAddon
  onAdd: () => void
}

function RecommendedAddonCard({ addon, onAdd }: RecommendedAddonCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h4 className="font-medium text-foreground">{addon.name}</h4>
          <p className="text-sm text-amber-400">${addon.price}</p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onAdd}
        className="bg-amber-500 hover:bg-amber-600 text-black"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  )
}
