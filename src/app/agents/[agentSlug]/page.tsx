import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building, Calendar, TrendingUp, Phone, Mail, Instagram, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

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

export default async function AgentPortfolioPage({ params }: PageProps) {
  const { agentSlug } = await params
  const supabase = createAdminClient()

  // Get agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', agentSlug)
    .single()

  if (error || !agent) {
    notFound()
  }

  // Get listings
  const { data: listingsData } = await supabase
    .from('listings')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  // Get media assets for all listings
  const listingIds = listingsData?.map((l) => l.id) || []
  const { data: mediaData } = listingIds.length > 0
    ? await supabase
        .from('media_assets')
        .select('id, listing_id, aryeo_url, type')
        .in('listing_id', listingIds)
    : { data: [] }

  // Combine listings with their media
  const listings = listingsData?.map((listing) => ({
    ...listing,
    media_assets: mediaData?.filter((m) => m.listing_id === listing.id) || [],
  }))

  const activeListings = listings?.filter((l) => l.status === 'active') || []
  const soldListings = listings?.filter((l) => l.status === 'sold') || []

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
                {(listings?.length || 0)}
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
        {listings?.length === 0 && (
          <div className="py-12 text-center">
            <Building className="mx-auto h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-neutral-600">No listings yet</p>
          </div>
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
  listing: any
  brandColor: string
  showSold?: boolean
}) {
  const heroImage = listing.media_assets?.find(
    (m: { type: string }) => m.type === 'photo'
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
