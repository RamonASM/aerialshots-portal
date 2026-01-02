'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { marketingFaqs } from '@/lib/data/marketing-faqs'

// Re-export for backwards compatibility
export const faqs = marketingFaqs

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-24" aria-label="Frequently Asked Questions">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-display-lg text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-body-lg">
            Everything you need to know about our services
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3" role="region" aria-labelledby="faq-heading">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            const contentId = `faq-content-${index}`

            return (
              <div
                key={index}
                className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4533] focus-visible:ring-inset"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <span className="text-[16px] font-medium text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
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
                    <p className="px-6 pb-5 text-[15px] text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Contact CTA */}
        <p className="text-center text-[14px] text-muted-foreground mt-8">
          Have another question?{' '}
          <a
            href="mailto:hello@aerialshots.media"
            className="text-[#09f] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4533] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            Contact us
          </a>
        </p>
      </div>
    </section>
  )
}
