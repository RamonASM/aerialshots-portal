import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCommunityBySlug, getListingsInCommunity, getFeaturedAgents } from '@/lib/queries/communities'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { getLifeHereData, type LifeHereData } from '@/lib/queries/life-here'
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
import {
  LocationScoresCard,
  ThemeParksSection,
  CommuteSection,
  DiningSection,
  MoviesSection,
  NewsSection,
} from '@/components/life-here'
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
      <Loader2 className="h-8 w-8 animate-spin text-[#636366]" />
    </div>
  )
}

async function LifestyleData({ lat, lng, communityName }: { lat: number; lng: number; communityName: string }) {
  const [nearbyPlaces, events, curatedItems, lifeHereData] = await Promise.all([
    getAllNearbyPlaces(lat, lng).catch(() => null),
    searchLocalEvents(lat, lng).catch(() => []),
    getCuratedItemsNearLocation(lat, lng, 10).catch(() => []),
    getLifeHereData(lat, lng, communityName).catch(() => null),
  ])

  return (
    <div className="space-y-8">
      <CommunityLifestyle
        nearbyPlaces={nearbyPlaces}
        events={events}
        curatedItems={curatedItems}
        lat={lat}
        lng={lng}
      />

      {/* Life Here - Extended Data Sections */}
      {lifeHereData && (
        <div className="space-y-8">
          {/* Location Scores */}
          {lifeHereData.scores && (
            <LocationScoresCard
              walkScore={lifeHereData.scores.walkScore}
              transitScore={lifeHereData.scores.transitScore}
              bikeScore={lifeHereData.scores.bikeScore}
              overall={lifeHereData.scores.overall}
            />
          )}

          {/* Theme Parks */}
          {lifeHereData.themeparks.length > 0 && (
            <ThemeParksSection parks={lifeHereData.themeparks} />
          )}

          {/* Commute & Travel Times */}
          {lifeHereData.commute && (
            <CommuteSection
              airports={lifeHereData.commute.airports}
              beaches={lifeHereData.commute.beaches}
              destinations={lifeHereData.commute.destinations}
              summary={lifeHereData.commute.summary}
            />
          )}

          {/* Dining */}
          {lifeHereData.dining && (
            <DiningSection dining={lifeHereData.dining} />
          )}

          {/* Movies & Theaters */}
          {lifeHereData.movies && (
            <MoviesSection movies={lifeHereData.movies} />
          )}

          {/* Local News */}
          {lifeHereData.news && (
            <NewsSection news={lifeHereData.news} />
          )}
        </div>
      )}
    </div>
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

      <main className="min-h-screen bg-black">
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

              {/* Lifestyle - Places, Events, What's Coming, Life Here */}
              <Suspense fallback={<LoadingSection />}>
                <LifestyleData
                  lat={community.lat}
                  lng={community.lng}
                  communityName={community.name}
                />
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
        <footer className="border-t border-white/[0.08] bg-[#0a0a0a] py-10 pb-24 lg:pb-10">
          <div className="mx-auto max-w-7xl px-4 text-center text-[13px] text-[#636366]">
            <p>
              Powered by{' '}
              <a
                href="https://www.aerialshots.media"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0077ff] hover:text-[#3395ff] transition-colors"
              >
                Aerial Shots Media
              </a>
            </p>
          </div>
        </footer>

        {/* Mobile Floating CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-black/90 backdrop-blur-xl p-4 lg:hidden">
          <a
            href="#community-lead-form"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0077ff] text-base font-medium text-white transition-all hover:bg-[#0062cc]"
          >
            Get Community Info
          </a>
        </div>
      </main>
    </>
  )
}
