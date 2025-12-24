'use client'

import { SQFT_TIERS, type SqftTierId } from '@/lib/pricing/config'
import { cn } from '@/lib/utils'

interface SqftSelectorProps {
  selected: SqftTierId
  onChange: (tier: SqftTierId) => void
  className?: string
}

export function SqftSelector({ selected, onChange, className }: SqftSelectorProps) {
  return (
    <div className={cn('w-full', className)}>
      <p className="text-sm font-medium text-neutral-400 mb-3 text-center uppercase tracking-wider">
        Select Home Size
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SQFT_TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => onChange(tier.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'border-2',
              selected === tier.id
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-neutral-800/50 border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800'
            )}
          >
            <span className="hidden sm:inline">{tier.label}</span>
            <span className="sm:hidden">{tier.shortLabel}</span>
            <span className="text-xs text-neutral-500 ml-1">sqft</span>
          </button>
        ))}
      </div>
    </div>
  )
}
