import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
    title: 'Accurate Measurements',
    description: 'Precise room dimensions captured with professional tools',
  },
  {
    title: '2D & 3D Options',
    description: 'Traditional floor plans and 3D rendered views available',
  },
  {
    title: 'MLS Ready',
    description: 'Properly formatted for all major MLS systems',
  },
  {
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

const included = [
  'Professional on-site measurement',
  'Accurate room dimensions',
  'Total square footage calculation',
  'Room labels and layout',
  'Multiple file formats (PDF, JPG, PNG)',
  'MLS-compliant sizing',
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
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              Floor Plans
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Floor Plans That<br />
              Show the Full Picture
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Help buyers understand property layouts with accurate 2D and 3D floor plans
              that complement your photos and virtual tours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Order Floor Plan
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
                Professional<br />Floor Plans
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

      {/* Floor Plan Types */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Options
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">
              Floor Plan Options
            </h2>
            <p className="text-[15px] text-[#8A847F] mt-4 max-w-xl mx-auto">
              Choose the format that best suits your listing needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {floorPlanTypes.map((type, index) => (
              <div key={type.name} className="bg-black p-10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4 block">
                  0{index + 1}
                </span>
                <h3 className="font-serif text-xl text-white mb-2">{type.name}</h3>
                <p className="text-[14px] text-[#8A847F] mb-6">{type.description}</p>
                <ul className="space-y-3">
                  {type.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                      <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
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
                Every floor plan includes professional measurement and formatting.
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
            <div className="relative aspect-square bg-[#0a0a0a] border border-white/[0.06]">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#6a6765] text-[13px] uppercase tracking-[0.2em]">
                  Sample Floor Plan
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
              Ready to Add Floor Plans?
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Help buyers understand the layout before they even visit.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
            >
              Order Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
