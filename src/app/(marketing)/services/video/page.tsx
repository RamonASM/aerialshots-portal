import { Metadata } from 'next'
import Link from 'next/link'
import {
  Video,
  Film,
  Music,
  Share2,
  CheckCircle2,
  ArrowRight,
  Play,
} from 'lucide-react'
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
    icon: Film,
    title: 'Cinematic Style',
    description: 'Smooth gimbal footage with professional color grading',
  },
  {
    icon: Music,
    title: 'Licensed Music',
    description: 'Royalty-free background tracks included at no extra cost',
  },
  {
    icon: Share2,
    title: 'Social Ready',
    description: 'Optimized exports for Instagram, YouTube, and MLS',
  },
  {
    icon: Play,
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
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-2 text-sm text-purple-400 mb-6">
              <Video className="h-4 w-4" />
              Cinematic Property Tours
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Video That Tells
              <span className="block text-purple-400">Your Property&apos;s Story</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Cinematic video tours that capture attention, drive engagement,
              and help properties sell faster.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-purple-500 px-8 py-3 font-medium text-white hover:bg-purple-600 transition-colors"
              >
                Book Video Tour
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Types */}
      <section className="py-20 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Video Options</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Choose the video style that fits your listing and marketing needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {videoTypes.map((type) => (
              <div
                key={type.name}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <h3 className="font-semibold text-foreground mb-1">{type.name}</h3>
                <div className="text-sm text-purple-400 mb-3">{type.duration}</div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground">What&apos;s Included</h2>
              <p className="mt-4 text-muted-foreground">
                Every video includes professional editing and multiple format exports.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Professional gimbal-stabilized footage',
                  'Color grading and correction',
                  'Licensed background music',
                  'Text overlays and branding',
                  'Horizontal and vertical exports',
                  'MLS, YouTube, and social formats',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
              <Play className="h-20 w-20 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Video className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready for Video That Converts?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Give buyers a reason to schedule a showing with cinematic video.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-purple-500 px-8 py-3 font-medium text-white hover:bg-purple-600 transition-colors"
              >
                Book Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
