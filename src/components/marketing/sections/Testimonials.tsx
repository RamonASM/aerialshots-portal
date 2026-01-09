'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'

const testimonials = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    title: 'Luxury Home Specialist',
    brokerage: 'Sotheby\'s International',
    avatar: '/testimonials/sarah-m.jpg',
    rating: 5,
    quote: 'Aerial Shots Media has become an essential part of my business. Their 24-hour turnaround and stunning quality help my luxury listings stand out in a competitive market.',
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    title: 'Top Producer',
    brokerage: 'Keller Williams',
    avatar: '/testimonials/michael-r.jpg',
    rating: 5,
    quote: 'The drone photography and 3D tours have transformed how I present properties. My clients are always impressed with the final product.',
  },
  {
    id: 3,
    name: 'Jennifer Chen',
    title: 'Broker Associate',
    brokerage: 'Compass',
    avatar: '/testimonials/jennifer-c.jpg',
    rating: 5,
    quote: 'I\'ve worked with many media companies, but none match the professionalism and quality of Aerial Shots Media. They truly understand real estate marketing.',
  },
  {
    id: 4,
    name: 'David Thompson',
    title: 'Team Lead',
    brokerage: 'RE/MAX',
    avatar: '/testimonials/david-t.jpg',
    rating: 5,
    quote: 'The virtual staging service is incredible. It helps buyers visualize the potential of vacant properties. My listings sell faster thanks to their work.',
  },
  {
    id: 5,
    name: 'Amanda Foster',
    title: 'Realtor',
    brokerage: 'Coldwell Banker',
    avatar: '/testimonials/amanda-f.jpg',
    rating: 5,
    quote: 'From booking to delivery, everything is seamless. Their online portal makes it easy to manage all my media needs in one place.',
  },
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  // Scroll to current index
  useEffect(() => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth
      const itemWidth = scrollWidth / testimonials.length
      scrollRef.current.scrollTo({
        left: itemWidth * currentIndex,
        behavior: 'smooth',
      })
    }
  }, [currentIndex])

  const goToPrev = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B] overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            Testimonials
          </p>
          <h2 className="text-marketing-section text-white mb-4">
            Trusted by Top Agents
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            See what Central Florida&apos;s leading real estate professionals say about our services.
          </p>
        </div>

        {/* Carousel container */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={cn(
            'relative transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* Navigation buttons */}
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 rounded-full bg-[#141416] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-all hidden lg:flex"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 rounded-full bg-[#141416] border border-white/[0.08] flex items-center justify-center text-white/70 hover:text-[#00D4FF] hover:border-[#00D4FF]/30 transition-all hidden lg:flex"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Testimonial cards scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={cn(
                  'flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-center',
                  'p-6 sm:p-8 rounded-2xl glass-card-marketing',
                  'transition-all duration-500',
                  index === currentIndex && 'border-[#00D4FF]/30'
                )}
              >
                {/* Quote icon */}
                <div className="mb-6">
                  <Quote className="h-8 w-8 text-[#00D4FF]/30" />
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-4 w-4',
                        i < testimonial.rating
                          ? 'text-[#FFB800] fill-[#FFB800]'
                          : 'text-[#3F3F46]'
                      )}
                    />
                  ))}
                </div>

                {/* Quote text */}
                <blockquote className="text-[15px] text-[#A1A1AA] leading-relaxed mb-6 font-marketing-body">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author info */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#141416] border border-white/[0.08]">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white font-marketing">
                      {testimonial.name}
                    </p>
                    <p className="text-[12px] text-[#71717A] font-marketing-body">
                      {testimonial.title} • {testimonial.brokerage}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false)
                  setCurrentIndex(index)
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentIndex
                    ? 'w-6 bg-[#00D4FF]'
                    : 'bg-white/20 hover:bg-white/40'
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
