'use client'

import { Calendar, Camera, Sparkles, Download } from 'lucide-react'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: Calendar,
    number: '01',
    title: 'Book Online',
    description: 'Select your services and pick a date that works for you.',
  },
  {
    icon: Camera,
    number: '02',
    title: 'We Capture',
    description: 'Our professional team captures your property beautifully.',
  },
  {
    icon: Sparkles,
    number: '03',
    title: 'AI Enhancement',
    description: 'Advanced AI editing perfects every shot automatically.',
  },
  {
    icon: Download,
    number: '04',
    title: 'Delivered',
    description: 'Download-ready media delivered in 24 hours.',
  },
]

export function ProcessTimeline() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B]">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            How It Works
          </p>
          <h2 className="text-marketing-section text-white mb-4">
            From Booking to Live in 24 Hours
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            Our streamlined process is designed for busy agents who need fast turnaround without sacrificing quality.
          </p>
        </div>

        {/* Timeline */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="relative"
        >
          {/* Desktop timeline */}
          <div className="hidden lg:block">
            {/* Connector line */}
            <div className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />

            <div className="grid grid-cols-4 gap-8">
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
                    transitionDelay: isVisible ? `${index * 150}ms` : '0ms',
                  }}
                >
                  {/* Icon circle */}
                  <div className="relative mx-auto mb-6">
                    <div className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center mx-auto',
                      'bg-[#141416] border-2 border-[#00D4FF]/30',
                      'group-hover:border-[#00D4FF] transition-colors'
                    )}>
                      <step.icon className="h-6 w-6 text-[#00D4FF]" />
                    </div>
                    {/* Pulse effect */}
                    <div className="absolute inset-0 rounded-full bg-[#00D4FF]/20 animate-ping opacity-30" />
                  </div>

                  {/* Number */}
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#00D4FF] font-medium mb-2 block font-marketing">
                    Step {step.number}
                  </span>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white mb-2 font-marketing">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[14px] text-[#A1A1AA] leading-relaxed font-marketing-body">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile timeline - vertical */}
          <div className="lg:hidden space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  'flex gap-5 transition-all duration-700',
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                )}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
                }}
              >
                {/* Icon + line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    'bg-[#141416] border-2 border-[#00D4FF]/30'
                  )}>
                    <step.icon className="h-5 w-5 text-[#00D4FF]" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 flex-1 mt-3 bg-gradient-to-b from-[#00D4FF]/30 to-transparent" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#00D4FF] font-medium mb-1 block font-marketing">
                    Step {step.number}
                  </span>
                  <h3 className="text-lg font-semibold text-white mb-2 font-marketing">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-[#A1A1AA] leading-relaxed font-marketing-body">
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
