'use client'

import Link from 'next/link'
import { Camera, Video, ArrowRight, Check } from 'lucide-react'
import { LISTING_PACKAGES, RETAINER_PACKAGES, formatCurrency } from '@/lib/pricing/config'

export default function BookPage() {
  const listingStartPrice = Math.min(...LISTING_PACKAGES.map(p => p.pricing.lt2000))
  const retainerStartPrice = Math.min(...RETAINER_PACKAGES.map(p => p.price))

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container py-24">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
            Book Your Shoot
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
            Professional Real Estate<br />Media Services
          </h1>
          <p className="text-[17px] text-[#8A847F] leading-relaxed">
            Transparent pricing. Outstanding quality.<br />
            Choose your service to get started.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] max-w-4xl mx-auto">
          {/* Listing Media */}
          <Link
            href="/book/listing"
            className="group relative bg-black p-10 transition-colors hover:bg-[#0a0a0a]"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-6 block">
              01
            </span>

            <div className="w-12 h-12 flex items-center justify-center border border-[#A29991] text-[#A29991] mb-6">
              <Camera className="w-6 h-6" />
            </div>

            <h2 className="font-serif text-2xl text-white mb-3 group-hover:text-[#A29991] transition-colors">
              Listing Media
            </h2>
            <p className="text-[15px] text-[#8A847F] mb-8">
              Per-property photography, video, 3D tours, and more.
              Perfect for individual listings.
            </p>

            <div className="mb-8">
              <span className="text-[13px] text-[#6a6765]">Starting from</span>
              <span className="font-serif text-3xl text-white block mt-1">
                {formatCurrency(listingStartPrice)}
              </span>
            </div>

            <div className="space-y-3 mb-10">
              {[
                'Professional Photography',
                'Aerial/Drone Shots',
                'Zillow 3D Tour',
                'Floor Plans & Virtual Staging',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                  <span className="w-1.5 h-1.5 bg-[#A29991] shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#A29991] text-[15px] font-medium group-hover:gap-3 transition-all">
              Book Now
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Content Retainer */}
          <Link
            href="/book/retainer"
            className="group relative bg-black p-10 transition-colors hover:bg-[#0a0a0a]"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-6 block">
              02
            </span>

            <div className="w-12 h-12 flex items-center justify-center border border-[#A29991] text-[#A29991] mb-6">
              <Video className="w-6 h-6" />
            </div>

            <h2 className="font-serif text-2xl text-white mb-3 group-hover:text-[#A29991] transition-colors">
              Content Retainer
            </h2>
            <p className="text-[15px] text-[#8A847F] mb-8">
              Monthly video subscription for consistent social media content
              and personal branding.
            </p>

            <div className="mb-8">
              <span className="text-[13px] text-[#6a6765]">Starting from</span>
              <span className="font-serif text-3xl text-white block mt-1">
                {formatCurrency(retainerStartPrice)}
                <span className="text-[15px] text-[#6a6765] font-sans">/mo</span>
              </span>
            </div>

            <div className="space-y-3 mb-10">
              {[
                '8-20 Videos Per Month',
                '2-4 Shoot Days',
                'Scripts Written For You',
                'Strategy & Planning',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                  <span className="w-1.5 h-1.5 bg-[#A29991] shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#A29991] text-[15px] font-medium group-hover:gap-3 transition-all">
              View Packages
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] max-w-4xl mx-auto">
          {[
            { value: '500+', label: 'Properties Shot' },
            { value: '24hr', label: 'Avg Turnaround' },
            { value: '100%', label: 'Satisfaction' },
            { value: '5.0', label: 'Google Rating' },
          ].map((stat, i) => (
            <div key={i} className="bg-black p-8 text-center">
              <div className="font-serif text-3xl text-white mb-1">{stat.value}</div>
              <div className="text-[13px] text-[#6a6765]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
