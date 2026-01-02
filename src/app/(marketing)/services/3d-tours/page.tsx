import { Metadata } from 'next'
import Link from 'next/link'
import {
  Home,
  Eye,
  Smartphone,
  Globe,
  CheckCircle2,
  ArrowRight,
  Box,
} from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: '3D Tours | Aerial Shots Media',
  description: 'Matterport and Zillow 3D Home tours for Central Florida real estate. Immersive virtual walkthroughs that let buyers explore properties anytime.',
  openGraph: {
    title: '3D Tours | Aerial Shots Media',
    description: 'Immersive 3D virtual tours for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    icon: Eye,
    title: 'Immersive Experience',
    description: 'Virtual walkthroughs that feel like being there in person',
  },
  {
    icon: Smartphone,
    title: 'Works Everywhere',
    description: 'Desktop, mobile, and VR headset compatible',
  },
  {
    icon: Globe,
    title: 'Reach More Buyers',
    description: 'Let out-of-town buyers tour properties remotely',
  },
  {
    icon: Box,
    title: 'Dollhouse View',
    description: '3D floorplan model for complete property overview',
  },
]

const platforms = [
  {
    name: 'Matterport',
    description: 'Industry-leading 3D capture with measurement tools',
    features: ['Dollhouse & floor plan views', 'Measurement tools', 'VR compatible'],
  },
  {
    name: 'Zillow 3D Home',
    description: 'Optimized for Zillow listing visibility and engagement',
    features: ['Zillow integration', 'Higher listing visibility', 'Mobile friendly'],
  },
]

export default function ThreeDToursPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: '3D Tours', url: `${SITE_URL}/services/3d-tours` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-400 mb-6">
              <Home className="h-4 w-4" />
              Virtual Property Tours
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              3D Tours That
              <span className="block text-green-400">Sell Properties</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Let buyers explore every room from anywhere in the world.
              Matterport and Zillow 3D Home tours that drive engagement.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-green-500 px-8 py-3 font-medium text-white hover:bg-green-600 transition-colors"
              >
                Book 3D Tour
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
                <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-20 bg-gradient-to-b from-transparent via-green-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">3D Tour Options</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              We offer industry-leading 3D capture solutions for every need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">{platform.name}</h3>
                <p className="text-muted-foreground mb-4">{platform.description}</p>
                <ul className="space-y-2">
                  {platform.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { value: '95%', label: 'Buyers use virtual tours' },
              { value: '300%', label: 'More listing engagement' },
              { value: '31%', label: 'Faster sales with 3D' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Home className="h-12 w-12 text-green-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Give Buyers the Full Experience
            </h2>
            <p className="mt-4 text-muted-foreground">
              Book a 3D tour and let properties sell themselves.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-green-500 px-8 py-3 font-medium text-white hover:bg-green-600 transition-colors"
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
