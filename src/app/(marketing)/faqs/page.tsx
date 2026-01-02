'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  HelpCircle,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const faqCategories = [
  {
    name: 'Booking',
    faqs: [
      {
        question: 'How do I book a photo shoot?',
        answer: 'You can book directly through our website by clicking "Book Now" and selecting your package, property details, and preferred date/time. The whole process takes about 2 minutes.',
      },
      {
        question: 'How far in advance should I book?',
        answer: 'We recommend booking at least 24-48 hours in advance for best availability. Same-day shoots are available when our schedule permits.',
      },
      {
        question: 'Can I reschedule my appointment?',
        answer: 'Yes, you can reschedule free of charge with at least 24 hours notice. Log into your agent portal or contact us directly to make changes.',
      },
      {
        question: 'What areas do you serve?',
        answer: 'We serve all of Central Florida including Orlando, Winter Park, Lake Nona, Windermere, Celebration, Kissimmee, Tampa, and surrounding areas.',
      },
    ],
  },
  {
    name: 'Pricing',
    faqs: [
      {
        question: 'How is pricing determined?',
        answer: 'Pricing is based on property square footage and the services you select. Our packages (Essentials, Signature, Luxury) include bundles of services at discounted rates compared to à la carte pricing.',
      },
      {
        question: 'Do you offer package discounts?',
        answer: 'Yes! Our Essentials, Signature, and Luxury packages bundle services together at significant savings compared to ordering services individually.',
      },
      {
        question: 'When is payment due?',
        answer: 'Payment is collected when you book your shoot. We accept all major credit cards and can invoice for accounts with established credit.',
      },
      {
        question: 'Do you offer refunds?',
        answer: 'If you need to cancel, please give us at least 24 hours notice for a full refund. Cancellations with less notice may be subject to a cancellation fee.',
      },
    ],
  },
  {
    name: 'Services',
    faqs: [
      {
        question: 'What equipment do you use?',
        answer: 'We use professional Sony and Canon mirrorless cameras, ultra-wide lenses, DJI drones (Mavic 3 Pro, Mini 4 Pro), and Matterport Pro3 for 3D tours.',
      },
      {
        question: 'Do you offer twilight photography?',
        answer: 'Yes! Twilight shots are available as an add-on or included in our Luxury package. These are typically scheduled 20-30 minutes after sunset.',
      },
      {
        question: 'What is virtual staging?',
        answer: 'Virtual staging uses AI technology to digitally furnish empty rooms. It helps buyers visualize the space and is much more affordable than physical staging.',
      },
      {
        question: 'Are your drone pilots licensed?',
        answer: 'Yes, all our drone operators hold FAA Part 107 Remote Pilot Certificates and carry $2M liability insurance.',
      },
    ],
  },
  {
    name: 'Delivery',
    faqs: [
      {
        question: 'How quickly will I receive my photos?',
        answer: 'Standard turnaround is 24 hours for photos. Video and 3D tours typically take 48-72 hours. Rush delivery (same-day) is available for an additional fee.',
      },
      {
        question: 'What format are the photos delivered in?',
        answer: 'Photos are delivered as high-resolution JPEGs, properly sized and formatted for MLS systems. We also provide web-optimized versions for social media.',
      },
      {
        question: 'How do I access my media?',
        answer: 'All media is delivered through your personal agent portal where you can view, download, and share your assets. You\'ll also receive an email notification when delivery is ready.',
      },
      {
        question: 'Can I request edits or re-shoots?',
        answer: 'We offer one round of minor edits free of charge. If there\'s an issue with coverage or quality, we\'ll schedule a re-shoot at no additional cost.',
      },
    ],
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-medium text-foreground pr-8">{question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 pb-4' : 'max-h-0'
        )}
      >
        <p className="text-muted-foreground text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

export default function FAQsPage() {
  const [activeCategory, setActiveCategory] = useState('Booking')

  const activeFaqs = faqCategories.find(cat => cat.name === activeCategory)?.faqs || []

  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 mb-6">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Frequently Asked Questions
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about our services, pricing, and delivery.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            {/* Category Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {faqCategories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeCategory === category.name
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-white/[0.1]'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] divide-y divide-white/[0.08]">
              <div className="p-6">
                {activeFaqs.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-24 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Still Have Questions?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Can&apos;t find what you&apos;re looking for? Our team is happy to help.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Contact Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@aerialshots.media"
                className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
