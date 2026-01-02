import { Metadata } from 'next'
import Link from 'next/link'
import {
  Camera,
  Plane,
  Video,
  Home,
  Sparkles,
  LayoutGrid,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
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
    icon: Camera,
    color: 'blue',
    features: ['HDR Processing', 'Interior & Exterior', 'Twilight Shots'],
    cta: 'Learn More',
  },
  {
    name: 'Drone & Aerial',
    slug: 'drone',
    description: 'FAA Part 107 certified aerial photography and video',
    icon: Plane,
    color: 'cyan',
    features: ['FAA Licensed', '4K Video', 'Property & Neighborhood'],
    cta: 'Learn More',
  },
  {
    name: 'Video Tours',
    slug: 'video',
    description: 'Cinematic property tours that capture buyer attention',
    icon: Video,
    color: 'purple',
    features: ['Cinematic Style', 'Social Media Ready', 'Licensed Music'],
    cta: 'Learn More',
  },
  {
    name: '3D Tours',
    slug: '3d-tours',
    description: 'Immersive Matterport and Zillow 3D Home tours',
    icon: Home,
    color: 'green',
    features: ['Matterport Pro3', 'Zillow 3D Home', 'Virtual Walkthroughs'],
    cta: 'Learn More',
  },
  {
    name: 'Virtual Staging',
    slug: 'virtual-staging',
    description: 'AI-powered virtual staging for empty or dated spaces',
    icon: Sparkles,
    color: 'amber',
    features: ['AI-Powered', 'Multiple Styles', '24-48hr Turnaround'],
    cta: 'Learn More',
  },
  {
    name: 'Floor Plans',
    slug: 'floor-plans',
    description: 'Professional 2D and 3D floor plans with accurate measurements',
    icon: LayoutGrid,
    color: 'rose',
    features: ['2D & 3D Options', 'Accurate Measurements', 'MLS Ready'],
    cta: 'Learn More',
  },
]

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 group-hover:bg-cyan-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:bg-purple-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20',
}

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
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Real Estate Media
              <span className="block text-blue-400">Done Right</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              From stunning photography to immersive 3D tours, we provide everything
              you need to market properties and close deals faster.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 border-t border-white/5">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6 transition-all duration-200 hover:border-white/[0.16] hover:bg-[#1c1c1e]/80"
              >
                <div className={`h-12 w-12 rounded-xl border ${colorClasses[service.color]} flex items-center justify-center mb-4 transition-colors`}>
                  <service.icon className="h-6 w-6" />
                </div>

                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {service.name}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  {service.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
                  {service.cta}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">
              Why Choose Aerial Shots Media?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              We combine professional equipment, artistic vision, and fast turnaround
              to deliver media that helps you sell homes faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: '24-Hour Turnaround', description: 'Most orders delivered next day' },
              { title: 'FAA Certified', description: 'Licensed Part 107 drone pilots' },
              { title: 'MLS Ready', description: 'Properly sized and formatted' },
              { title: '100% Satisfaction', description: 'Free re-shoots if needed' },
            ].map((item) => (
              <div key={item.title} className="text-center p-6">
                <div className="text-lg font-semibold text-foreground mb-2">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Book your shoot today and see the difference professional media makes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Book a Shoot
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
    </main>
  )
}
