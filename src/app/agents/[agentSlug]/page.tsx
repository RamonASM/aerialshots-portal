import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { Building, Calendar, TrendingUp, Phone, Mail, Instagram, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { InstagramFeed, InstagramFeedPlaceholder } from '@/components/instagram'
import type { Metadata } from 'next'
import type { Database } from '@/lib/supabase/types'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'

type Listing = Database['public']['Tables']['listings']['Row']

// Partial media asset for displaying on agent pages
interface PartialMediaAsset {
  id: string
  listing_id: string
  aryeo_url: string
  type: string
}

interface ListingWithMedia extends Listing {
  media_assets: PartialMediaAsset[]
}

interface PageProps {
  params: Promise<{ agentSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentSlug } = await params
  const supabase = createAdminClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('name, bio')
    .eq('slug', agentSlug)
    .single()

  if (!agent) {
    return { title: 'Agent Not Found | Aerial Shots Media' }
  }

  return {
    title: `${agent.name} | Real Estate Agent Portfolio`,
    description: agent.bio || `View listings and contact ${agent.name}`,
  }
}

// Cached function to get agent portfolio data
// This prevents N+1 queries by batching all data fetches
const getAgentPortfolioData = unstable_cache(
  async (agentSlug: string) => {
    const supabase = createAdminClient()

    // Get agent - select all columns needed for display
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('slug', agentSlug)
      .maybeSingle() // Use maybeSingle instead of single to avoid errors

    if (error || !agent) {
      return null
    }

    // Batch fetch listings and Instagram posts in parallel
    const [listingsResult, instagramResult] = await Promise.all([
      // Get listings - select all columns to match ListingWithMedia type
      supabase
        .from('listings')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false }),
      // Get published Instagram posts
      supabase
        .from('instagram_scheduled_posts')
        .select('instagram_permalink')
        .eq('agent_id', agent.id)
        .eq('status', 'published')
        .not('instagram_permalink', 'is', null)
        .order('published_at', { ascending: false })
        .limit(6),
    ])

    const listingsData = listingsResult.data || []
    const listingIds = listingsData.map((l) => l.id)

    // Get media assets for all listings in a single query
    const { data: mediaData } = listingIds.length > 0
      ? await supabase
          .from('media_assets')
          .select('id, listing_id, aryeo_url, type')
          .in('listing_id', listingIds)
      : { data: [] }

    // Combine listings with their media
    const listings: ListingWithMedia[] = listingsData.map((listing) => ({
      ...listing,
      media_assets: mediaData?.filter((m) => m.listing_id === listing.id) || [],
    }))

    const publishedPostUrls = instagramResult.data
      ?.map((p) => p.instagram_permalink)
      .filter((url): url is string => !!url) || []

    return {
      agent,
      listings,
      publishedPostUrls,
    }
  },
  ['agent-portfolio'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: [CACHE_TAGS.AGENTS, CACHE_TAGS.LISTINGS, CACHE_TAGS.MEDIA_ASSETS],
  }
)

export default async function AgentPortfolioPage({ params }: PageProps) {
  const { agentSlug } = await params
  const portfolioData = await getAgentPortfolioData(agentSlug)

  if (!portfolioData) {
    notFound()
  }

  const { agent, listings, publishedPostUrls } = portfolioData

  const activeListings = listings.filter((l) => l.status === 'active')
  const soldListings = listings.filter((l) => l.status === 'sold')

  // Calculate stats
  const totalSoldVolume = soldListings.reduce(
    (sum, l) => sum + (l.sold_price || l.price || 0),
    0
  )
  const avgDOM = soldListings.length > 0
    ? Math.round(
        soldListings.reduce((sum, l) => sum + (l.dom || 0), 0) / soldListings.length
      )
    : 0

  const brandColor = agent.brand_color || '#ff4533'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        className="relative overflow-hidden py-16"
        style={{ backgroundColor: brandColor + '10' }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            {/* Agent Photo */}
            {agent.headshot_url ? (
              <img
                src={agent.headshot_url}
                alt={agent.name}
                className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white text-4xl font-bold text-white shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                {agent.name.charAt(0)}
              </div>
            )}

            {/* Agent Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-neutral-900">{agent.name}</h1>
              {agent.bio && (
                <p className="mt-2 max-w-xl text-neutral-600">{agent.bio}</p>
              )}

              {/* Contact Buttons */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {agent.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${agent.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      {agent.phone}
                    </a>
                  </Button>
                )}
                {agent.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${agent.email}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  </Button>
                )}
                {agent.instagram_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={agent.instagram_url} target="_blank" rel="noopener noreferrer">
                      <Instagram className="mr-2 h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                )}
                <ShareButton
                  title={`${agent.name} - Real Estate Agent`}
                  text={`View ${agent.name}'s portfolio and listings`}
                  variant="outline"
                  size="sm"
                />
              </div>
            </div>

            {/* Agent Logo */}
            {agent.logo_url && (
              <img
                src={agent.logo_url}
                alt={`${agent.name} logo`}
                className="h-16 w-auto object-contain"
              />
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {listings.length}
              </p>
              <p className="text-sm text-neutral-600">Total Listings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {soldListings.length}
              </p>
              <p className="text-sm text-neutral-600">Sold</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {avgDOM || '-'}
              </p>
              <p className="text-sm text-neutral-600">Avg Days on Market</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                ${(totalSoldVolume / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-neutral-600">Total Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Active Listings */}
        {activeListings.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              Active Listings
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  brandColor={brandColor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sold Listings */}
        {soldListings.length > 0 && (
          <section>
            <h2 className="mb-6 text-xl font-bold text-neutral-900">
              Recently Sold
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {soldListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  brandColor={brandColor}
                  showSold
                />
              ))}
            </div>
          </section>
        )}

        {/* No Listings */}
        {listings.length === 0 && (
          <div className="py-12 text-center">
            <Building className="mx-auto h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-neutral-600">No listings yet</p>
          </div>
        )}

        {/* Instagram Section */}
        {(agent.instagram_url || publishedPostUrls.length > 0) && (
          <section className="mt-12 pt-12 border-t border-neutral-200">
            {publishedPostUrls.length > 0 ? (
              <InstagramFeed
                agentId={agent.id}
                instagramUrl={agent.instagram_url ?? undefined}
                postUrls={publishedPostUrls}
                maxPosts={6}
              />
            ) : (
              <InstagramFeedPlaceholder instagramUrl={agent.instagram_url ?? undefined} />
            )}
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">
            Professional media by{' '}
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

function ListingCard({
  listing,
  brandColor,
  showSold = false,
}: {
  listing: ListingWithMedia
  brandColor: string
  showSold?: boolean
}) {
  const heroImage = listing.media_assets?.find(
    (m) => m.type === 'photo'
  )

  return (
    <Link
      href={`/property/${listing.id}`}
      className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-48 bg-neutral-100">
        {heroImage ? (
          <img
            src={heroImage.aryeo_url}
            alt={listing.address}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building className="h-12 w-12 text-neutral-300" />
          </div>
        )}
        {showSold && (
          <div className="absolute left-2 top-2 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
            SOLD
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p
          className="text-lg font-bold"
          style={{ color: brandColor }}
        >
          ${(showSold && listing.sold_price ? listing.sold_price : listing.price)?.toLocaleString()}
        </p>
        <h3 className="mt-1 font-medium text-neutral-900">{listing.address}</h3>
        <p className="text-sm text-neutral-500">
          {listing.city}, {listing.state} {listing.zip}
        </p>

        <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600">
          {listing.beds && <span>{listing.beds} bed</span>}
          {listing.baths && <span>{listing.baths} bath</span>}
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </Link>
  )
}
