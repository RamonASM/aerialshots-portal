import { Suspense } from 'react'
import { Metadata } from 'next'
import { Camera, Video, Plane, Home, Sparkles, Image as ImageIcon } from 'lucide-react'
import { PortfolioClient } from './PortfolioClient'
import {
  getPortfolioItems,
  getPortfolioStats,
  getStagingExamples,
} from '@/lib/queries/portfolio'
import {
  ImageGalleryJsonLd,
  BreadcrumbJsonLd,
  COMPANY_INFO,
} from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Portfolio | Aerial Shots Media',
  description: 'View our portfolio of professional real estate photography, video, drone, 3D tours, and virtual staging for Central Florida properties.',
  openGraph: {
    title: 'Portfolio | Aerial Shots Media',
    description: 'Professional real estate media for Central Florida',
    type: 'website',
  },
}

export default async function PortfolioPage() {
  const [items, stats, stagingExamples] = await Promise.all([
    getPortfolioItems(),
    getPortfolioStats(),
    getStagingExamples(),
  ])

  const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aerialshots.media'

  // Transform portfolio items to image gallery format for JSON-LD
  const galleryImages = items
    .filter(item => item.thumbnail)
    .slice(0, 20) // Limit for schema
    .map(item => ({
      url: item.thumbnail,
      caption: item.title || `${COMPANY_INFO.name} Portfolio`,
    }))

  return (
    <main className="min-h-screen bg-black">
      {/* Structured Data for SEO */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Portfolio', url: `${SITE_URL}/portfolio` },
        ]}
      />
      <ImageGalleryJsonLd
        name="Real Estate Photography Portfolio"
        description="Professional real estate photography, video, drone aerial, 3D tours, and virtual staging portfolio from Aerial Shots Media."
        images={galleryImages}
      />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
              Our Work
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Professional real estate media that sells homes faster.
              Browse our portfolio of photography, video, drone, and virtual staging.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={Camera}
              value={stats.totalPhotos}
              label="Photos"
              color="blue"
            />
            <StatCard
              icon={Video}
              value={stats.totalVideos}
              label="Videos"
              color="purple"
            />
            <StatCard
              icon={Plane}
              value={stats.totalDrone}
              label="Aerial Shots"
              color="cyan"
            />
            <StatCard
              icon={Home}
              value={stats.total3DTours}
              label="3D Tours"
              color="green"
            />
            <StatCard
              icon={Sparkles}
              value={stats.totalStaged}
              label="Staged Rooms"
              color="amber"
            />
            <StatCard
              icon={ImageIcon}
              value={stats.totalListings}
              label="Properties"
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-16">
        <div className="container">
          <Suspense fallback={<PortfolioSkeleton />}>
            <PortfolioClient
              items={items}
              stagingExamples={stagingExamples}
            />
          </Suspense>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-t from-blue-500/5 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Showcase Your Listing?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Get professional media that helps your properties stand out and sell faster.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/book/listing"
                className="inline-flex items-center justify-center rounded-full bg-blue-500 px-8 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Book a Shoot
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-neutral-800 px-8 py-3 font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Camera
  value: number
  label: string
  color: 'blue' | 'purple' | 'cyan' | 'green' | 'amber' | 'rose'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }

  return (
    <div className={`rounded-xl border p-4 text-center ${colorClasses[color]}`}>
      <Icon className="h-6 w-6 mx-auto mb-2" />
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  )
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filter skeleton */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-24 rounded-full bg-neutral-800 animate-pulse" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-neutral-800 animate-pulse"
            style={{ height: `${200 + Math.random() * 150}px` }}
          />
        ))}
      </div>
    </div>
  )
}
