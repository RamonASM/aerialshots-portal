'use client'

import { useStaggeredReveal } from '@/lib/hooks/use-scroll-reveal'
import { Zap, Camera, Sparkles, Shield, Clock, Award } from 'lucide-react'
import { cn } from '@/lib/utils'

const valueProps = [
  {
    icon: Clock,
    title: '24-Hour Turnaround',
    description:
      'Photos delivered next day. Video and 3D tours within 48 hours. Rush delivery available.',
    highlight: 'Same-day booking',
  },
  {
    icon: Camera,
    title: 'Professional Quality',
    description:
      'HDR photography, cinematic video, and industry-leading 3D tours that make listings stand out.',
    highlight: '4K resolution',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Editing',
    description:
      'Advanced AI enhancement for perfect skies, balanced lighting, and stunning virtual staging.',
    highlight: 'Smart enhancement',
  },
  {
    icon: Zap,
    title: 'Instant Publishing',
    description:
      'Direct upload to MLS, Zillow, Realtor.com, and all major platforms with one click.',
    highlight: 'One-click publish',
  },
  {
    icon: Shield,
    title: 'Licensed & Insured',
    description:
      'FAA Part 107 certified drone pilots. Fully insured for all shoots. Zillow Showcase certified.',
    highlight: 'FAA certified',
  },
  {
    icon: Award,
    title: 'White-Glove Service',
    description:
      'Dedicated support team, agent portal access, and automated delivery notifications.',
    highlight: '5-star rated',
  },
]

export function ValuePropositionGrid() {
  const { containerRef, isContainerVisible, getItemDelay } = useStaggeredReveal(
    valueProps.length,
    75
  )

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-radial-top" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-display-lg text-white mb-4">
            Why Top Agents Choose Us
          </h2>
          <p className="text-body-lg max-w-2xl mx-auto">
            Professional media that helps you win more listings and sell homes faster
          </p>
        </div>

        {/* Grid */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {valueProps.map((prop, index) => (
            <div
              key={prop.title}
              className={cn(
                'group relative rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-6 transition-all duration-500 hover:border-white/[0.16] hover:bg-[#111]',
                isContainerVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              )}
              style={{
                transitionDelay: isContainerVisible
                  ? `${getItemDelay(index)}ms`
                  : '0ms',
              }}
            >
              {/* Icon */}
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 transition-transform group-hover:scale-110">
                <prop.icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <h3 className="text-[18px] font-semibold text-white mb-2">
                {prop.title}
              </h3>
              <p className="text-[14px] text-[#8e8e93] leading-relaxed mb-4">
                {prop.description}
              </p>

              {/* Highlight badge */}
              <span className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1 text-[12px] font-medium text-[#a1a1a6]">
                {prop.highlight}
              </span>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
