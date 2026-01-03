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
    <section className="py-32" aria-label="Frequently Asked Questions">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[#A29991] mb-4">
            FAQ
          </p>
          <h2 id="faq-heading" className="font-serif text-4xl lg:text-5xl text-white">
            Common Questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-4" role="region" aria-labelledby="faq-heading">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            const contentId = `faq-content-${index}`

            return (
              <div
                key={index}
                className="border border-white/[0.06] bg-[#0a0a0a]"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A29991] focus-visible:ring-inset"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <span className="text-[15px] font-medium text-white pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-[#8A847F] shrink-0 transition-transform duration-200',
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
                    <p className="px-6 pb-5 text-[14px] text-[#8A847F] leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Contact CTA */}
        <p className="text-center text-[14px] text-[#8A847F] mt-12">
          Have another question?{' '}
          <a
            href="mailto:hello@aerialshots.media"
            className="text-[#A29991] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A29991] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Contact us
          </a>
        </p>
      </div>
    </section>
  )
}
