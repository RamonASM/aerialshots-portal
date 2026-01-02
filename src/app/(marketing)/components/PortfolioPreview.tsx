'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const categories = ['All', 'Photography', 'Drone', 'Video', '3D Tours', 'Staging']

// Sample portfolio items - in production, these would come from Supabase
const portfolioItems = [
  {
    id: 1,
    title: 'Luxury Lakefront Estate',
    category: 'Photography',
    image: '/portfolio/luxury-lakefront.jpg',
    location: 'Windermere, FL',
    price: '$2.8M',
  },
  {
    id: 2,
    title: 'Modern Downtown Condo',
    category: 'Video',
    image: '/portfolio/downtown-condo.jpg',
    location: 'Orlando, FL',
    price: '$650K',
    hasVideo: true,
  },
  {
    id: 3,
    title: 'Mediterranean Villa',
    category: 'Drone',
    image: '/portfolio/mediterranean-villa.jpg',
    location: 'Dr. Phillips, FL',
    price: '$1.9M',
  },
  {
    id: 4,
    title: 'Contemporary Pool Home',
    category: '3D Tours',
    image: '/portfolio/pool-home.jpg',
    location: 'Lake Nona, FL',
    price: '$890K',
  },
  {
    id: 5,
    title: 'Vacant Staging Project',
    category: 'Staging',
    image: '/portfolio/virtual-staging.jpg',
    location: 'Winter Park, FL',
    price: '$425K',
    beforeAfter: true,
  },
  {
    id: 6,
    title: 'Golf Course Home',
    category: 'Photography',
    image: '/portfolio/golf-course.jpg',
    location: 'Reunion, FL',
    price: '$1.2M',
  },
]

export function PortfolioPreview() {
  const [activeCategory, setActiveCategory] = useState('All')
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  const filteredItems =
    activeCategory === 'All'
      ? portfolioItems
      : portfolioItems.filter((item) => item.category === activeCategory)

  return (
    <section className="py-24 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <h2 className="text-display-lg text-white mb-4">
              Our Work Speaks for Itself
            </h2>
            <p className="text-body-lg max-w-xl">
              Browse our portfolio of recent projects for Central Florida&apos;s top agents
            </p>
          </div>
          <Link href="/portfolio">
            <Button
              variant="outline"
              className="border-white/[0.16] hover:bg-white/[0.05]"
            >
              View Full Portfolio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'px-4 py-2 rounded-lg text-[14px] font-medium transition-all',
                activeCategory === category
                  ? 'bg-[#ff4533] text-white'
                  : 'bg-white/[0.05] text-[#a1a1a6] hover:bg-white/[0.1] hover:text-white'
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Portfolio grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/portfolio/${item.id}`}
              className={cn(
                'group relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1c1c1e] transition-all duration-700',
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              )}
              style={{
                transitionDelay: isVisible ? `${index * 75}ms` : '0ms',
              }}
            >
              {/* Placeholder gradient for missing images */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e]" />

              {/* Image would go here */}
              {/* <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              /> */}

              {/* Video indicator */}
              {item.hasVideo && (
                <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              )}

              {/* Before/After indicator */}
              {item.beforeAfter && (
                <div className="absolute top-4 right-4 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1">
                  <span className="text-[12px] font-medium text-white">
                    Before/After
                  </span>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <h3 className="text-[16px] font-semibold text-white mb-1 group-hover:text-[#09f] transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#a1a1a6]">
                    {item.location}
                  </span>
                  <span className="text-[13px] font-medium text-white">
                    {item.price}
                  </span>
                </div>
              </div>

              {/* Hover border */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/20 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
