import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getListingById, organizeMediaByCategory } from '@/lib/queries/listings'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getLifeHereData } from '@/lib/queries/life-here'
import { MarketingFooter } from '@/components/marketing/footer/MarketingFooter'
import type { AgentSocialLinks } from '@/lib/supabase/types-custom'
import {
  PropertyHero,
  PropertyDetails,
  PhotoGallery,
  LifeHereSection,
  EventsSection,
  WhatsComingSection,
  LeadCaptureForm,
  AgentContactCard,
  MobileContactCTA,
  PropertyPageTracker,
} from '@/components/property'
import {
  LocationScoresCard,
  ThemeParksSection,
  CommuteSection,
  DiningSection,
  MoviesSection,
  NewsSection,
} from '@/components/life-here'
import { ShareButton } from '@/components/ui/share-button'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ listingId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingId } = await params
  const listing = await getListingById(listingId)

  if (!listing) {
    return {
      title: 'Property Not Found | Aerial Shots Media',
    }
  }

  const priceStr = listing.price
    ? ` - $${listing.price.toLocaleString()}`
    : ''
  const bedsStr = listing.beds ? `${listing.beds} bed` : ''
  const bathsStr = listing.baths ? `${listing.baths} bath` : ''
  const sqftStr = listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : ''
  const features = [bedsStr, bathsStr, sqftStr].filter(Boolean).join(' | ')

  return {
    title: `${listing.address}${priceStr} | ${listing.city || 'Florida'}`,
    description: `${features}. View photos, virtual tour, and neighborhood info for this beautiful property at ${listing.address}.`,
    openGraph: {
      title: listing.address,
      description: `${features}${priceStr}`,
      type: 'website',
      images: listing.media_assets[0]?.aryeo_url
        ? [{ url: listing.media_assets[0].aryeo_url || '' }]
        : [],
    },
  }
}

// Loading components for suspense
function LoadingSection() {
  return (
    <div className="animate-pulse bg-[#0a0a0a] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-32 rounded bg-[#1c1c1e]" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#1c1c1e]" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function PropertyPage({ params }: PageProps) {
  const { listingId } = await params
  const listing = await getListingById(listingId)

  if (!listing) {
    notFound()
  }

  const mediaByCategory = organizeMediaByCategory(listing.media_assets)
  const brandColor = listing.agent?.brand_color ?? '#0077ff'

  // Get images and video for hero
  const heroImages = mediaByCategory.mls || []
  const heroVideo = mediaByCategory.video?.[0] || null

  // Build Walk Score address (used for Life Here data)
  const walkScoreAddress = [
    listing.address,
    listing.city,
    listing.state,
    listing.zip,
  ]
    .filter(Boolean)
    .join(', ')

  // Fetch neighborhood data if we have coordinates
  let nearbyPlaces = null
  let localEvents = null
  let curatedItems = null
  let lifeHereData = null

  if (listing.lat && listing.lng) {
    // Run these in parallel
    const [places, events, curated, lifeHere] = await Promise.all([
      getAllNearbyPlaces(listing.lat, listing.lng).catch(() => null),
      searchLocalEvents(listing.lat, listing.lng).catch(() => []),
      getCuratedItemsNearLocation(listing.lat, listing.lng).catch(() => []),
      getLifeHereData(listing.lat, listing.lng, walkScoreAddress).catch(() => null),
    ])

    nearbyPlaces = places
    localEvents = events
    curatedItems = curated
    lifeHereData = lifeHere
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Analytics Tracking */}
      <PropertyPageTracker listingId={listing.id} agentId={listing.agent_id} />

      {/* Hero */}
      <PropertyHero
        images={heroImages}
        video={heroVideo}
        address={listing.address}
      />

      {/* Property Details */}
      <PropertyDetails listing={listing} brandColor={brandColor} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Content */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            <PhotoGallery
              images={listing.media_assets.filter((a) => a.type === 'photo')}
              address={listing.address}
            />

            {/* Interactive Content (Matterport, etc.) */}
            {mediaByCategory.matterport?.length > 0 && (
              <section className="py-8">
                <h2 className="mb-4 text-[22px] font-semibold text-white">
                  3D Virtual Tour
                </h2>
                <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                  <iframe
                    src={mediaByCategory.matterport[0].aryeo_url || ''}
                    className="h-[400px] w-full sm:h-[500px] lg:h-[600px]"
                    allowFullScreen
                    title="3D Virtual Tour"
                  />
                </div>
              </section>
            )}

            {/* Floor Plans */}
            {mediaByCategory.floorplan?.length > 0 && (
              <section className="py-8">
                <h2 className="mb-4 text-[22px] font-semibold text-white">
                  Floor Plans
                </h2>
                <div className="space-y-4">
                  {mediaByCategory.floorplan.map((fp) => (
                    <img
                      key={fp.id}
                      src={fp.aryeo_url || ''}
                      alt="Floor Plan"
                      className="w-full rounded-xl border border-white/[0.08]"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Share Button */}
              <ShareButton
                title={listing.address}
                text={`Check out this property at ${listing.address}`}
                className="w-full"
              />

              {/* Agent Card */}
              {listing.agent && (
                <AgentContactCard agent={listing.agent} brandColor={brandColor} />
              )}

              {/* Lead Form */}
              <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e]/72 backdrop-blur-xl p-6">
                <h3 className="mb-4 text-[17px] font-semibold text-white">
                  Interested in this property?
                </h3>
                <LeadCaptureForm
                  listingId={listing.id}
                  agentId={listing.agent_id}
                  address={listing.address}
                  brandColor={brandColor}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Life Here Section - Nearby Places */}
      <Suspense fallback={<LoadingSection />}>
        {nearbyPlaces && (
          <LifeHereSection
            places={nearbyPlaces}
            walkScoreAddress={lifeHereData?.scores ? undefined : walkScoreAddress}
            lat={listing.lat ?? undefined}
            lng={listing.lng ?? undefined}
          />
        )}
      </Suspense>

      {/* Life Here - Extended Data Sections */}
      {lifeHereData && (
        <div className="bg-[#0a0a0a] border-t border-white/[0.08]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Life Here Scores */}
            {lifeHereData.scores && (
              <LocationScoresCard
                lifeHereScore={lifeHereData.scores.lifeHereScore}
                diningScore={lifeHereData.scores.dining}
                convenienceScore={lifeHereData.scores.convenience}
                lifestyleScore={lifeHereData.scores.lifestyle}
                commuteScore={lifeHereData.scores.commute}
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
        </div>
      )}

      {/* Events Section */}
      <Suspense fallback={<LoadingSection />}>
        {localEvents && localEvents.length > 0 && (
          <EventsSection events={localEvents} />
        )}
      </Suspense>

      {/* What's Coming Section */}
      <Suspense fallback={<LoadingSection />}>
        {curatedItems && curatedItems.length > 0 && (
          <WhatsComingSection items={curatedItems} />
        )}
      </Suspense>

      {/* Footer */}
      {listing.agent ? (
        <div className="pb-20 lg:pb-0">
          <MarketingFooter
            agent={{
              name: listing.agent.name,
              email: listing.agent.email,
              phone: listing.agent.phone ?? undefined,
              socialLinks: (listing.agent as { social_links?: AgentSocialLinks }).social_links ?? undefined,
              showPoweredBy: true,
            }}
          />
        </div>
      ) : (
        <footer className="border-t border-white/[0.08] bg-[#0a0a0a] pb-20 lg:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
            <p className="text-[13px] text-[#636366]">
              Property website powered by{' '}
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
      )}

      {/* Mobile Floating CTA */}
      <MobileContactCTA
        agentName={listing.agent?.name}
        brandColor={brandColor}
      />
    </div>
  )
}
