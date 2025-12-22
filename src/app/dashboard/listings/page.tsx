import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building, ExternalLink, Eye, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ListingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!agent) {
    redirect('/login')
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

  // Build media lookup map for O(1) access instead of O(n²) filter
  const mediaByListing = new Map<string, typeof mediaData>()
  mediaData?.forEach((m) => {
    const existing = mediaByListing.get(m.listing_id) || []
    existing.push(m)
    mediaByListing.set(m.listing_id, existing)
  })

  // Combine listings with their media using map lookup
  const listings = listingsData?.map((listing) => ({
    ...listing,
    media_assets: mediaByListing.get(listing.id) || [],
  }))

  const activeListings = listings?.filter((l) => l.status === 'active') || []
  const soldListings = listings?.filter((l) => l.status === 'sold') || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Your Listings</h1>
        <p className="mt-1 text-neutral-600">
          Manage your property listings and view analytics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Total Listings</p>
          <p className="text-2xl font-bold text-neutral-900">{listings?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeListings.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-600">Sold</p>
          <p className="text-2xl font-bold text-blue-600">{soldListings.length}</p>
        </div>
      </div>

      {/* Listings Grid */}
      {listings && listings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const heroImage = listing.media_assets?.find(
              (m: { type: string }) => m.type === 'photo'
            )

            return (
              <div
                key={listing.id}
                className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
              >
                {/* Image */}
                <div className="relative h-40 bg-neutral-100">
                  {heroImage ? (
                    <img
                      src={heroImage.aryeo_url}
                      alt={listing.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building className="h-12 w-12 text-neutral-300" />
                    </div>
                  )}
                  <div
                    className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-medium ${
                      listing.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : listing.status === 'sold'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {listing.status?.toUpperCase()}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-neutral-900">{listing.address}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                    <MapPin className="h-3 w-3" />
                    {listing.city}, {listing.state} {listing.zip}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600">
                    {listing.beds && <span>{listing.beds} bed</span>}
                    {listing.baths && <span>{listing.baths} bath</span>}
                    {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                  </div>

                  {listing.price && (
                    <p className="mt-2 text-lg font-bold text-neutral-900">
                      ${listing.price.toLocaleString()}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/delivery/${listing.id}`}>
                        <Eye className="mr-1 h-4 w-4" />
                        Delivery
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/property/${listing.id}`} target="_blank">
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Property Page
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <Building className="mx-auto h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 font-semibold text-neutral-900">No listings yet</h3>
          <p className="mt-2 text-neutral-600">
            Your listings will appear here after you book a shoot.
          </p>
          <Button className="mt-4" asChild>
            <a href="https://www.aerialshots.media" target="_blank" rel="noopener noreferrer">
              Book Your First Shoot
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
