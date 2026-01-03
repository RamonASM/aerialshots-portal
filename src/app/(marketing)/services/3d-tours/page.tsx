import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
    title: 'Immersive Experience',
    description: 'Virtual walkthroughs that feel like being there in person',
  },
  {
    title: 'Works Everywhere',
    description: 'Desktop, mobile, and VR headset compatible',
  },
  {
    title: 'Reach More Buyers',
    description: 'Let out-of-town buyers tour properties remotely',
  },
  {
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

const stats = [
  { value: '95%', label: 'Buyers use virtual tours' },
  { value: '300%', label: 'More listing engagement' },
  { value: '31%', label: 'Faster sales with 3D' },
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
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              Virtual Tours
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              3D Tours That<br />
              Sell Properties
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Let buyers explore every room from anywhere in the world.
              Matterport and Zillow 3D Home tours that drive engagement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book 3D Tour
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
                Benefits
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1]">
                Immersive<br />Virtual Tours
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

      {/* Platforms */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Platforms
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">
              3D Tour Options
            </h2>
            <p className="text-[15px] text-[#8A847F] mt-4 max-w-xl mx-auto">
              We offer industry-leading 3D capture solutions for every need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06]">
            {platforms.map((platform, index) => (
              <div key={platform.name} className="bg-black p-10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6765] mb-4 block">
                  0{index + 1}
                </span>
                <h3 className="font-serif text-2xl text-white mb-2">{platform.name}</h3>
                <p className="text-[15px] text-[#8A847F] mb-6">{platform.description}</p>
                <ul className="space-y-3">
                  {platform.features.map((feature) => (
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

      {/* Stats */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-black p-12 text-center">
                <div className="font-serif text-5xl text-white mb-3">{stat.value}</div>
                <div className="text-[14px] text-[#8A847F]">{stat.label}</div>
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
              Give Buyers the Full Experience
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Book a 3D tour and let properties sell themselves.
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
