import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin } from 'lucide-react'
import { getListingById } from '@/lib/queries/listings'
import { createClient } from '@/lib/supabase/server'
import { OpenHouseRSVP } from '@/components/property/OpenHouseRSVP'
import { Button } from '@/components/ui/button'
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

  return {
    title: `Open Houses - ${listing.address} | Aerial Shots Media`,
    description: `View upcoming open houses for ${listing.address}. RSVP to secure your spot.`,
  }
}

async function getOpenHouses(listingId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Get open houses with RSVP counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openHouses, error } = await (supabase as any)
    .from('open_houses')
    .select(`
      id,
      event_date,
      start_time,
      end_time,
      title,
      description,
      max_attendees,
      status
    `)
    .eq('listing_id', listingId)
    .eq('status', 'scheduled')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Error fetching open houses:', error)
    return []
  }

  // Get RSVP counts for each open house
  const openHousesWithCounts = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (openHouses || []).map(async (oh: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('open_house_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('open_house_id', oh.id)
        .in('status', ['registered', 'confirmed'])

      return {
        ...oh,
        current_rsvps: count || 0,
      }
    })
  )

  return openHousesWithCounts
}

export default async function OpenHousePage({ params }: PageProps) {
  const { listingId } = await params
  const [listing, openHouses] = await Promise.all([
    getListingById(listingId),
    getOpenHouses(listingId),
  ])

  if (!listing) {
    notFound()
  }

  const brandColor = listing.agent?.brand_color ?? '#0077ff'
  const fullAddress = [listing.address, listing.city, listing.state, listing.zip]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/property/${listingId}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Property
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Property Info */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#636366] mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{fullAddress}</span>
          </div>
          <h1 className="text-[28px] font-semibold text-white sm:text-[34px]">
            Open Houses
          </h1>
          <p className="mt-2 text-[#a1a1a6]">
            View upcoming open houses and RSVP to secure your spot.
          </p>
        </div>

        {/* Open Houses List */}
        {openHouses.length > 0 ? (
          <div className="space-y-6">
            {openHouses.map((openHouse) => (
              <OpenHouseRSVP
                key={openHouse.id}
                openHouse={openHouse}
                listingAddress={fullAddress}
                brandColor={brandColor}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-12 text-center">
            <div
              className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <Calendar className="h-8 w-8" style={{ color: brandColor }} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              No Upcoming Open Houses
            </h2>
            <p className="mt-2 text-[#a1a1a6] max-w-sm mx-auto">
              There are no scheduled open houses for this property at the moment.
              Check back later or contact the agent directly.
            </p>
            {listing.agent && (
              <div className="mt-6">
                <Button asChild style={{ backgroundColor: brandColor }}>
                  <Link href={`/property/${listingId}#contact`}>
                    Contact Agent
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Agent Card */}
        {listing.agent && (
          <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-6">
            <div className="flex items-center gap-4">
              {listing.agent.headshot_url ? (
                <img
                  src={listing.agent.headshot_url}
                  alt={listing.agent.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold"
                  style={{
                    backgroundColor: `${brandColor}20`,
                    color: brandColor,
                  }}
                >
                  {listing.agent.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white">{listing.agent.name}</h3>
                <p className="text-sm text-[#a1a1a6]">Listing Agent</p>
              </div>
              {listing.agent.phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${listing.agent.phone}`}>Call Agent</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#0a0a0a]">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center sm:px-6">
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
    </div>
  )
}
