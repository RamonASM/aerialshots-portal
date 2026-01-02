import { Metadata } from 'next'
import Link from 'next/link'
import {
  Plane,
  Shield,
  Video,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Camera,
} from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Drone & Aerial Photography | Aerial Shots Media',
  description: 'FAA Part 107 certified drone photography and video for Central Florida real estate. Stunning aerial views that showcase properties and neighborhoods.',
  openGraph: {
    title: 'Drone & Aerial Photography | Aerial Shots Media',
    description: 'Licensed drone photography for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    icon: Shield,
    title: 'FAA Part 107 Certified',
    description: 'Fully licensed and insured commercial drone operators',
  },
  {
    icon: Video,
    title: '4K Video',
    description: 'Cinema-quality aerial video footage of your property',
  },
  {
    icon: Camera,
    title: 'High-Resolution Stills',
    description: '48MP aerial photography for stunning property views',
  },
  {
    icon: MapPin,
    title: 'Neighborhood Context',
    description: 'Show proximity to amenities, water, and landmarks',
  },
]

const equipment = [
  'DJI Mavic 3 Pro',
  'DJI Mini 4 Pro',
  'DJI Air 3',
  '4K/120fps Video',
  '48MP Photography',
  'Obstacle Avoidance',
]

export default function DronePage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: 'Drone & Aerial', url: `${SITE_URL}/services/drone` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 text-sm text-cyan-400 mb-6">
              <Plane className="h-4 w-4" />
              FAA Part 107 Licensed
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Aerial Views That
              <span className="block text-cyan-400">Captivate Buyers</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional drone photography and video that showcases properties
              from stunning perspectives buyers can&apos;t resist.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-8 py-3 font-medium text-white hover:bg-cyan-600 transition-colors"
              >
                Book Drone Shoot
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
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment & Compliance */}
      <section className="py-20 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Equipment */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Professional Equipment</h2>
              <p className="text-muted-foreground mb-6">
                We use the latest DJI drones for reliable, high-quality aerial media.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {equipment.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Fully Compliant</h2>
              <p className="text-muted-foreground mb-6">
                All operators are FAA certified with proper insurance coverage.
              </p>
              <ul className="space-y-3">
                {[
                  'FAA Part 107 Remote Pilot Certificate',
                  '$2M liability insurance coverage',
                  'LAANC authorization for controlled airspace',
                  'Compliance with all local regulations',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <Shield className="h-5 w-5 text-cyan-400 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Perfect For</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Waterfront Properties',
                description: 'Showcase water views, docks, and proximity to lakes or ocean',
              },
              {
                title: 'Large Estates',
                description: 'Capture the full scope of expansive properties and acreage',
              },
              {
                title: 'Neighborhood Context',
                description: 'Show nearby amenities, parks, and community features',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
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
            <Plane className="h-12 w-12 text-cyan-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready for Stunning Aerials?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Book your drone shoot today and give buyers a new perspective.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-8 py-3 font-medium text-white hover:bg-cyan-600 transition-colors"
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
