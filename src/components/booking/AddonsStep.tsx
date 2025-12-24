'use client'

import { Plus, Minus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LISTING_ADDONS, type ListingAddon } from '@/lib/booking/config'
import { formatCurrency } from '@/lib/pricing/config'

interface SelectedAddon {
  id: string
  quantity?: number
}

interface AddonsStepProps {
  selectedAddons: SelectedAddon[]
  onToggleAddon: (addonId: string) => void
  onUpdateQuantity: (addonId: string, quantity: number) => void
  packageName: string
}

const CATEGORY_LABELS: Record<string, string> = {
  staging: 'Virtual Staging',
  photography: 'Photography',
  video: 'Video',
  delivery: 'Delivery',
}

export function AddonsStep({
  selectedAddons,
  onToggleAddon,
  onUpdateQuantity,
  packageName,
}: AddonsStepProps) {
  const categories = [...new Set(LISTING_ADDONS.map((a) => a.category))]

  const isAddonSelected = (addonId: string) =>
    selectedAddons.some((a) => a.id === addonId)

  const getAddonQuantity = (addonId: string) =>
    selectedAddons.find((a) => a.id === addonId)?.quantity || 1

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          Enhance Your {packageName} Package
        </h3>
        <p className="text-neutral-400">
          Add optional upgrades to make your listing stand out even more.
          <br />
          <span className="text-sm">All add-ons are optional - skip if you don&apos;t need them.</span>
        </p>
      </div>

      {categories.map((category) => {
        const categoryAddons = LISTING_ADDONS.filter((a) => a.category === category)

        return (
          <div key={category}>
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {categoryAddons.map((addon) => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSelected={isAddonSelected(addon.id)}
                  quantity={getAddonQuantity(addon.id)}
                  onToggle={() => onToggleAddon(addon.id)}
                  onUpdateQuantity={(qty) => onUpdateQuantity(addon.id, qty)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface AddonCardProps {
  addon: ListingAddon
  isSelected: boolean
  quantity: number
  onToggle: () => void
  onUpdateQuantity: (quantity: number) => void
}

function AddonCard({
  addon,
  isSelected,
  quantity,
  onToggle,
  onUpdateQuantity,
}: AddonCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col p-4 rounded-xl border-2 transition-all',
        isSelected
          ? 'bg-blue-500/10 border-blue-500'
          : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'
      )}
    >
      {addon.popular && (
        <div className="absolute -top-2 right-3 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Popular
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h5 className="font-medium text-white">{addon.name}</h5>
          <p className="text-sm text-neutral-400 mt-1">{addon.description}</p>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
          )}
        >
          {isSelected ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-bold text-white">{formatCurrency(addon.price)}</span>
          {addon.priceType === 'per_unit' && (
            <span className="text-neutral-500">/{addon.unit}</span>
          )}
        </div>

        {isSelected && addon.priceType === 'per_unit' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 flex items-center justify-center"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium text-white">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
