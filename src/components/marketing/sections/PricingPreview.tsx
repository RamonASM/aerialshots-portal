'use client'

import Link from 'next/link'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'

const packages = [
  {
    name: 'Essentials',
    tagline: 'Perfect Start',
    price: 315,
    description: 'Everything you need to make a great first impression.',
    features: [
      'Professional HDR Photography',
      'Aerial/Drone Photography',
      'Zillow 3D Tour',
      '2D Floor Plans',
      'Virtual Staging (5 photos)',
      'Virtual Twilight',
    ],
    recommended: false,
    href: '/book/listing?package=essentials',
  },
  {
    name: 'Signature',
    tagline: 'Most Popular',
    price: 449,
    description: 'Complete media package with video for maximum impact.',
    features: [
      'Everything in Essentials',
      'Cinematic Listing Video',
      'Social Media Reel',
      'Agent Branding Options',
      'Rush Delivery Available',
    ],
    recommended: true,
    href: '/book/listing?package=signature',
  },
  {
    name: 'Premier',
    tagline: 'Luxury Experience',
    price: 649,
    description: 'The ultimate package for luxury and high-end listings.',
    features: [
      'Everything in Signature',
      '3D Floor Plans',
      'Signature Video Production',
      'Extended Drone Coverage',
      'Premium Virtual Staging',
      'Priority Scheduling',
    ],
    recommended: false,
    href: '/book/listing?package=premier',
  },
]

export function PricingPreview() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B]">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            Pricing
          </p>
          <h2 className="text-marketing-section text-white mb-4">
            Transparent, Simple Pricing
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            No hidden fees. Choose the package that fits your listing&apos;s needs.
            <span className="block mt-2 text-[14px] text-[#71717A]">
              Prices shown for homes under 2,000 sqft
            </span>
          </p>
        </div>

        {/* Pricing cards */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-6 lg:grid-cols-3"
        >
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative rounded-2xl p-6 sm:p-8 transition-all duration-700',
                pkg.recommended
                  ? 'bg-gradient-to-b from-[#141416] to-[#0A0A0B] border-2 border-[#00D4FF]/50 shadow-lg shadow-[#00D4FF]/10 lg:scale-105 lg:-my-4'
                  : 'glass-card-marketing',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: isVisible ? `${index * 150}ms` : '0ms' }}
            >
              {/* Recommended badge */}
              {pkg.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-black text-[11px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap font-marketing">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Package header */}
              <div className="text-center mb-6">
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#00D4FF] mb-2 font-marketing">
                  {pkg.tagline}
                </p>
                <h3 className="text-2xl font-bold text-white mb-3 font-marketing">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[13px] text-[#A1A1AA] font-marketing-body">$</span>
                  <span className="text-4xl font-bold text-white font-marketing">{pkg.price}</span>
                </div>
                <p className="text-[13px] text-[#71717A] mt-2 font-marketing-body">
                  {pkg.description}
                </p>
              </div>

              {/* Divider */}
              <div className={cn(
                'h-px w-full mb-6',
                pkg.recommended
                  ? 'bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent'
                  : 'bg-white/[0.08]'
              )} />

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={cn(
                      'flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center',
                      pkg.recommended
                        ? 'bg-[#00D4FF]/20'
                        : 'bg-white/[0.05]'
                    )}>
                      <Check className={cn(
                        'h-3 w-3',
                        pkg.recommended ? 'text-[#00D4FF]' : 'text-[#A1A1AA]'
                      )} />
                    </div>
                    <span className="text-[14px] text-[#A1A1AA] font-marketing-body">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={pkg.href}
                className={cn(
                  'flex items-center justify-center gap-2 w-full h-12 rounded-xl font-semibold transition-all font-marketing',
                  pkg.recommended
                    ? 'btn-marketing-primary'
                    : 'bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.08] hover:border-white/[0.15]'
                )}
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* View full pricing CTA */}
        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[#00D4FF] hover:text-[#33DDFF] transition-colors font-marketing"
          >
            View full pricing & add-ons
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
