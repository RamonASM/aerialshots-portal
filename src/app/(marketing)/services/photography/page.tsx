import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BreadcrumbJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Real Estate Photography | Aerial Shots Media',
  description: 'Professional HDR real estate photography for Central Florida. Interior, exterior, and twilight shots that make your listings stand out.',
  openGraph: {
    title: 'Real Estate Photography | Aerial Shots Media',
    description: 'Professional HDR photography for Central Florida real estate.',
    type: 'website',
  },
}

const features = [
  {
    title: 'HDR Processing',
    description: 'Multiple exposures blended for perfectly balanced lighting in every room',
  },
  {
    title: 'Interior & Exterior',
    description: 'Complete coverage of your property from every angle',
  },
  {
    title: 'Twilight Photography',
    description: 'Stunning dusk shots that make properties glow',
  },
  {
    title: 'MLS Ready',
    description: 'Properly sized and formatted for all MLS systems',
  },
]

const shootingProcess = [
  { step: 1, title: 'Book Online', description: 'Select your package and schedule a time' },
  { step: 2, title: 'We Shoot', description: 'Professional photographer arrives on time' },
  { step: 3, title: 'HDR Editing', description: 'Expert color correction and enhancement' },
  { step: 4, title: 'Delivery', description: '24-hour turnaround to your portal' },
]

const included = [
  'Professional HDR processing',
  'Color correction and white balance',
  'Lens correction and straightening',
  'Sky replacement when needed',
  'MLS-ready sizing and formatting',
  '24-hour turnaround standard',
]

export default function PhotographyPage() {
  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  return (
    <main className="min-h-screen bg-black">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Services', url: `${SITE_URL}/services` },
          { name: 'Photography', url: `${SITE_URL}/services/photography` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              Photography
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Photography That<br />
              Sells Homes
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Professional HDR photography that captures every property in its best light.
              Our images help listings get more views and sell faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Book Photography
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
                What You Get
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-white leading-[1.1]">
                Professional-Grade<br />Equipment & Editing
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
                Every photography package includes professional editing and fast delivery.
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
            <div className="relative aspect-[4/3] bg-[#0a0a0a] border border-white/[0.06]">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#6a6765] text-[13px] uppercase tracking-[0.2em]">
                  Sample Gallery
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
              Process
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">
              Our Process
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-white/[0.06]">
            {shootingProcess.map((step) => (
              <div key={step.step} className="bg-black p-8 text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 border border-white/[0.12] text-[#A29991] text-[14px] font-medium mb-4">
                  {step.step}
                </span>
                <h3 className="text-[17px] font-medium text-white mb-2">{step.title}</h3>
                <p className="text-[14px] text-[#8A847F]">{step.description}</p>
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
              Book Your Photo Shoot Today
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Most shoots delivered within 24 hours. Same-day available.
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
