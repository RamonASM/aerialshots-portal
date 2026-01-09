import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/marketing/hero/HeroSection'
import { TrustBar } from '@/components/marketing/sections/TrustBar'
import { ServicesGrid } from '@/components/marketing/sections/ServicesGrid'
import { HomePageJsonLd, FAQPageJsonLd } from '@/lib/seo/json-ld'
import { marketingFaqs } from '@/lib/data/marketing-faqs'

// Dynamic imports for below-fold components (performance optimization)
const ProcessTimeline = dynamic(
  () => import('@/components/marketing/sections/ProcessTimeline').then(mod => mod.ProcessTimeline),
  { ssr: true }
)
const PricingPreview = dynamic(
  () => import('@/components/marketing/sections/PricingPreview').then(mod => mod.PricingPreview),
  { ssr: true }
)
const PortfolioShowcase = dynamic(
  () => import('@/components/marketing/sections/PortfolioShowcase').then(mod => mod.PortfolioShowcase),
  { ssr: true }
)
const Testimonials = dynamic(
  () => import('@/components/marketing/sections/Testimonials').then(mod => mod.Testimonials),
  { ssr: true }
)
const FAQAccordion = dynamic(
  () => import('@/components/marketing/sections/FAQAccordion').then(mod => mod.FAQAccordion),
  { ssr: true }
)
const CTASection = dynamic(
  () => import('@/components/marketing/sections/CTASection').then(mod => mod.CTASection),
  { ssr: true }
)

export const metadata: Metadata = {
  title: 'Real Estate Photography & Media | Aerial Shots Media',
  description:
    'Central Florida\'s premier real estate photography, drone, video, 3D tours, and virtual staging. Professional media that sells homes faster. Delivered in 24 hours.',
  openGraph: {
    title: 'Aerial Shots Media | Real Estate Photography & Media',
    description:
      'Professional real estate photography, drone, video, and 3D tours for Central Florida agents. 24-hour turnaround.',
    images: ['/og-home.jpg'],
  },
}

export default function HomePage() {
  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#00D4FF] focus:text-black focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Structured Data for SEO */}
      <HomePageJsonLd />
      <FAQPageJsonLd questions={marketingFaqs} />

      <main id="main-content">
        {/* Hero Section - Full viewport with gradient mesh */}
        <HeroSection />

        {/* Trust Bar - Infinite scroll brokerage logos */}
        <TrustBar />

        {/* Services Grid - 6 service cards */}
        <ServicesGrid />

        {/* How It Works - 4-step timeline */}
        <ProcessTimeline />

        {/* Portfolio Showcase - Bento grid */}
        <PortfolioShowcase />

        {/* Pricing Preview - 3 package tiers */}
        <PricingPreview />

        {/* Testimonials - Carousel with ratings */}
        <Testimonials />

        {/* FAQ Accordion - Two-column layout */}
        <FAQAccordion />

        {/* Final CTA - Gradient background */}
        <CTASection />
      </main>
    </>
  )
}
