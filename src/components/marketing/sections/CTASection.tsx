'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

interface CTASectionProps {
  variant?: 'default' | 'compact'
  headline?: string
  subheadline?: string
}

export function CTASection({
  variant = 'default',
  headline = 'Ready to Elevate Your Listings?',
  subheadline = 'Join 500+ top-producing agents who trust Aerial Shots Media for their real estate photography, video, drone, and 3D tours.',
}: CTASectionProps) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn(
        'relative overflow-hidden',
        variant === 'default' ? 'py-32' : 'py-20'
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Label */}
        <p
          className={cn(
            'text-sm uppercase tracking-[0.2em] text-[#A29991] mb-6 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          Get Started
        </p>

        {/* Headline */}
        <h2
          className={cn(
            'font-serif text-4xl lg:text-5xl text-white mb-6 transition-all duration-700 delay-100',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {headline}
        </h2>

        {/* Subheadline */}
        <p
          className={cn(
            'text-[15px] text-[#B5ADA6] max-w-xl mx-auto mb-10 transition-all duration-700 delay-200',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {subheadline}
        </p>

        {/* CTA Button */}
        <div
          className={cn(
            'transition-all duration-700 delay-300',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <Link href="/book">
            <Button
              size="lg"
              className="h-14 px-10 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
            >
              Book Your Shoot
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
