import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCommunityBySlug, getListingsInCommunity, getFeaturedAgents } from '@/lib/queries/communities'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { CommunityHero } from '@/components/community/CommunityHero'
import { OverviewSection } from '@/components/community/OverviewSection'
import { MarketSnapshot } from '@/components/community/MarketSnapshot'
import { SubdivisionsGrid } from '@/components/community/SubdivisionsGrid'
import { SchoolsSection } from '@/components/community/SchoolsSection'
import { FeaturedAgents } from '@/components/community/FeaturedAgents'
import { ActiveListings } from '@/components/community/ActiveListings'
import { CommunityLifestyle } from '@/components/community/CommunityLifestyle'
import { CommunityLeadForm } from '@/components/community/CommunityLeadForm'
import { CommunityJsonLd } from '@/components/community/CommunityJsonLd'
import { Loader2 } from 'lucide-react'

interface CommunityPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params
  const community = await getCommunityBySlug(slug)

  if (!community) {
    return {
      title: 'Community Not Found',
    }
  }

  const title = community.meta_title || `${community.name} | Homes & Real Estate`
  const description = community.meta_description || community.tagline || `Explore homes for sale in ${community.name}, ${community.state}. Find your dream home in this beautiful community.`

  return {
    title,
    description,
    keywords: [
      community.focus_keyword,
      ...(community.secondary_keywords || []),
      `${community.name} homes for sale`,
      `${community.name} real estate`,
      `${community.city} FL homes`,
    ].filter(Boolean) as string[],
    openGraph: {
      title: community.name,
      description: community.tagline || description,
      type: 'website',
      images: community.hero_image_url
        ? [{ url: community.hero_image_url, width: 1200, height: 630 }]
        : [],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: community.name,
      description: community.tagline || description,
      images: community.hero_image_url ? [community.hero_image_url] : [],
    },
    alternates: {
      canonical: `https://app.aerialshots.media/community/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

function LoadingSection() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
    </div>
  )
}

async function LifestyleData({ lat, lng }: { lat: number; lng: number }) {
  const [nearbyPlaces, events, curatedItems] = await Promise.all([
    getAllNearbyPlaces(lat, lng).catch(() => null),
    searchLocalEvents(lat, lng).catch(() => []),
    getCuratedItemsNearLocation(lat, lng, 10).catch(() => []),
  ])

  return (
    <CommunityLifestyle
      nearbyPlaces={nearbyPlaces}
      events={events}
      curatedItems={curatedItems}
      lat={lat}
      lng={lng}
    />
  )
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params
  const community = await getCommunityBySlug(slug)

  if (!community) {
    notFound()
  }

  // Fetch related data in parallel
  const [listings, featuredAgents] = await Promise.all([
    getListingsInCommunity(community.lat, community.lng, 5),
    getFeaturedAgents(community.featured_agent_ids || []),
  ])

  return (
    <>
      <CommunityJsonLd community={community} />

      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <CommunityHero
          name={community.name}
          tagline={community.tagline}
          heroImage={community.hero_image_url}
          galleryImages={community.gallery_urls || []}
          quickFacts={community.quick_facts}
          city={community.city}
          state={community.state}
        />

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Overview */}
              <OverviewSection
                name={community.name}
                description={community.description}
                overviewContent={community.overview_content}
                quickFacts={community.quick_facts}
              />

              {/* Subdivisions */}
              {community.subdivisions && community.subdivisions.length > 0 && (
                <SubdivisionsGrid
                  subdivisions={community.subdivisions}
                  communityName={community.name}
                />
              )}

              {/* Schools */}
              {community.schools_info && (
                <SchoolsSection schoolsInfo={community.schools_info} />
              )}

              {/* Lifestyle - Places, Events, What's Coming */}
              <Suspense fallback={<LoadingSection />}>
                <LifestyleData lat={community.lat} lng={community.lng} />
              </Suspense>

              {/* Active Listings */}
              {listings.length > 0 && (
                <ActiveListings
                  listings={listings}
                  communityName={community.name}
                />
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-8">
              {/* Market Snapshot */}
              <MarketSnapshot
                marketData={community.market_snapshot}
                communityName={community.name}
              />

              {/* Featured Agents */}
              {featuredAgents.length > 0 && (
                <FeaturedAgents agents={featuredAgents} />
              )}

              {/* Lead Capture Form */}
              <CommunityLeadForm
                communityName={community.name}
                communityId={community.id}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-neutral-50 py-8">
          <div className="mx-auto max-w-7xl px-4 text-center text-sm text-neutral-500">
            <p>
              Powered by{' '}
              <a
                href="https://www.aerialshots.media"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Aerial Shots Media
              </a>
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
