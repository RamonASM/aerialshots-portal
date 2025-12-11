import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getListingById, organizeMediaByCategory } from '@/lib/queries/listings'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import {
  PropertyHero,
  PropertyDetails,
  PhotoGallery,
  LifeHereSection,
  EventsSection,
  WhatsComingSection,
  LeadCaptureForm,
  AgentContactCard,
} from '@/components/property'
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
        ? [{ url: listing.media_assets[0].aryeo_url }]
        : [],
    },
  }
}

// Loading components for suspense
function LoadingSection() {
  return (
    <div className="animate-pulse bg-neutral-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-32 rounded bg-neutral-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-neutral-200" />
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
  const brandColor = listing.agent?.brand_color ?? '#ff4533'

  // Get images and video for hero
  const heroImages = mediaByCategory.mls || []
  const heroVideo = mediaByCategory.video?.[0] || null

  // Fetch neighborhood data if we have coordinates
  let nearbyPlaces = null
  let localEvents = null
  let curatedItems = null

  if (listing.lat && listing.lng) {
    // Run these in parallel
    const [places, events, curated] = await Promise.all([
      getAllNearbyPlaces(listing.lat, listing.lng).catch(() => null),
      searchLocalEvents(listing.lat, listing.lng).catch(() => []),
      getCuratedItemsNearLocation(listing.lat, listing.lng).catch(() => []),
    ])

    nearbyPlaces = places
    localEvents = events
    curatedItems = curated
  }

  // Build Walk Score address
  const walkScoreAddress = [
    listing.address,
    listing.city,
    listing.state,
    listing.zip,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-screen bg-white">
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
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">
                  3D Virtual Tour
                </h2>
                <div className="overflow-hidden rounded-lg">
                  <iframe
                    src={mediaByCategory.matterport[0].aryeo_url}
                    className="h-[400px] w-full sm:h-[500px]"
                    allowFullScreen
                    title="3D Virtual Tour"
                  />
                </div>
              </section>
            )}

            {/* Floor Plans */}
            {mediaByCategory.floorplan?.length > 0 && (
              <section className="py-8">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">
                  Floor Plans
                </h2>
                <div className="space-y-4">
                  {mediaByCategory.floorplan.map((fp) => (
                    <img
                      key={fp.id}
                      src={fp.aryeo_url}
                      alt="Floor Plan"
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Agent Card */}
              {listing.agent && (
                <AgentContactCard agent={listing.agent} brandColor={brandColor} />
              )}

              {/* Lead Form */}
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">
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

      {/* Life Here Section */}
      <Suspense fallback={<LoadingSection />}>
        {nearbyPlaces && (
          <LifeHereSection
            places={nearbyPlaces}
            walkScoreAddress={walkScoreAddress}
            lat={listing.lat ?? undefined}
            lng={listing.lng ?? undefined}
          />
        )}
      </Suspense>

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
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">
            Property website powered by{' '}
            <a
              href="https://www.aerialshots.media"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff4533] hover:underline"
            >
              Aerial Shots Media
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
