'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { marketingFaqs } from '@/lib/data/marketing-faqs'
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal'

// Re-export for backwards compatibility
export const faqs = marketingFaqs

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  // Split FAQs into two columns for desktop
  const midpoint = Math.ceil(faqs.length / 2)
  const leftColumn = faqs.slice(0, midpoint)
  const rightColumn = faqs.slice(midpoint)

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0B]" aria-label="Frequently Asked Questions">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#00D4FF] mb-4 font-marketing">
            FAQs
          </p>
          <h2 id="faq-heading" className="text-marketing-section text-white mb-4">
            Common Questions
          </h2>
          <p className="text-marketing-subhead max-w-2xl mx-auto">
            Everything you need to know about our real estate media services.
          </p>
        </div>

        {/* Two-column FAQ grid */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="grid gap-4 lg:grid-cols-2 lg:gap-6"
          role="region"
          aria-labelledby="faq-heading"
        >
          {/* Left column */}
          <div className="space-y-4">
            {leftColumn.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                isVisible={isVisible}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {rightColumn.map((faq, index) => {
              const actualIndex = index + midpoint
              return (
                <FAQItem
                  key={actualIndex}
                  faq={faq}
                  index={actualIndex}
                  isOpen={openIndex === actualIndex}
                  onToggle={() => setOpenIndex(openIndex === actualIndex ? null : actualIndex)}
                  isVisible={isVisible}
                  delay={(index + midpoint) * 100}
                />
              )
            })}
          </div>
        </div>

        {/* Contact CTA */}
        <div
          className={cn(
            'text-center mt-12 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
          style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
        >
          <p className="text-[14px] text-[#A1A1AA] font-marketing-body">
            Have another question?{' '}
            <a
              href="mailto:hello@aerialshots.media"
              className="text-[#00D4FF] hover:text-[#33DDFF] transition-colors font-medium"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

interface FAQItemProps {
  faq: { question: string; answer: string }
  index: number
  isOpen: boolean
  onToggle: () => void
  isVisible: boolean
  delay: number
}

function FAQItem({ faq, index, isOpen, onToggle, isVisible, delay }: FAQItemProps) {
  const contentId = `faq-content-${index}`

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-500',
        isOpen
          ? 'border-[#00D4FF]/30 bg-[#141416]'
          : 'border-white/[0.08] bg-[#0A0A0B] hover:border-white/[0.15]',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-inset rounded-xl"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="text-[15px] font-medium text-white pr-4 font-marketing">
          {faq.question}
        </span>
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
            isOpen
              ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
              : 'bg-white/[0.05] text-[#A1A1AA]'
          )}
        >
          {isOpen ? (
            <Minus className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </button>
      <div
        id={contentId}
        className={cn(
          'grid transition-all duration-300',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        role="region"
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            {/* Gradient accent line */}
            <div className="h-px w-full bg-gradient-to-r from-[#00D4FF]/30 via-[#00D4FF]/10 to-transparent mb-4" />
            <p className="text-[14px] text-[#A1A1AA] leading-relaxed font-marketing-body">
              {faq.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
