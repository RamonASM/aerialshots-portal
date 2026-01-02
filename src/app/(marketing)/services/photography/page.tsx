import { Metadata } from 'next'
import Link from 'next/link'
import {
  Camera,
  Sun,
  Moon,
  Layers,
  CheckCircle2,
  ArrowRight,
  Clock,
  Image as ImageIcon,
} from 'lucide-react'
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
    icon: Layers,
    title: 'HDR Processing',
    description: 'Multiple exposures blended for perfectly balanced lighting in every room',
  },
  {
    icon: Sun,
    title: 'Interior & Exterior',
    description: 'Complete coverage of your property from every angle',
  },
  {
    icon: Moon,
    title: 'Twilight Photography',
    description: 'Stunning dusk shots that make properties glow',
  },
  {
    icon: ImageIcon,
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
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-sm text-blue-400 mb-6">
              <Camera className="h-4 w-4" />
              Professional Photography
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Photography That
              <span className="block text-blue-400">Sells Homes</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional HDR photography that captures every property in its best light.
              Our images help listings get more views and sell faster.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Book Photography
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">What You Get</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Every photo shoot includes professional-grade equipment and expert editing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground">What&apos;s Included</h2>
              <p className="mt-4 text-muted-foreground">
                Every photography package includes professional editing and fast delivery.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Professional HDR processing',
                  'Color correction and white balance',
                  'Lens correction and straightening',
                  'Sky replacement when needed',
                  'MLS-ready sizing and formatting',
                  '24-hour turnaround standard',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
              <Camera className="h-20 w-20 text-muted-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Our Process</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              From booking to delivery, we make it easy.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {shootingProcess.map((step) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Clock className="h-12 w-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground">
              Book Your Photo Shoot Today
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most shoots delivered within 24 hours. Same-day available.
            </p>
            <div className="mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
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
