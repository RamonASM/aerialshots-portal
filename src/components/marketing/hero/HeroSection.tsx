'use client'

import Link from 'next/link'
import { ArrowRight, Star, Award } from 'lucide-react'

const stats = [
  { value: '500+', label: 'Agents' },
  { value: '15K+', label: 'Properties' },
  { value: '24hr', label: 'Delivery' },
  { value: '5.0', label: 'Rating', icon: Star },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0B]">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        {/* Primary mesh gradient */}
        <div className="absolute inset-0 gradient-mesh-animated opacity-80" />

        {/* Radial spotlight effects */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#00D4FF]/[0.08] rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#7C3AED]/[0.06] rounded-full blur-[100px] animate-float animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF6B35]/[0.04] rounded-full blur-[150px]" />

        {/* Subtle grain overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0A0A0B] to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] mb-8 animate-fade-in backdrop-blur-sm">
            <Award className="h-4 w-4 text-[#00D4FF]" />
            <span className="text-[13px] font-medium text-white/90 font-marketing-body">
              Central Florida&apos;s #1 Zillow Showcase Certified
            </span>
          </div>

          {/* Headline - Bold, impactful */}
          <h1 className="text-marketing-hero text-white mb-6 animate-fade-in-up animation-delay-100">
            Media That<br />
            <span className="text-gradient-hero">Sells Homes</span>
          </h1>

          {/* Subheadline */}
          <p className="text-marketing-subhead max-w-xl mx-auto mb-10 animate-fade-in-up animation-delay-200">
            Professional photography, drone, video, 3D tours, and virtual staging.
            Delivered in 24 hours.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-300">
            <Link href="/book">
              <button
                className="h-14 px-8 btn-marketing-primary font-marketing flex items-center gap-2 text-base"
              >
                Book Your Shoot
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/portfolio">
              <button
                className="h-14 px-8 btn-marketing-ghost font-marketing text-base"
              >
                View Portfolio
              </button>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-8 sm:gap-12 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm animate-fade-in-up animation-delay-400">
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="stat-number">{stat.value}</span>
                    {stat.icon && (
                      <stat.icon className="h-4 w-4 text-[#FFB800] fill-[#FFB800]" />
                    )}
                  </div>
                  <span className="stat-label block mt-0.5">{stat.label}</span>
                </div>
                {index < stats.length - 1 && (
                  <div className="hidden sm:block w-px h-10 bg-white/[0.08] ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-fade-in animation-delay-700">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#A1A1AA] font-marketing-body">
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-[#00D4FF]/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}
