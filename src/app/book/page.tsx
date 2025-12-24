'use client'

import Link from 'next/link'
import { Camera, Video, ArrowRight, Check } from 'lucide-react'
import { LISTING_PACKAGES, RETAINER_PACKAGES, formatCurrency } from '@/lib/pricing/config'

export default function BookPage() {
  const listingStartPrice = Math.min(...LISTING_PACKAGES.map(p => p.pricing.lt2000))
  const retainerStartPrice = Math.min(...RETAINER_PACKAGES.map(p => p.price))

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Book Your Shoot
          </h1>
          <p className="text-lg text-neutral-400">
            Professional real estate media with transparent pricing.
            <br />
            Choose your service to get started.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Listing Media */}
          <Link
            href="/book/listing"
            className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all"
          >
            <div className="absolute top-4 right-4">
              <ArrowRight className="w-5 h-5 text-neutral-500 group-hover:text-blue-400 transition-colors" />
            </div>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-500/10 mb-6">
              <Camera className="w-7 h-7 text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Listing Media</h2>
            <p className="text-neutral-400 mb-6">
              Per-property photography, video, 3D tours, and more.
              Perfect for individual listings.
            </p>

            <div className="text-sm text-neutral-500 mb-4">
              Starting from{' '}
              <span className="text-xl font-bold text-white">
                {formatCurrency(listingStartPrice)}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {[
                'Professional Photography',
                'Aerial/Drone Shots',
                'Zillow 3D Tour',
                'Floor Plans & Virtual Staging',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-neutral-300">
                  <Check className="w-4 h-4 text-blue-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-800">
              <span className="inline-flex items-center gap-2 text-blue-400 font-medium group-hover:gap-3 transition-all">
                Book Now <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>

          {/* Content Retainer */}
          <div className="relative bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 opacity-70">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/10 mb-6">
              <Video className="w-7 h-7 text-purple-400" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Content Retainer</h2>
            <p className="text-neutral-400 mb-6">
              Monthly video subscription for consistent social media content
              and personal branding.
            </p>

            <div className="text-sm text-neutral-500 mb-4">
              Starting from{' '}
              <span className="text-xl font-bold text-white">
                {formatCurrency(retainerStartPrice)}
              </span>
              <span className="text-neutral-500">/mo</span>
            </div>

            <div className="space-y-2 text-sm">
              {[
                '8-20 Videos Per Month',
                '2-4 Shoot Days',
                'Scripts Written For You',
                'Strategy & Planning',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-neutral-300">
                  <Check className="w-4 h-4 text-purple-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-800">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-neutral-400 font-medium hover:text-purple-400 transition-colors"
              >
                View Pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '500+', label: 'Properties Shot' },
            { value: '24hr', label: 'Avg Turnaround' },
            { value: '100%', label: 'Satisfaction' },
            { value: '5.0', label: 'Google Rating' },
          ].map((stat, i) => (
            <div key={i} className="p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-neutral-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
