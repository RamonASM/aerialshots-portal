/**
 * Testimonial Carousel Component
 *
 * Displays client testimonials in a carousel format
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Testimonial {
  id: string
  clientName: string
  clientLocation?: string
  text: string
  rating: number
  date?: string
  propertyAddress?: string
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
  brandColor?: string
  autoPlay?: boolean
  autoPlayInterval?: number
  className?: string
}

export function TestimonialCarousel({
  testimonials,
  brandColor = '#0077ff',
  autoPlay = true,
  autoPlayInterval = 5000,
  className,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!autoPlay || testimonials.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, testimonials.length, currentIndex])

  const goToNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const goToPrevious = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setTimeout(() => setIsAnimating(false), 300)
  }

  if (testimonials.length === 0) {
    return null
  }

  const current = testimonials[currentIndex]

  return (
    <div className={cn('relative', className)}>
      {/* Quote Icon */}
      <div
        className="absolute -top-4 left-6 rounded-full p-3"
        style={{ backgroundColor: `${brandColor}20` }}
      >
        <Quote className="h-6 w-6" style={{ color: brandColor }} />
      </div>

      {/* Testimonial Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6 pt-10">
        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn('h-4 w-4', i < current.rating ? '' : 'opacity-30')}
              fill={i < current.rating ? brandColor : 'transparent'}
              style={{ color: brandColor }}
            />
          ))}
        </div>

        {/* Text */}
        <blockquote
          className={cn(
            'text-[15px] text-white leading-relaxed transition-opacity duration-300',
            isAnimating ? 'opacity-0' : 'opacity-100'
          )}
        >
          "{current.text}"
        </blockquote>

        {/* Client Info */}
        <div
          className={cn(
            'mt-4 pt-4 border-t border-white/[0.08] transition-opacity duration-300',
            isAnimating ? 'opacity-0' : 'opacity-100'
          )}
        >
          <p className="font-medium text-white">{current.clientName}</p>
          <div className="flex items-center gap-2 text-[13px] text-[#636366]">
            {current.clientLocation && <span>{current.clientLocation}</span>}
            {current.propertyAddress && (
              <>
                <span>·</span>
                <span>{current.propertyAddress}</span>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        {testimonials.length > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentIndex ? 'w-6' : 'w-1.5'
                  )}
                  style={{
                    backgroundColor:
                      i === currentIndex ? brandColor : `${brandColor}40`,
                  }}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={goToPrevious}
                className="rounded-lg border border-white/[0.08] p-2 text-[#a1a1a6] hover:bg-white/5 transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToNext}
                className="rounded-lg border border-white/[0.08] p-2 text-[#a1a1a6] hover:bg-white/5 transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Grid layout for multiple testimonials
 */
interface TestimonialGridProps {
  testimonials: Testimonial[]
  brandColor?: string
  columns?: 1 | 2 | 3
  className?: string
}

export function TestimonialGrid({
  testimonials,
  brandColor = '#0077ff',
  columns = 2,
  className,
}: TestimonialGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <div className={cn(`grid gap-4 ${gridCols[columns]}`, className)}>
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          brandColor={brandColor}
        />
      ))}
    </div>
  )
}

function TestimonialCard({
  testimonial,
  brandColor,
}: {
  testimonial: Testimonial
  brandColor: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-5">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn('h-3.5 w-3.5', i < testimonial.rating ? '' : 'opacity-30')}
            fill={i < testimonial.rating ? brandColor : 'transparent'}
            style={{ color: brandColor }}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-[14px] text-[#a1a1a6] line-clamp-4">
        "{testimonial.text}"
      </p>

      {/* Client */}
      <div className="mt-3 pt-3 border-t border-white/[0.08]">
        <p className="text-sm font-medium text-white">{testimonial.clientName}</p>
        {testimonial.clientLocation && (
          <p className="text-[12px] text-[#636366]">{testimonial.clientLocation}</p>
        )}
      </div>
    </div>
  )
}
