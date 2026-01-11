import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building, Eye, Users, TrendingUp } from 'lucide-react'
import { RealtimeListingsGrid } from '@/components/dashboard/RealtimeListingsGrid'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

export default async function ListingsPage() {
  // Get user email - either from bypass or Clerk
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in')
    }
    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  }

  const supabase = createAdminClient()

  // Get agent by email
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('email', userEmail)
    .maybeSingle()

  if (!agent) {
    redirect('/sign-in?error=no_agent')
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

      {/* Listings Grid with Realtime Updates */}
      <RealtimeListingsGrid
        initialListings={listings?.map(l => ({
          ...l,
          media_assets: l.media_assets as { id: string; listing_id: string; aryeo_url: string | null; type: string }[],
        })) || []}
        agentId={agent.id}
      />
    </div>
  )
}
