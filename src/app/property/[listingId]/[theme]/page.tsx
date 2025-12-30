import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getListingById, organizeMediaByCategory } from '@/lib/queries/listings'
import { getCuratedItemsNearLocation } from '@/lib/queries/curated-items'
import { getAllNearbyPlaces } from '@/lib/integrations/google-places/client'
import { searchLocalEvents } from '@/lib/integrations/ticketmaster/client'
import { getLifeHereData } from '@/lib/queries/life-here'
import { getTheme, isValidTheme, type ThemeId } from '@/lib/themes/property'
import { ThemeProvider } from '@/lib/themes/property'
import {
  ThemedPropertyHero,
  ThemedPropertyDetails,
  ThemedLayout,
  ThemedSection,
  ThemedCard,
  ThemedHeading,
  ThemedText,
  ThemedButton,
} from '@/components/property/themes'
import { PhotoGallery, PropertyPageTracker, LeadCaptureForm } from '@/components/property'
import {
  LocationScoresCard,
  ThemeParksSection,
  CommuteSection,
} from '@/components/life-here'
import { ShareButton } from '@/components/ui/share-button'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ listingId: string; theme: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listingId, theme: themeParam } = await params
  const listing = await getListingById(listingId)

  if (!listing) {
    return {
      title: 'Property Not Found | Aerial Shots Media',
    }
  }

  const theme = getTheme(themeParam)
  const priceStr = listing.price ? ` - $${listing.price.toLocaleString()}` : ''
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
      images: (listing.media_assets[0]?.media_url || listing.media_assets[0]?.aryeo_url)
        ? [{ url: listing.media_assets[0].media_url || listing.media_assets[0].aryeo_url || '' }]
        : [],
    },
  }
}

// Loading component for suspense
function LoadingSection() {
  return (
    <div className="animate-pulse p-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-6 w-32 rounded bg-neutral-800" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-neutral-800" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function ThemedPropertyPage({ params }: PageProps) {
  const { listingId, theme: themeParam } = await params

  // Validate theme
  if (!isValidTheme(themeParam)) {
    // Redirect to default property page if invalid theme
    redirect(`/property/${listingId}`)
  }

  const theme = getTheme(themeParam as ThemeId)
  const listing = await getListingById(listingId)

  if (!listing) {
    notFound()
  }

  const mediaByCategory = organizeMediaByCategory(listing.media_assets)
  const brandColor = listing.agent?.brand_color ?? theme.colors.primary

  // Get images and video for hero
  const heroImages = mediaByCategory.mls || []
  const heroVideo = mediaByCategory.video?.[0] || null

  // Build Walk Score address
  const walkScoreAddress = [
    listing.address,
    listing.city,
    listing.state,
    listing.zip,
  ]
    .filter(Boolean)
    .join(', ')

  // Fetch neighborhood data if coordinates exist
  let nearbyPlaces = null
  let localEvents = null
  let curatedItems = null
  let lifeHereData = null

  if (listing.lat && listing.lng) {
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
    <ThemeProvider themeId={theme.id}>
      <ThemedLayout theme={theme}>
        {/* Analytics Tracking */}
        <PropertyPageTracker listingId={listing.id} agentId={listing.agent_id} />

        {/* Hero */}
        <ThemedPropertyHero
          images={heroImages}
          video={heroVideo}
          address={listing.address}
          theme={theme}
        />

        {/* Property Details */}
        <ThemedPropertyDetails
          listing={listing}
          theme={theme}
          brandColor={brandColor}
        />

        {/* Main Content */}
        <ThemedSection theme={theme}>
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Photo Gallery */}
              <PhotoGallery
                images={listing.media_assets.filter((a) => a.type === 'photo')}
                address={listing.address}
              />

              {/* Interactive Content (Matterport) */}
              {mediaByCategory.matterport?.length > 0 && (
                <div>
                  <ThemedHeading theme={theme} level={2} className="mb-4">
                    3D Virtual Tour
                  </ThemedHeading>
                  <div
                    className="overflow-hidden"
                    style={{
                      borderRadius: theme.layout.cardRadius,
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    <iframe
                      src={mediaByCategory.matterport[0].media_url || mediaByCategory.matterport[0].aryeo_url || ''}
                      className="h-[400px] w-full sm:h-[500px] lg:h-[600px]"
                      allowFullScreen
                      title="3D Virtual Tour"
                    />
                  </div>
                </div>
              )}

              {/* Floor Plans */}
              {mediaByCategory.floorplan?.length > 0 && (
                <div>
                  <ThemedHeading theme={theme} level={2} className="mb-4">
                    Floor Plans
                  </ThemedHeading>
                  <div className="space-y-4">
                    {mediaByCategory.floorplan.map((fp) => (
                      <img
                        key={fp.id}
                        src={fp.media_url || fp.aryeo_url || ''}
                        alt="Floor Plan"
                        className="w-full"
                        style={{
                          borderRadius: theme.layout.cardRadius,
                          border: `1px solid ${theme.colors.border}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
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
                  <ThemedCard theme={theme} variant="elevated" className="p-6">
                    <div className="flex items-center gap-4">
                      {listing.agent.headshot_url ? (
                        <img
                          src={listing.agent.headshot_url}
                          alt={listing.agent.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                          style={{
                            backgroundColor: `${brandColor}20`,
                            color: brandColor,
                          }}
                        >
                          {listing.agent.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <ThemedHeading theme={theme} level={3}>
                          {listing.agent.name}
                        </ThemedHeading>
                        <ThemedText theme={theme} variant="secondary" className="text-sm">
                          Real Estate Agent
                        </ThemedText>
                      </div>
                    </div>
                    {listing.agent.phone && (
                      <a
                        href={`tel:${listing.agent.phone}`}
                        className="mt-4 block w-full text-center px-4 py-2.5 font-medium"
                        style={{
                          backgroundColor: brandColor,
                          color: '#ffffff',
                          borderRadius: theme.layout.cardRadius,
                        }}
                      >
                        Call {listing.agent.phone}
                      </a>
                    )}
                  </ThemedCard>
                )}

                {/* Lead Form */}
                <ThemedCard theme={theme} variant="glass" className="p-6">
                  <ThemedHeading theme={theme} level={3} className="mb-4">
                    Interested in this property?
                  </ThemedHeading>
                  <LeadCaptureForm
                    listingId={listing.id}
                    agentId={listing.agent_id}
                    address={listing.address}
                    brandColor={brandColor}
                  />
                </ThemedCard>
              </div>
            </div>
          </div>
        </ThemedSection>

        {/* Life Here Scores */}
        {lifeHereData?.scores && (
          <ThemedSection theme={theme} variant="secondary">
            <LocationScoresCard
              lifeHereScore={lifeHereData.scores.lifeHereScore}
              diningScore={lifeHereData.scores.dining}
              convenienceScore={lifeHereData.scores.convenience}
              lifestyleScore={lifeHereData.scores.lifestyle}
              commuteScore={lifeHereData.scores.commute}
            />
          </ThemedSection>
        )}

        {/* Theme Parks */}
        {lifeHereData?.themeparks && lifeHereData.themeparks.length > 0 && (
          <ThemedSection theme={theme}>
            <ThemeParksSection parks={lifeHereData.themeparks} />
          </ThemedSection>
        )}

        {/* Commute */}
        {lifeHereData?.commute && (
          <ThemedSection theme={theme} variant="secondary">
            <CommuteSection
              airports={lifeHereData.commute.airports}
              beaches={lifeHereData.commute.beaches}
              destinations={lifeHereData.commute.destinations}
              summary={lifeHereData.commute.summary}
            />
          </ThemedSection>
        )}

        {/* Footer */}
        <footer
          className="pb-20 lg:pb-0"
          style={{
            backgroundColor: theme.colors.backgroundSecondary,
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        >
          <div
            className="mx-auto px-4 py-10 text-center sm:px-6 lg:px-8"
            style={{ maxWidth: theme.layout.containerWidth }}
          >
            <ThemedText theme={theme} variant="muted" className="text-[13px]">
              Property website powered by{' '}
              <a
                href="https://www.aerialshots.media"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{ color: theme.colors.primary }}
              >
                Aerial Shots Media
              </a>
            </ThemedText>

            {/* Theme Badge */}
            <div className="mt-4">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px]"
                style={{
                  backgroundColor: `${theme.colors.primary}15`,
                  color: theme.colors.primary,
                  borderRadius: theme.layout.cardRadius,
                }}
              >
                ✨ {theme.name} Theme
              </span>
            </div>
          </div>
        </footer>
      </ThemedLayout>
    </ThemeProvider>
  )
}
