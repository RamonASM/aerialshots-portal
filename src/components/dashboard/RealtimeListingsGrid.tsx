'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building, ExternalLink, Eye, MapPin, Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/dashboard/ShareButton'
import { AIIndicator } from '@/components/dashboard/SkillBadges'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface MediaAsset {
  id: string
  listing_id: string
  media_url: string | null
  type: string
}

interface Listing {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  price: number | null
  status: string | null
  ops_status: string | null
  media_assets: MediaAsset[]
  lead_count: number
  has_ai_content?: boolean
}

interface RealtimeListingsGridProps {
  initialListings: Listing[]
  agentId: string
}

export function RealtimeListingsGrid({ initialListings, agentId }: RealtimeListingsGridProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to listing changes for this agent
    const channel = supabase
      .channel('agent-listings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          setLastUpdate(new Date())

          if (payload.eventType === 'UPDATE' && payload.new) {
            setListings(prev => prev.map(listing =>
              listing.id === payload.new.id
                ? { ...listing, ...payload.new as Partial<Listing> }
                : listing
            ))
          } else if (payload.eventType === 'INSERT' && payload.new) {
            // New listing - fetch full data with media
            fetchListingWithMedia(payload.new.id as string).then(newListing => {
              if (newListing) {
                setListings(prev => [newListing, ...prev])
              }
            })
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setListings(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId])

  async function fetchListingWithMedia(listingId: string): Promise<Listing | null> {
    const supabase = createClient()

    const { data: listing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (!listing) return null

    const { data: media } = await supabase
      .from('media_assets')
      .select('id, listing_id, media_url, type')
      .eq('listing_id', listingId)

    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId)

    // Check for AI content (may not exist yet)
    let hasAIContent = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('listing_skill_outputs')
        .select('*', { count: 'exact', head: true })
        .eq('listing_id', listingId)
        .eq('status', 'completed')
      hasAIContent = (count || 0) > 0
    } catch {
      // Table may not exist yet
    }

    return {
      ...listing,
      media_assets: media || [],
      lead_count: leadCount || 0,
      has_ai_content: hasAIContent,
    } as Listing
  }

  if (listings.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      {/* Live Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-neutral-500'}`} />
          <span className="text-[13px] text-[#636366]">
            {isLive ? 'Live updates' : 'Connecting...'}
          </span>
        </div>
        {lastUpdate && (
          <span className="text-[11px] text-[#636366]">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Listings Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const heroImage = listing.media_assets?.find(
            (m) => m.type === 'photo'
          )

          return (
            <div
              key={listing.id}
              className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1c1c1e] transition-all hover:border-white/[0.15]"
            >
              {/* Image */}
              <div className="relative h-40 bg-[#0a0a0a]">
                {heroImage?.media_url ? (
                  <img
                    src={heroImage.media_url}
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

                {/* Ops Status Overlay */}
                {listing.ops_status && listing.ops_status !== 'delivered' && (
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                    <RefreshCw className="mr-1 inline-block h-3 w-3 animate-spin" />
                    {listing.ops_status.replace('_', ' ')}
                  </div>
                )}
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
                  <div className="flex items-center gap-2">
                    {/* AI Content Badge */}
                    {listing.has_ai_content && (
                      <AIIndicator hasContent={true} />
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
                    agentId={agentId}
                    propertyAddress={`${listing.address}, ${listing.city}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
