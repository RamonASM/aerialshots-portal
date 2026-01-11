'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MapPin, Home, Maximize } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'

const portfolioItems = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    title: 'Lakefront Estate',
    location: 'Lake Nona, FL',
    sqft: '5,200',
    type: 'Luxury Home',
    span: 'col-span-2 row-span-2', // Large featured
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
    title: 'Modern Villa',
    location: 'Windermere, FL',
    sqft: '4,100',
    type: 'Contemporary',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
    title: 'Downtown Penthouse',
    location: 'Orlando, FL',
    sqft: '2,800',
    type: 'Condo',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80',
    title: 'Golf Course Estate',
    location: 'Dr. Phillips, FL',
    sqft: '6,500',
    type: 'Estate',
    span: 'col-span-1 row-span-2', // Tall
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
    title: 'Waterfront Condo',
    location: 'Winter Park, FL',
    sqft: '1,800',
    type: 'Condo',
    span: 'col-span-1 row-span-1',
  },
  {
    id: 6,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
    title: 'Suburban Luxury',
    location: 'Celebration, FL',
    sqft: '3,400',
    type: 'Single Family',
    span: 'col-span-1 row-span-1',
  },
]

export function PortfolioShowcase() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B]">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            Our Work
          </p>
          <h2 className="text-marketing-section text-white mb-4">
            Recent Projects
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            Explore our latest real estate media productions from across Central Florida.
          </p>
        </div>

        {/* Bento grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[220px]"
        >
          {portfolioItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-700',
                item.span,
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: isVisible ? `${index * 100}ms` : '0ms' }}
            >
              {/* Image with gradient overlay */}
              <div className="absolute inset-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              </div>

              {/* Content overlay */}
              <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                {/* Property type badge */}
                <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-2 group-hover:translate-y-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D4FF]/20 backdrop-blur-sm border border-[#00D4FF]/30 text-[11px] uppercase tracking-wider text-[#00D4FF] font-marketing">
                    <Home className="h-3 w-3" />
                    {item.type}
                  </span>
                </div>

                {/* Property info */}
                <div className="transform transition-all duration-300 group-hover:-translate-y-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 font-marketing">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[13px] text-white/70 font-marketing-body">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#00D4FF]" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize className="h-3.5 w-3.5 text-[#00D4FF]" />
                      {item.sqft} sqft
                    </span>
                  </div>
                </div>

                {/* View button - appears on hover */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <div className="w-10 h-10 rounded-full bg-[#00D4FF] flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-black" />
                  </div>
                </div>
              </div>

              {/* Border glow on hover */}
              <div className="absolute inset-0 rounded-2xl border border-white/[0.08] group-hover:border-[#00D4FF]/30 transition-colors" />
            </div>
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 h-12 px-6 btn-marketing-ghost font-marketing"
          >
            View Full Portfolio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
