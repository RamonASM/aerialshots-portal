import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, MapPin, Filter, Grid, List } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { Button } from '@/components/ui/button'
import { SoldMap } from '@/components/agents'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'
import type { Metadata } from 'next'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']

interface PageProps {
  params: Promise<{ agentSlug: string }>
  searchParams: Promise<{ status?: string; view?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentSlug } = await params
  const supabase = createAdminClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('name')
    .eq('slug', agentSlug)
    .single()

  if (!agent) {
    return { title: 'Agent Not Found | Aerial Shots Media' }
  }

  return {
    title: `All Listings - ${agent.name} | Real Estate Portfolio`,
    description: `Browse all property listings by ${agent.name}`,
  }
}

interface ListingWithMedia extends Listing {
  media_assets: {
    id: string
    listing_id: string
    aryeo_url: string | null
    media_url?: string | null
    type: string
  }[]
}

const getAgentListings = unstable_cache(
  async (agentSlug: string) => {
    const supabase = createAdminClient()

    // Get agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, brand_color')
      .eq('slug', agentSlug)
      .single()

    if (!agent) return null

    // Get all listings with media
    const { data: listings } = await supabase
      .from('listings')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })

    const listingIds = (listings || []).map((l) => l.id)

    // Get media
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: media } = listingIds.length > 0
      ? await (supabase as any)
          .from('media_assets')
          .select('id, listing_id, aryeo_url, media_url, type')
          .in('listing_id', listingIds)
      : { data: [] }

    // Combine
    const listingsWithMedia: ListingWithMedia[] = (listings || []).map((listing) => ({
      ...listing,
      media_assets: (media || []).filter((m: { listing_id: string }) => m.listing_id === listing.id),
    }))

    return { agent, listings: listingsWithMedia }
  },
  ['agent-all-listings'],
  { revalidate: CACHE_REVALIDATION.LISTING, tags: [CACHE_TAGS.LISTINGS] }
)

export default async function AgentListingsPage({ params, searchParams }: PageProps) {
  const { agentSlug } = await params
  const { status: statusFilter = 'all', view = 'grid' } = await searchParams

  const data = await getAgentListings(agentSlug)

  if (!data) {
    notFound()
  }

  const { agent, listings } = data
  const brandColor = agent.brand_color || '#0077ff'

  // Filter listings
  const filteredListings = statusFilter === 'all'
    ? listings
    : listings.filter((l) => l.status === statusFilter)

  // Group by status
  const activeListings = listings.filter((l) => l.status === 'active')
  const soldListings = listings.filter((l) => l.status === 'sold')
  const otherListings = listings.filter((l) => l.status !== 'active' && l.status !== 'sold')

  // Prepare sold properties for map
  const soldForMap = soldListings
    .filter((l) => l.lat && l.lng)
    .map((l) => ({
      id: l.id,
      address: l.address,
      city: l.city || '',
      state: l.state || '',
      lat: l.lat!,
      lng: l.lng!,
      soldPrice: l.sold_price || l.price || 0,
      beds: l.beds || undefined,
      baths: l.baths || undefined,
      sqft: l.sqft || undefined,
      imageUrl: l.media_assets[0]?.media_url || l.media_assets[0]?.aryeo_url || undefined,
    }))

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/agents/${agentSlug}`}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Portfolio
                </Link>
              </Button>
            </div>
            <h1 className="text-lg font-semibold text-white">All Listings</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#636366]" />
              <div className="flex gap-1">
                {[
                  { value: 'all', label: `All (${listings.length})` },
                  { value: 'active', label: `Active (${activeListings.length})` },
                  { value: 'sold', label: `Sold (${soldListings.length})` },
                ].map((filter) => (
                  <Link
                    key={filter.value}
                    href={`/agents/${agentSlug}/listings?status=${filter.value}&view=${view}`}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      statusFilter === filter.value
                        ? 'text-white'
                        : 'text-[#636366] hover:text-[#a1a1a6]'
                    }`}
                    style={
                      statusFilter === filter.value
                        ? { backgroundColor: `${brandColor}20`, color: brandColor }
                        : undefined
                    }
                  >
                    {filter.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/agents/${agentSlug}/listings?status=${statusFilter}&view=grid`}
                className={`rounded-lg p-2 transition-colors ${
                  view === 'grid' ? 'bg-white/10 text-white' : 'text-[#636366] hover:text-white'
                }`}
              >
                <Grid className="h-4 w-4" />
              </Link>
              <Link
                href={`/agents/${agentSlug}/listings?status=${statusFilter}&view=list`}
                className={`rounded-lg p-2 transition-colors ${
                  view === 'list' ? 'bg-white/10 text-white' : 'text-[#636366] hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Sold Map Section */}
        {statusFilter !== 'active' && soldForMap.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5" style={{ color: brandColor }} />
              Sold Properties Map
            </h2>
            <SoldMap properties={soldForMap} brandColor={brandColor} />
          </section>
        )}

        {/* Listings Grid/List */}
        {filteredListings.length > 0 ? (
          <div
            className={
              view === 'grid'
                ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-4'
            }
          >
            {filteredListings.map((listing) => (
              view === 'grid' ? (
                <ListingGridCard
                  key={listing.id}
                  listing={listing}
                  brandColor={brandColor}
                />
              ) : (
                <ListingListCard
                  key={listing.id}
                  listing={listing}
                  brandColor={brandColor}
                />
              )
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Building className="mx-auto h-12 w-12 text-[#636366]" />
            <p className="mt-4 text-[#a1a1a6]">No listings found</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <p className="text-[13px] text-[#636366]">
            Professional media by{' '}
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
    </div>
  )
}

function ListingGridCard({
  listing,
  brandColor,
}: {
  listing: ListingWithMedia
  brandColor: string
}) {
  const heroImage = listing.media_assets?.find((m) => m.type === 'photo')
  const isSold = listing.status === 'sold'

  return (
    <Link
      href={`/property/${listing.id}`}
      className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] transition-all hover:border-white/[0.16]"
    >
      <div className="relative h-48 bg-[#0a0a0a]">
        {heroImage ? (
          <img
            src={heroImage.media_url || heroImage.aryeo_url || ''}
            alt={listing.address}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building className="h-12 w-12 text-[#636366]" />
          </div>
        )}
        {isSold && (
          <div className="absolute left-2 top-2 rounded-full bg-green-500 px-3 py-1 text-[11px] font-medium text-white uppercase">
            SOLD
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-semibold" style={{ color: brandColor }}>
          ${(isSold && listing.sold_price ? listing.sold_price : listing.price)?.toLocaleString()}
        </p>
        <h3 className="mt-1 font-medium text-white">{listing.address}</h3>
        <p className="text-sm text-[#636366]">
          {listing.city}, {listing.state}
        </p>
        <div className="mt-2 flex gap-3 text-sm text-[#a1a1a6]">
          {listing.beds && <span>{listing.beds} bed</span>}
          {listing.baths && <span>{listing.baths} bath</span>}
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </Link>
  )
}

function ListingListCard({
  listing,
  brandColor,
}: {
  listing: ListingWithMedia
  brandColor: string
}) {
  const heroImage = listing.media_assets?.find((m) => m.type === 'photo')
  const isSold = listing.status === 'sold'

  return (
    <Link
      href={`/property/${listing.id}`}
      className="group flex gap-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4 transition-all hover:border-white/[0.16]"
    >
      <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-[#0a0a0a]">
        {heroImage ? (
          <img
            src={heroImage.media_url || heroImage.aryeo_url || ''}
            alt={listing.address}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building className="h-8 w-8 text-[#636366]" />
          </div>
        )}
        {isSold && (
          <div className="absolute left-1 top-1 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
            SOLD
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-white truncate">{listing.address}</h3>
            <p className="text-sm text-[#636366]">
              {listing.city}, {listing.state} {listing.zip}
            </p>
          </div>
          <p className="text-lg font-semibold flex-shrink-0" style={{ color: brandColor }}>
            ${(isSold && listing.sold_price ? listing.sold_price : listing.price)?.toLocaleString()}
          </p>
        </div>
        <div className="mt-2 flex gap-4 text-sm text-[#a1a1a6]">
          {listing.beds && <span>{listing.beds} bed</span>}
          {listing.baths && <span>{listing.baths} bath</span>}
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.dom && <span>{listing.dom} DOM</span>}
        </div>
      </div>
    </Link>
  )
}
