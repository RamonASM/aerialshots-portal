'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <section className="py-32 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Portfolio
            </p>
            <h2 className="font-serif text-4xl lg:text-5xl text-white">
              Our Work
            </h2>
          </div>
          <Link href="/portfolio">
            <Button
              variant="ghost"
              className="text-[#B5ADA6] hover:text-white"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'px-4 py-2 text-[13px] font-medium transition-colors',
                activeCategory === category
                  ? 'bg-[#A29991] text-black'
                  : 'bg-white/[0.04] text-[#B5ADA6] hover:bg-white/[0.08] hover:text-white'
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
                'group relative aspect-[4/3] overflow-hidden bg-[#141414] transition-all duration-700',
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              )}
              style={{
                transitionDelay: isVisible ? `${index * 75}ms` : '0ms',
              }}
            >
              {/* Placeholder gradient for missing images */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1e] to-[#262626]" />

              {/* Video indicator */}
              {item.hasVideo && (
                <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center bg-black/50 backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              )}

              {/* Before/After indicator */}
              {item.beforeAfter && (
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1">
                  <span className="text-[12px] font-medium text-white">
                    Before/After
                  </span>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <h3 className="text-[15px] font-medium text-white mb-1 group-hover:text-[#A29991] transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#B5ADA6]">
                    {item.location}
                  </span>
                  <span className="text-[13px] font-medium text-white">
                    {item.price}
                  </span>
                </div>
              </div>

              {/* Hover border */}
              <div className="absolute inset-0 border border-transparent group-hover:border-white/[0.12] transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
