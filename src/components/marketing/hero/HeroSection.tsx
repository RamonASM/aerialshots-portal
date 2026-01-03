'use client'

import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
  { value: '500+', label: 'Agents Served' },
  { value: '15K+', label: 'Properties Shot' },
  { value: '24hr', label: 'Turnaround' },
  { value: '5.0', label: 'Google Rating', icon: Star },
]

interface HeroSectionProps {
  variant?: 'default' | 'minimal'
}

export function HeroSection({ variant = 'default' }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background - subtle, minimal */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#A29991]/[0.03] rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="text-center">
          {/* Label */}
          <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-8 animate-fade-in">
            Central Florida Real Estate Media
          </p>

          {/* Headline - Serif, elegant */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.0] tracking-[-0.02em] mb-8 animate-fade-in-up animation-delay-100">
            Premium Media<br />
            That Sells Homes
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-[#B5ADA6] max-w-xl mx-auto mb-12 animate-fade-in-up animation-delay-200">
            Professional photography, drone, video, 3D tours, and virtual staging.
            Delivered in 24 hours.
          </p>

          {/* CTA Button - Single, prominent */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up animation-delay-300">
            <Link href="/book">
              <Button
                size="lg"
                className="h-14 px-10 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book Your Shoot
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button
                size="lg"
                variant="ghost"
                className="h-14 px-8 text-[15px] font-medium text-[#B5ADA6] hover:text-white"
              >
                View Portfolio
              </Button>
            </Link>
          </div>

          {/* Stats - Minimal, elegant */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-12 max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-medium text-white">{stat.value}</span>
                  {stat.icon && (
                    <stat.icon className="h-4 w-4 text-[#A29991] fill-[#A29991]" />
                  )}
                </div>
                <span className="text-[13px] text-[#8A847F] mt-1 block">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator - Subtle, no bounce */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#A29991]/30 to-transparent" />
      </div>
    </section>
  )
}
