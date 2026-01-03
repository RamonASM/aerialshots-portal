import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Video Tours | Aerial Shots Media',
  description: 'Cinematic real estate video tours for Central Florida properties. Professional property walkthroughs that engage buyers and drive showings.',
  openGraph: {
    title: 'Video Tours | Aerial Shots Media',
    description: 'Cinematic property video tours for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    title: 'Cinematic Style',
    description: 'Smooth gimbal footage with professional color grading',
  },
  {
    title: 'Licensed Music',
    description: 'Royalty-free background tracks included at no extra cost',
  },
  {
    title: 'Social Ready',
    description: 'Optimized exports for Instagram, YouTube, and MLS',
  },
  {
    title: 'Quick Turnaround',
    description: 'Standard delivery within 48 hours',
  },
]

const videoTypes = [
  {
    name: 'Listing Video',
    duration: '60-90 seconds',
    description: 'Full property walkthrough with transitions and music',
  },
  {
    name: 'Signature Video',
    duration: '2-3 minutes',
    description: 'Cinematic tour with drone, slow motion, and agent intro',
  },
  {
    name: 'Social Clips',
    duration: '15-30 seconds',
    description: 'Vertical format clips optimized for Reels and Stories',
  },
]

const included = [
  'Professional gimbal-stabilized footage',
  'Color grading and correction',
  'Licensed background music',
  'Text overlays and branding',
  'Horizontal and vertical exports',
  'MLS, YouTube, and social formats',
]

export default function VideoPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: 'Video Tours', url: `${SITE_URL}/services/video` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              Cinematic Tours
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Video That Tells<br />
              Your Property&apos;s Story
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Cinematic video tours that capture attention, drive engagement,
              and help properties sell faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book Video Tour
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center h-12 px-8 border border-white/[0.12] hover:border-white/[0.24] text-white text-[15px] font-medium transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid lg:grid-cols-[1fr,2fr] gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Features
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1]">
                Professional<br />Video Production
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-12">
              {features.map((feature, index) => (
                <div key={feature.title}>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-3 block">
                    0{index + 1}
                  </span>
                  <h3 className="text-[17px] font-medium text-white mb-2">{feature.title}</h3>
                  <p className="text-[15px] text-[#8A847F]">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Video Types */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Options
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">
              Video Options
            </h2>
            <p className="text-[15px] text-[#8A847F] mt-4 max-w-xl mx-auto">
              Choose the video style that fits your listing and marketing needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {videoTypes.map((type, index) => (
              <div key={type.name} className="bg-black p-10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4 block">
                  0{index + 1}
                </span>
                <h3 className="font-serif text-xl text-white mb-1">{type.name}</h3>
                <p className="text-[13px] text-[#A29991] mb-4">{type.duration}</p>
                <p className="text-[15px] text-[#8A847F]">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Included
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1] mb-6">
                What&apos;s Included
              </h2>
              <p className="text-[17px] text-[#8A847F] mb-8">
                Every video includes professional editing and multiple format exports.
              </p>
              <ul className="space-y-4">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-4 text-[15px] text-[#B5ADA6]">
                    <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-video bg-[#0a0a0a] border border-white/[0.06]">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#6a6765] text-[13px] uppercase tracking-[0.2em]">
                  Video Preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-white/[0.06]">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
              Ready for Video That Converts?
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Give buyers a reason to schedule a showing with cinematic video.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
            >
              Book Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
