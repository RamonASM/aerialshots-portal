import { Metadata } from 'next'
import Link from 'next/link'
import {
  Sparkles,
  Wand2,
  Palette,
  Clock,
  CheckCircle2,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Virtual Staging | Aerial Shots Media',
  description: 'AI-powered virtual staging for Central Florida real estate. Transform empty rooms into beautifully furnished spaces that help buyers visualize their future home.',
  openGraph: {
    title: 'Virtual Staging | Aerial Shots Media',
    description: 'AI virtual staging for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    icon: Wand2,
    title: 'AI-Powered',
    description: 'Advanced AI technology for photorealistic results',
  },
  {
    icon: Palette,
    title: 'Multiple Styles',
    description: 'Modern, traditional, coastal, and more design options',
  },
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: '24-48 hour delivery on all staging orders',
  },
  {
    icon: Layers,
    title: 'Revisions Included',
    description: 'Free revisions until you&apos;re completely satisfied',
  },
]

const styles = [
  'Modern Contemporary',
  'Traditional',
  'Coastal/Beach',
  'Farmhouse',
  'Mid-Century Modern',
  'Scandinavian',
]

const roomTypes = [
  'Living Rooms',
  'Bedrooms',
  'Dining Rooms',
  'Home Offices',
  'Outdoor Spaces',
  'Kitchens',
]

export default function VirtualStagingPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: 'Virtual Staging', url: `${SITE_URL}/services/virtual-staging` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm text-amber-400 mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Staging
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Virtual Staging That
              <span className="block text-amber-400">Transforms Spaces</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Turn empty or dated rooms into beautifully furnished spaces.
              Help buyers visualize their future home.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-8 py-3 font-medium text-black hover:bg-amber-400 transition-colors"
              >
                Order Staging
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
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles & Rooms */}
      <section className="py-20 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Styles */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Available Styles</h2>
              <p className="text-muted-foreground mb-6">
                Choose from a variety of design styles to match the property.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {styles.map((style) => (
                  <div key={style} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-sm">{style}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Types */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Room Types</h2>
              <p className="text-muted-foreground mb-6">
                We can stage any room in the property.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {roomTypes.map((room) => (
                  <div key={room} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">{room}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Upload Photos', description: 'Send us your empty room photos' },
              { step: 2, title: 'Choose Style', description: 'Select furniture and decor style' },
              { step: 3, title: 'Receive Staged Photos', description: '24-48 hour delivery' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-black font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Sparkles className="h-12 w-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Stage Your Listing?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Virtual staging at a fraction of the cost of physical staging.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-8 py-3 font-medium text-black hover:bg-amber-400 transition-colors"
              >
                Order Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
