import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
    title: 'FAA Part 107 Certified',
    description: 'Fully licensed and insured commercial drone operators',
  },
  {
    title: '4K Video',
    description: 'Cinema-quality aerial video footage of your property',
  },
  {
    title: 'High-Resolution Stills',
    description: '48MP aerial photography for stunning property views',
  },
  {
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

const compliance = [
  'FAA Part 107 Remote Pilot Certificate',
  '$2M liability insurance coverage',
  'LAANC authorization for controlled airspace',
  'Compliance with all local regulations',
]

const useCases = [
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
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              FAA Part 107 Licensed
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Aerial Views That<br />
              Captivate Buyers
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Professional drone photography and video that showcases properties
              from stunning perspectives buyers can&apos;t resist.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book Drone Shoot
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
                Capabilities
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1]">
                Professional<br />Aerial Media
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

      {/* Equipment & Compliance */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Equipment */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Equipment
              </p>
              <h2 className="font-serif text-2xl text-white mb-6">Professional Gear</h2>
              <p className="text-[15px] text-[#8A847F] mb-8">
                We use the latest DJI drones for reliable, high-quality aerial media.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {equipment.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                    <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Compliance
              </p>
              <h2 className="font-serif text-2xl text-white mb-6">Fully Compliant</h2>
              <p className="text-[15px] text-[#8A847F] mb-8">
                All operators are FAA certified with proper insurance coverage.
              </p>
              <ul className="space-y-4">
                {compliance.map((item) => (
                  <li key={item} className="flex items-center gap-4 text-[14px] text-[#B5ADA6]">
                    <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Ideal For
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">
              Perfect For
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {useCases.map((item, index) => (
              <div key={item.title} className="bg-black p-10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4 block">
                  0{index + 1}
                </span>
                <h3 className="font-serif text-xl text-white mb-3">{item.title}</h3>
                <p className="text-[15px] text-[#8A847F]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-white/[0.06]">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
              Ready for Stunning Aerials?
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Book your drone shoot today and give buyers a new perspective.
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
