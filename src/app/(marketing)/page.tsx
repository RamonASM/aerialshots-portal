import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/marketing/hero/HeroSection'
import { TrustBar } from '@/components/marketing/sections/TrustBar'
import { ValuePropositionGrid } from '@/components/marketing/sections/ValuePropositionGrid'
import { HomePageJsonLd, FAQPageJsonLd } from '@/lib/seo/json-ld'
import { marketingFaqs } from '@/lib/data/marketing-faqs'

// Dynamic imports for below-fold components (performance optimization)
const ProcessTimeline = dynamic(
  () => import('@/components/marketing/sections/ProcessTimeline').then(mod => mod.ProcessTimeline),
  { ssr: true }
)
const PackagesPreview = dynamic(
  () => import('./components/PackagesPreview').then(mod => mod.PackagesPreview),
  { ssr: true }
)
const PortfolioPreview = dynamic(
  () => import('./components/PortfolioPreview').then(mod => mod.PortfolioPreview),
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
      {/* Structured Data for SEO */}
      <HomePageJsonLd />
      <FAQPageJsonLd questions={marketingFaqs} />

      {/* Hero Section */}
      <HeroSection />

      {/* Trust Bar */}
      <TrustBar />

      {/* Value Propositions */}
      <ValuePropositionGrid />

      {/* Packages Preview */}
      <PackagesPreview />

      {/* How It Works */}
      <ProcessTimeline />

      {/* Portfolio Preview */}
      <PortfolioPreview />

      {/* FAQ */}
      <FAQAccordion />

      {/* Final CTA */}
      <CTASection />
    </>
  )
}
