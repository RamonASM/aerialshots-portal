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
  // Duplicate for seamless loop
  const allBrands = [...trustedBrands, ...trustedBrands]

  return (
    <section
      className={cn(
        'border-y border-white/[0.06] overflow-hidden bg-[#0A0A0B]',
        variant === 'compact' ? 'py-6' : 'py-10'
      )}
    >
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0A0B] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0A0B] to-transparent z-10" />

        {/* Scrolling container */}
        <div className="flex animate-logo-scroll">
          {allBrands.map((brand, index) => (
            <div
              key={`${brand}-${index}`}
              className="flex-shrink-0 px-8 sm:px-12"
            >
              <span
                className={cn(
                  'text-[14px] sm:text-[15px] font-medium whitespace-nowrap logo-grayscale',
                  'transition-all duration-300 cursor-default',
                  'font-marketing-body'
                )}
              >
                {brand}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center mt-6">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#A1A1AA]/60 font-marketing-body">
          Trusted by 500+ Central Florida agents
        </p>
      </div>
    </section>
  )
}
