import { Metadata } from 'next'
import Link from 'next/link'
import {
  LayoutGrid,
  Ruler,
  Layers,
  FileText,
  CheckCircle2,
  ArrowRight,
  Box,
} from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Floor Plans | Aerial Shots Media',
  description: 'Professional 2D and 3D floor plans for Central Florida real estate. Accurate measurements and MLS-ready formats that help buyers understand property layouts.',
  openGraph: {
    title: 'Floor Plans | Aerial Shots Media',
    description: 'Professional floor plans for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    icon: Ruler,
    title: 'Accurate Measurements',
    description: 'Precise room dimensions captured with professional tools',
  },
  {
    icon: Layers,
    title: '2D & 3D Options',
    description: 'Traditional floor plans and 3D rendered views available',
  },
  {
    icon: FileText,
    title: 'MLS Ready',
    description: 'Properly formatted for all major MLS systems',
  },
  {
    icon: Box,
    title: 'Square Footage',
    description: 'Total and room-by-room square footage included',
  },
]

const floorPlanTypes = [
  {
    name: '2D Floor Plan',
    description: 'Clean, professional black and white floor plan',
    features: ['Room dimensions', 'Total square footage', 'MLS ready format'],
  },
  {
    name: '3D Floor Plan',
    description: 'Rendered 3D view with furniture placement',
    features: ['Realistic 3D rendering', 'Furniture visualization', 'Color options'],
  },
  {
    name: 'Site Plan',
    description: 'Property lot layout with structures and features',
    features: ['Lot boundaries', 'Structure placement', 'Outdoor features'],
  },
]

export default function FloorPlansPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: 'Floor Plans', url: `${SITE_URL}/services/floor-plans` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-4 py-2 text-sm text-[#a1a1a6] mb-6">
              <LayoutGrid className="h-4 w-4" />
              Professional Floor Plans
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Floor Plans That
              <span className="block text-gradient">Show the Full Picture</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Help buyers understand property layouts with accurate 2D and 3D floor plans
              that complement your photos and virtual tours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-[#ff4533] px-8 py-3 font-medium text-white hover:bg-[#e63d2e] transition-colors"
              >
                Order Floor Plan
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
                <div className="h-12 w-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white/70" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floor Plan Types */}
      <section className="py-20 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Floor Plan Options</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Choose the format that best suits your listing needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {floorPlanTypes.map((type) => (
              <div
                key={type.name}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">{type.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{type.description}</p>
                <ul className="space-y-2">
                  {type.features.map((feature) => (
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

      {/* What's Included */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground">What&apos;s Included</h2>
              <p className="mt-4 text-muted-foreground">
                Every floor plan includes professional measurement and formatting.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Professional on-site measurement',
                  'Accurate room dimensions',
                  'Total square footage calculation',
                  'Room labels and layout',
                  'Multiple file formats (PDF, JPG, PNG)',
                  'MLS-compliant sizing',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
              <LayoutGrid className="h-20 w-20 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <LayoutGrid className="h-12 w-12 text-white/60 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Add Floor Plans?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Help buyers understand the layout before they even visit.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-[#ff4533] px-8 py-3 font-medium text-white hover:bg-[#e63d2e] transition-colors"
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
