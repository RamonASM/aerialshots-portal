'use client'

import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { Calendar, Camera, Wand2, Send, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    number: '01',
    icon: Calendar,
    title: 'Book Online',
    description: 'Select your services, pick a date that works, and we\'ll handle the rest.',
    time: '2 min',
  },
  {
    number: '02',
    icon: Camera,
    title: 'We Shoot',
    description: 'Our professional team captures stunning photos, video, drone, and 3D tours.',
    time: '1-2 hours',
  },
  {
    number: '03',
    icon: Wand2,
    title: 'AI Enhancement',
    description: 'Advanced editing with AI sky replacement, HDR, and color correction.',
    time: 'Same day',
  },
  {
    number: '04',
    icon: Send,
    title: 'Delivered',
    description: 'Download-ready photos, video, and virtual tour links sent to your inbox.',
    time: '24 hours',
  },
  {
    number: '05',
    icon: Rocket,
    title: 'Go Live',
    description: 'One-click publishing to MLS, Zillow, and all major real estate platforms.',
    time: 'Instant',
  },
]

export function ProcessTimeline() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-24 bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-display-lg text-white mb-4">
            How It Works
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            From booking to going live in 24 hours or less
          </p>
        </div>

        {/* Timeline */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="relative"
        >
          {/* Desktop timeline line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Steps grid */}
          <div className="grid gap-8 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  'relative text-center transition-all duration-700',
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                )}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                {/* Step number (desktop) */}
                <div className="hidden lg:flex items-center justify-center mb-8">
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 bg-black text-[14px] font-bold text-white">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1c1c1e] border border-white/[0.08]">
                  <step.icon className="h-7 w-7 text-white/70" />
                </div>

                {/* Content */}
                <h3 className="text-[16px] font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#8e8e93] leading-relaxed mb-3">
                  {step.description}
                </p>

                {/* Time badge */}
                <span className="inline-flex items-center rounded-full bg-[#34c759]/10 px-3 py-1 text-[12px] font-medium text-[#34c759]">
                  {step.time}
                </span>

                {/* Mobile step indicator */}
                <div className="lg:hidden absolute -left-4 top-0 text-[48px] font-bold text-white/[0.03]">
                  {step.number}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
