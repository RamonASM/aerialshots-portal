'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const features = [
  { icon: Clock, text: 'Same-day booking' },
  { icon: Shield, text: 'Satisfaction guaranteed' },
  { icon: Star, text: '5-star rated service' },
]

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
        variant === 'default' ? 'py-24' : 'py-16'
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01]" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.03] rounded-full blur-[100px]" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2
          className={cn(
            'text-display-xl text-white mb-6 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {headline}
        </h2>

        {/* Subheadline */}
        <p
          className={cn(
            'text-body-lg max-w-2xl mx-auto mb-8 transition-all duration-700 delay-100',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {subheadline}
        </p>

        {/* Features */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-center gap-6 mb-10 transition-all duration-700 delay-200',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {features.map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-2 text-[14px] text-[#a1a1a6]"
            >
              <feature.icon className="h-4 w-4 text-white/70" />
              {feature.text}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <Link href="/book">
            <Button
              size="lg"
              className="h-14 px-8 bg-[#ff4533] hover:bg-[#e63d2e] text-white text-[16px] font-semibold rounded-xl shadow-lg shadow-[#ff4533]/25 transition-all hover:shadow-xl hover:shadow-[#ff4533]/30 hover:scale-[1.02]"
            >
              Book Your Shoot Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-[16px] font-medium rounded-xl border-white/[0.16] hover:bg-white/[0.05] hover:border-white/[0.24]"
            >
              View Pricing
            </Button>
          </Link>
        </div>

        {/* Urgency text */}
        <p
          className={cn(
            'text-[13px] text-[#8e8e93] mt-6 transition-all duration-700 delay-400',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          Only 3 slots remaining this week
        </p>
      </div>
    </section>
  )
}
