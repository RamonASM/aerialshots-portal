'use client'

import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const steps = [
  {
    number: '01',
    title: 'Book Online',
    description: 'Select your services and pick a date.',
  },
  {
    number: '02',
    title: 'We Shoot',
    description: 'Professional team captures your property.',
  },
  {
    number: '03',
    title: 'AI Enhancement',
    description: 'Advanced editing and color correction.',
  },
  {
    number: '04',
    title: 'Delivered',
    description: 'Download-ready media in 24 hours.',
  },
]

export function ProcessTimeline() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-32 bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left column - Header */}
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Process
            </p>
            <h2 className="font-serif text-4xl lg:text-5xl text-white mb-6">
              Simple &<br />Streamlined
            </h2>
            <p className="text-[15px] text-[#8A847F] leading-relaxed max-w-sm">
              From booking to going live in 24 hours. Our process is designed for busy agents.
            </p>
          </div>

          {/* Right column - Steps */}
          <div
            ref={ref as React.RefObject<HTMLDivElement>}
            className="space-y-12"
          >
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  'flex gap-6 transition-all duration-700',
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                )}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                {/* Number */}
                <span className="text-sm text-[#A29991] font-medium pt-1 w-8 shrink-0">
                  {step.number}
                </span>

                {/* Content */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-[#8A847F]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
