import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building, ExternalLink, Eye, MapPin, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/dashboard/ShareButton'

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

  // Get leads count per listing
  const { data: leadsData } = listingIds.length > 0
    ? await supabase
        .from('leads')
        .select('listing_id')
        .in('listing_id', listingIds)
    : { data: [] }

  // Build leads count map
  const leadsCountByListing = new Map<string, number>()
  leadsData?.forEach((lead) => {
    if (lead.listing_id) {
      const count = leadsCountByListing.get(lead.listing_id) || 0
      leadsCountByListing.set(lead.listing_id, count + 1)
    }
  })

  // Build media lookup map for O(1) access instead of O(n²) filter
  const mediaByListing = new Map<string, typeof mediaData>()
  mediaData?.forEach((m) => {
    const existing = mediaByListing.get(m.listing_id) || []
    existing.push(m)
    mediaByListing.set(m.listing_id, existing)
  })

  // Combine listings with their media and lead counts
  const listings = listingsData?.map((listing) => ({
    ...listing,
    media_assets: mediaByListing.get(listing.id) || [],
    lead_count: leadsCountByListing.get(listing.id) || 0,
  }))

  const activeListings = listings?.filter((l) => l.status === 'active') || []
  const soldListings = listings?.filter((l) => l.status === 'sold') || []
  const totalLeads = leadsData?.length || 0

  // Find listing with most leads
  const topPerformer = listings?.reduce((max, listing) =>
    listing.lead_count > (max?.lead_count || 0) ? listing : max
  , listings?.[0])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold text-white">Your Listings</h1>
        <p className="mt-1 text-[#a1a1a6]">
          Manage your property listings and view analytics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-[#0077ff]" />
            <p className="text-[13px] text-[#636366]">Total Listings</p>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-white">{listings?.length || 0}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <p className="text-[13px] text-[#636366]">Active</p>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-green-500">{activeListings.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-400" />
            <p className="text-[13px] text-[#636366]">Sold</p>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-[#0077ff]">{soldListings.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <p className="text-[13px] text-[#636366]">Total Leads</p>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-amber-400">{totalLeads}</p>
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
                className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e]"
              >
                {/* Image */}
                <div className="relative h-40 bg-[#0a0a0a]">
                  {heroImage ? (
                    <img
                      src={heroImage.aryeo_url}
                      alt={listing.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building className="h-12 w-12 text-[#636366]" />
                    </div>
                  )}
                  <div className="absolute left-2 right-2 top-2 flex items-center justify-between">
                    {/* Popular Badge */}
                    {listing.lead_count >= 3 && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-400">
                        Popular
                      </span>
                    )}
                    {listing.lead_count < 3 && <span />}
                    {/* Status Badge */}
                    <div
                      className={`rounded-full border px-2 py-1 text-[11px] font-medium ${
                        listing.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : listing.status === 'sold'
                            ? 'bg-[#0077ff]/20 text-[#3395ff] border-[#0077ff]/30'
                            : 'bg-white/5 text-[#a1a1a6] border-white/[0.08]'
                      }`}
                    >
                      {listing.status?.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-white">{listing.address}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[#636366]">
                    <MapPin className="h-3 w-3" />
                    {listing.city}, {listing.state} {listing.zip}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-[13px] text-[#a1a1a6]">
                    {listing.beds && <span>{listing.beds} bed</span>}
                    {listing.baths && <span>{listing.baths} bath</span>}
                    {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    {listing.price ? (
                      <p className="text-[17px] font-semibold text-white">
                        ${listing.price.toLocaleString()}
                      </p>
                    ) : (
                      <span />
                    )}
                    {/* Lead Count */}
                    {listing.lead_count > 0 && (
                      <div className="flex items-center gap-1 text-[13px]">
                        <Users className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-amber-400 font-medium">{listing.lead_count}</span>
                        <span className="text-[#636366]">lead{listing.lead_count !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

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
                        Property
                      </Link>
                    </Button>
                    <ShareButton
                      listingId={listing.id}
                      agentId={agent.id}
                      propertyAddress={`${listing.address}, ${listing.city}`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
          <Building className="mx-auto h-12 w-12 text-[#636366]" />
          <h3 className="mt-4 font-semibold text-white">No listings yet</h3>
          <p className="mt-2 text-[#a1a1a6]">
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
