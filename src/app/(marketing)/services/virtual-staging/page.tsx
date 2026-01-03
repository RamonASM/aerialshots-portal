import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
    title: 'AI-Powered',
    description: 'Advanced AI technology for photorealistic results',
  },
  {
    title: 'Multiple Styles',
    description: 'Modern, traditional, coastal, and more design options',
  },
  {
    title: 'Fast Turnaround',
    description: '24-48 hour delivery on all staging orders',
  },
  {
    title: 'Revisions Included',
    description: 'Free revisions until you\'re completely satisfied',
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

const stagingProcess = [
  { step: 1, title: 'Upload Photos', description: 'Send us your empty room photos' },
  { step: 2, title: 'Choose Style', description: 'Select furniture and decor style' },
  { step: 3, title: 'Receive Staged Photos', description: '24-48 hour delivery' },
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
      <section className="relative pt-32 pb-24">
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-6">
              AI-Powered Staging
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-[1.0] tracking-[-0.02em] mb-6">
              Virtual Staging That<br />
              Transforms Spaces
            </h1>
            <p className="text-[17px] text-[#8A847F] max-w-xl mx-auto leading-relaxed mb-10">
              Turn empty or dated rooms into beautifully furnished spaces.
              Help buyers visualize their future home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center h-12 px-8 bg-[#A29991] hover:bg-[#B5ADA6] text-black text-[15px] font-medium transition-colors"
              >
                Order Staging
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
                Professional<br />Virtual Staging
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

      {/* Styles & Rooms */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Styles */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Styles
              </p>
              <h2 className="font-serif text-2xl text-white mb-6">Available Styles</h2>
              <p className="text-[15px] text-[#8A847F] mb-8">
                Choose from a variety of design styles to match the property.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {styles.map((style) => (
                  <div key={style} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                    <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
                    {style}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Types */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
                Rooms
              </p>
              <h2 className="font-serif text-2xl text-white mb-6">Room Types</h2>
              <p className="text-[15px] text-[#8A847F] mb-8">
                We can stage any room in the property.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {roomTypes.map((room) => (
                  <div key={room} className="flex items-center gap-3 text-[14px] text-[#B5ADA6]">
                    <span className="w-1.5 h-1.5 bg-[#A29991] rounded-full shrink-0" />
                    {room}
                  </div>
                ))}
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
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {stagingProcess.map((item) => (
              <div key={item.step} className="bg-black p-10 text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 border border-white/[0.12] text-[#A29991] text-[14px] font-medium mb-4">
                  {item.step}
                </span>
                <h3 className="text-[17px] font-medium text-white mb-2">{item.title}</h3>
                <p className="text-[14px] text-[#8A847F]">{item.description}</p>
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
              Ready to Stage Your Listing?
            </h2>
            <p className="text-[17px] text-[#8A847F] mb-10">
              Virtual staging at a fraction of the cost of physical staging.
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
