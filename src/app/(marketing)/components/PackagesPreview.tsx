'use client'

import Link from 'next/link'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const packages = [
  {
    name: 'Essentials',
    price: 315,
    description: 'Everything you need to list faster',
    features: [
      'HDR Photography (25-40 photos)',
      'Aerial Drone Photos',
      'Zillow 3D Home Tour',
      '2D Floor Plan',
      '1 Virtual Staging Photo',
      'Virtual Twilight Photo',
    ],
    popular: false,
    href: '/book?package=essentials',
  },
  {
    name: 'Signature',
    price: 449,
    description: 'Most popular for top producers',
    features: [
      'Everything in Essentials',
      'Listing Video (60-90 sec)',
      'Social Media Clips',
      'Agent Branding',
      'Rush Editing Available',
      'MLS-Ready Formats',
    ],
    popular: true,
    href: '/book?package=signature',
  },
  {
    name: 'Premier',
    price: 649,
    description: 'Luxury listings deserve more',
    features: [
      'Everything in Signature',
      '3D Interactive Floor Plan',
      'Cinematic Property Film',
      'Twilight Photography',
      'Extended Drone Coverage',
      'Priority 12-Hour Delivery',
    ],
    popular: false,
    href: '/book?package=premier',
  },
]

export function PackagesPreview() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-display-lg text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            Choose a package or build your own with à la carte services
          </p>
        </div>

        {/* Packages grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-6 lg:grid-cols-3"
        >
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative rounded-2xl border p-8 transition-all duration-700',
                pkg.popular
                  ? 'border-[#0077ff] bg-[#0077ff]/5 scale-[1.02]'
                  : 'border-white/[0.08] bg-[#0a0a0a] hover:border-white/[0.16]',
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              )}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
              }}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0077ff] px-4 py-1 text-[12px] font-semibold text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Package name */}
              <h3 className="text-[20px] font-semibold text-white mb-2">
                {pkg.name}
              </h3>
              <p className="text-[14px] text-[#8e8e93] mb-6">
                {pkg.description}
              </p>

              {/* Price */}
              <div className="mb-8">
                <span className="text-[42px] font-bold text-white">
                  ${pkg.price}
                </span>
                <span className="text-[14px] text-[#8e8e93] ml-2">
                  per property
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-[14px] text-[#a1a1a6]"
                  >
                    <Check className="h-5 w-5 text-[#34c759] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={pkg.href} className="block">
                <Button
                  className={cn(
                    'w-full h-12 text-[15px] font-medium rounded-xl',
                    pkg.popular
                      ? 'bg-[#0077ff] hover:bg-[#0062cc] text-white'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08]'
                  )}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-12 text-center">
          <p className="text-[14px] text-[#8e8e93]">
            Need something custom?{' '}
            <Link href="/pricing" className="text-[#0077ff] hover:underline">
              View all services and à la carte pricing
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
