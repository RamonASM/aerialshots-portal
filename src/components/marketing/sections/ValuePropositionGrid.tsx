'use client'

import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const valueProps = [
  {
    number: '01',
    title: '24-Hour Turnaround',
    description: 'Photos delivered next day. Video and 3D tours within 48 hours.',
  },
  {
    number: '02',
    title: 'Professional Quality',
    description: 'HDR photography, cinematic video, and industry-leading 3D tours.',
  },
  {
    number: '03',
    title: 'AI-Powered Editing',
    description: 'Perfect skies, balanced lighting, and stunning virtual staging.',
  },
  {
    number: '04',
    title: 'Instant Publishing',
    description: 'Direct upload to MLS, Zillow, and all major platforms.',
  },
  {
    number: '05',
    title: 'Licensed & Insured',
    description: 'FAA Part 107 certified. Zillow Showcase certified.',
  },
  {
    number: '06',
    title: 'White-Glove Service',
    description: 'Dedicated support and automated delivery notifications.',
  },
]

export function ValuePropositionGrid() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-4">
            Why Choose Us
          </p>
          <h2 className="font-serif text-4xl lg:text-5xl text-white">
            Built for Top Producers
          </h2>
        </div>

        {/* Grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-x-12 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        >
          {valueProps.map((prop, index) => (
            <div
              key={prop.title}
              className={cn(
                'transition-all duration-700',
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              )}
              style={{
                transitionDelay: isVisible ? `${index * 75}ms` : '0ms',
              }}
            >
              {/* Number */}
              <span className="text-sm text-[#A29991] font-medium mb-4 block">
                {prop.number}
              </span>

              {/* Title */}
              <h3 className="text-xl font-medium text-white mb-3">
                {prop.title}
              </h3>

              {/* Description */}
              <p className="text-[15px] text-[#8A847F] leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
