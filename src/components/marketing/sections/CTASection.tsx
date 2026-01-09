'use client'

import Link from 'next/link'
import { ArrowRight, Phone, Mail } from 'lucide-react'
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
        variant === 'default' ? 'py-24 sm:py-32' : 'py-16'
      )}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 gradient-mesh-animated" />

      {/* Accent gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00D4FF]/[0.08] rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#7C3AED]/[0.06] rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] mb-8 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <span className="text-[12px] uppercase tracking-[0.15em] text-[#00D4FF] font-medium font-marketing">
            Get Started Today
          </span>
        </div>

        {/* Headline */}
        <h2
          className={cn(
            'text-marketing-section text-white mb-6 transition-all duration-700 delay-100',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {headline}
        </h2>

        {/* Subheadline */}
        <p
          className={cn(
            'text-marketing-subhead max-w-xl mx-auto mb-10 transition-all duration-700 delay-200',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {subheadline}
        </p>

        {/* CTA Button */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-all duration-700 delay-300',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <Link href="/book">
            <button
              className="h-14 px-8 btn-marketing-primary font-marketing flex items-center gap-2 text-base"
            >
              Book Your Shoot
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/portfolio">
            <button
              className="h-14 px-8 btn-marketing-ghost font-marketing text-base"
            >
              View Portfolio
            </button>
          </Link>
        </div>

        {/* Contact info */}
        <div
          className={cn(
            'flex flex-col sm:flex-row items-center justify-center gap-6 transition-all duration-700 delay-400',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <a
            href="tel:+14076926227"
            className="flex items-center gap-2 text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
          >
            <Phone className="h-4 w-4 text-[#00D4FF]" />
            (407) 692-6227
          </a>
          <span className="hidden sm:block w-px h-4 bg-white/[0.15]" />
          <a
            href="mailto:hello@aerialshots.media"
            className="flex items-center gap-2 text-[14px] text-[#A1A1AA] hover:text-white transition-colors font-marketing-body"
          >
            <Mail className="h-4 w-4 text-[#00D4FF]" />
            hello@aerialshots.media
          </a>
        </div>
      </div>
    </section>
  )
}
