'use client'

import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
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
    <section className="py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-4">
            Pricing
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl text-white mb-4">
            Simple, Transparent
          </h2>
          <p className="text-[15px] text-[#8A847F] max-w-md mx-auto">
            Choose a package or build your own
          </p>
        </div>

        {/* Packages grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-8 lg:grid-cols-3"
        >
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative border p-8 transition-all duration-700',
                pkg.popular
                  ? 'border-[#A29991]/40 bg-[#A29991]/[0.03]'
                  : 'border-white/[0.06] bg-[#0a0a0a] hover:border-white/[0.12]',
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
                <div className="absolute -top-3 left-8">
                  <span className="text-xs uppercase tracking-wider text-[#A29991] font-medium">
                    Popular
                  </span>
                </div>
              )}

              {/* Package name */}
              <h3 className="text-lg font-medium text-white mb-2">
                {pkg.name}
              </h3>
              <p className="text-[13px] text-[#8A847F] mb-6">
                {pkg.description}
              </p>

              {/* Price */}
              <div className="mb-8">
                <span className="text-4xl font-medium text-white">
                  ${pkg.price}
                </span>
                <span className="text-[14px] text-[#8A847F] ml-2">
                  per property
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-[14px] text-[#B5ADA6]"
                  >
                    <Check className="h-4 w-4 text-[#A29991] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={pkg.href} className="block">
                <Button
                  className={cn(
                    'w-full h-12 text-[14px] font-medium',
                    pkg.popular
                      ? 'bg-[#A29991] hover:bg-[#B5ADA6] text-black'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.06]'
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
          <p className="text-[14px] text-[#8A847F]">
            Need something custom?{' '}
            <Link href="/pricing" className="text-[#A29991] hover:text-white transition-colors">
              View all services
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
