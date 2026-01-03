'use client'

import { cn } from '@/lib/utils'

// Agent logos/brands that trust us
const trustedBrands = [
  'Keller Williams',
  'RE/MAX',
  'Coldwell Banker',
  'Century 21',
  'eXp Realty',
  'Compass',
  "Sotheby's",
  'Berkshire Hathaway',
]

interface TrustBarProps {
  variant?: 'default' | 'compact'
}

export function TrustBar({ variant = 'default' }: TrustBarProps) {
  return (
    <section
      className={cn(
        'border-y border-white/[0.06]',
        variant === 'compact' ? 'py-8' : 'py-12'
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {trustedBrands.map((brand) => (
            <span
              key={brand}
              className="text-[13px] text-[#6a6765] tracking-wide"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
