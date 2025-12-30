'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// Agent logos/brands that trust us - using placeholder for now
const trustedBrands = [
  { name: 'Keller Williams', logo: '/logos/kw.svg' },
  { name: 'RE/MAX', logo: '/logos/remax.svg' },
  { name: 'Coldwell Banker', logo: '/logos/coldwell.svg' },
  { name: 'Century 21', logo: '/logos/century21.svg' },
  { name: 'eXp Realty', logo: '/logos/exp.svg' },
  { name: 'Compass', logo: '/logos/compass.svg' },
  { name: 'Sothebys', logo: '/logos/sothebys.svg' },
  { name: 'Berkshire Hathaway', logo: '/logos/berkshire.svg' },
]

interface TrustBarProps {
  variant?: 'default' | 'compact'
  showHeadline?: boolean
}

export function TrustBar({ variant = 'default', showHeadline = true }: TrustBarProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        variant === 'compact' ? 'py-8 border-y border-white/[0.08]' : 'py-16'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {showHeadline && (
          <p
            className={cn(
              'text-center text-[14px] text-[#8e8e93] mb-8 transition-all duration-700',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            Trusted by agents at top brokerages across Central Florida
          </p>
        )}

        {/* Logo marquee */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div
            className={cn(
              'flex gap-12 items-center transition-opacity duration-700',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {/* First set */}
            <div className="flex gap-12 items-center animate-marquee">
              {trustedBrands.map((brand) => (
                <div
                  key={brand.name}
                  className="flex items-center justify-center h-12 w-32 shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                >
                  {/* Placeholder text until logos are added */}
                  <span className="text-[14px] font-medium text-[#636366] whitespace-nowrap">
                    {brand.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Duplicate for seamless loop */}
            <div className="flex gap-12 items-center animate-marquee" aria-hidden>
              {trustedBrands.map((brand) => (
                <div
                  key={`${brand.name}-dup`}
                  className="flex items-center justify-center h-12 w-32 shrink-0 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                >
                  <span className="text-[14px] font-medium text-[#636366] whitespace-nowrap">
                    {brand.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
