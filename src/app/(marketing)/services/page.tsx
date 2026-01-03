import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Services | Aerial Shots Media',
  description: 'Professional real estate photography, drone aerial, video tours, 3D Matterport tours, virtual staging, and floor plans for Central Florida properties.',
  openGraph: {
    title: 'Our Services | Aerial Shots Media',
    description: 'Complete real estate media services for Central Florida agents.',
    type: 'website',
  },
}

const services = [
  {
    name: 'Photography',
    slug: 'photography',
    description: 'Professional HDR photography that makes every room look its best',
    features: ['HDR Processing', 'Interior & Exterior', 'Twilight Shots'],
  },
  {
    name: 'Drone & Aerial',
    slug: 'drone',
    description: 'FAA Part 107 certified aerial photography and video',
    features: ['FAA Licensed', '4K Video', 'Property & Neighborhood'],
  },
  {
    name: 'Video Tours',
    slug: 'video',
    description: 'Cinematic property tours that capture buyer attention',
    features: ['Cinematic Style', 'Social Media Ready', 'Licensed Music'],
  },
  {
    name: '3D Tours',
    slug: '3d-tours',
    description: 'Immersive Matterport and Zillow 3D Home tours',
    features: ['Matterport Pro3', 'Zillow 3D Home', 'Virtual Walkthroughs'],
  },
  {
    name: 'Virtual Staging',
    slug: 'virtual-staging',
    description: 'AI-powered virtual staging for empty or dated spaces',
    features: ['AI-Powered', 'Multiple Styles', '24-48hr Turnaround'],
  },
  {
    name: 'Floor Plans',
    slug: 'floor-plans',
    description: 'Professional 2D and 3D floor plans with accurate measurements',
    features: ['2D & 3D Options', 'Accurate Measurements', 'MLS Ready'],
  },
]

export default function ServicesPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              Our Services
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Real Estate Media<br />
              Done Right
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed">
              From stunning photography to immersive 3D tours, we provide everything
              you need to market properties and close deals faster.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06]">
            {services.map((service, index) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group bg-black p-10 transition-colors hover:bg-[#0a0a0a]"
              >
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4 block">
                  0{index + 1}
                </span>

                <h2 className="font-serif text-2xl text-white mb-3 group-hover:text-[#A29991] transition-colors">
                  {service.name}
                </h2>
                <p className="text-[15px] text-[#8A847F] mb-6 leading-relaxed">
                  {service.description}
                </p>

                <ul className="space-y-2 mb-8">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[14px] text-[#6a6765]">
                      <span className="w-1 h-1 bg-[#A29991] rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <span className="inline-flex items-center gap-2 text-[13px] text-[#A29991] font-medium group-hover:gap-3 transition-all">
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-32 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid lg:grid-cols-[1fr,2fr] gap-16">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Why Us
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1]">
                Why Choose<br />Aerial Shots Media
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-12">
              {[
                { title: '24-Hour Turnaround', description: 'Most orders delivered next day' },
                { title: 'FAA Certified', description: 'Licensed Part 107 drone pilots' },
                { title: 'MLS Ready', description: 'Properly sized and formatted' },
                { title: '100% Satisfaction', description: 'Free re-shoots if needed' },
              ].map((item, index) => (
                <div key={item.title}>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-3 block">
                    0{index + 1}
                  </span>
                  <h3 className="text-[17px] font-medium text-white mb-2">{item.title}</h3>
                  <p className="text-[15px] text-[#8A847F]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 border-t border-white/[0.06]">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Book your shoot today and see the difference professional media makes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book a Shoot
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
    </main>
  )
}
