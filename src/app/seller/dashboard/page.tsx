import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Home, Images, Video, Camera, ExternalLink, Calendar, MapPin } from 'lucide-react'

// Auth bypass for development
const authBypassEnabled =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' ||
  process.env.AUTH_BYPASS === 'true'

export default async function SellerDashboardPage() {
  // Get user email - either from bypass or Clerk
  let userEmail: string

  if (authBypassEnabled) {
    userEmail = process.env.AUTH_BYPASS_EMAIL || 'bypass@aerialshots.media'
  } else {
    const user = await currentUser()
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      redirect('/sign-in/seller')
    }
    userEmail = user.emailAddresses[0].emailAddress.toLowerCase()
  }

  const supabase = createAdminClient()

  // Get seller by email
  const { data: seller } = await supabase
    .from('sellers')
    .select(`
      id,
      name,
      email,
      agent_id,
      listing_id,
      access_level,
      last_accessed_at,
      agents (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('email', userEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (!seller) {
    // No seller record found - show helpful message
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Home className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Welcome to the Homeowner Portal
          </h1>
          <p className="text-[#a1a1a6] mb-6">
            We couldn&apos;t find any properties linked to your account yet.
            Your real estate agent will send you an invitation once your property
            photos are ready.
          </p>
          <p className="text-sm text-[#636366] mb-8">
            Signed in as: <span className="text-white">{userEmail}</span>
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  // Get all listings for this seller (via linked listing_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listings: any[] = []

  if (seller.listing_id) {
    const { data: listingsData } = await supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        zip,
        status,
        created_at
      `)
      .eq('id', seller.listing_id)

    if (listingsData) {
      // Get media assets for each listing
      const listingIds = listingsData.map(l => l.id)
      const { data: mediaData } = await supabase
        .from('media_assets')
        .select('id, listing_id, type, aryeo_url')
        .in('listing_id', listingIds)

      // Combine data
      listings = listingsData.map(listing => ({
        ...listing,
        media_assets: mediaData?.filter(m => m.listing_id === listing.id) || []
      }))
    }
  }

  // Update last accessed timestamp
  await supabase
    .from('sellers')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', seller.id)

  const agent = seller.agents as { id: string; name: string; email: string; phone: string } | null

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link href="/seller/dashboard" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-green-500 flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white">
              Homeowner Portal
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-[#a1a1a6]">{seller.name}</span>
            <form action="/api/auth/sign-out" method="POST">
              <button
                type="submit"
                className="text-[13px] text-[#636366] hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {seller.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="mt-2 text-[#a1a1a6]">
            View your property photos and marketing materials
          </p>
        </div>

        {/* Agent Info Card */}
        {agent && (
          <div className="mb-8 rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-6">
            <h2 className="text-sm font-medium text-[#636366] mb-3">Your Agent</h2>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-400">
                  {agent.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">{agent.name}</p>
                <p className="text-sm text-[#a1a1a6]">{agent.email}</p>
                {agent.phone && (
                  <p className="text-sm text-[#636366]">{agent.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Properties Section */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Properties</h2>

          {(!listings || listings.length === 0) ? (
            <div className="rounded-xl bg-[#1c1c1e] border border-white/[0.08] p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Images className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-white font-medium mb-2">No properties yet</p>
              <p className="text-sm text-[#a1a1a6]">
                Your property media will appear here once your photoshoot is complete.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const mediaAssets = listing.media_assets as { id: string; type: string; aryeo_url: string }[] | null
                const photoCount = mediaAssets?.filter(m => m.type === 'photo').length || 0
                const videoCount = mediaAssets?.filter(m => m.type === 'video').length || 0
                const tourCount = mediaAssets?.filter(m => m.type === '3d_tour' || m.type === 'virtual_tour').length || 0
                const thumbnailUrl = mediaAssets?.find(m => m.type === 'photo')?.aryeo_url

                const hasMedia = photoCount > 0 || videoCount > 0 || tourCount > 0

                return (
                  <Link
                    key={listing.id}
                    href={`/portal/listing/${listing.id}`}
                    className="group rounded-xl bg-[#1c1c1e] border border-white/[0.08] overflow-hidden hover:border-green-500/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-[#0a0a0a] relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={listing.address}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-8 w-8 text-[#636366]" />
                        </div>
                      )}
                      {hasMedia && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[11px] font-medium px-2 py-1 rounded-full">
                          Ready to view
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-medium text-white group-hover:text-green-400 transition-colors">
                            {listing.address}
                          </h3>
                          <p className="text-sm text-[#a1a1a6] flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {listing.city}, {listing.state}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-[#636366] group-hover:text-green-400 transition-colors flex-shrink-0" />
                      </div>

                      {/* Media counts */}
                      <div className="flex items-center gap-3 text-[12px] text-[#636366]">
                        {photoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Images className="h-3.5 w-3.5" />
                            {photoCount}
                          </span>
                        )}
                        {videoCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            {videoCount}
                          </span>
                        )}
                        {tourCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5" />
                            {tourCount}
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <p className="mt-3 text-[11px] text-[#636366] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(listing.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
