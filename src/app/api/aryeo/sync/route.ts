import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAryeoClient, isAryeoConfigured } from '@/lib/integrations/aryeo/client'
import { transformListing, transformMedia, transformAgent } from '@/lib/integrations/aryeo/transformer'
import type { Database } from '@/lib/supabase/types'

type AgentInsert = Database['public']['Tables']['agents']['Insert']
type ListingInsert = Database['public']['Tables']['listings']['Insert']
type MediaAssetInsert = Database['public']['Tables']['media_assets']['Insert']

// Admin endpoint to sync all listings from Aryeo
// This should only be called during initial setup or for data recovery

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const fullSync = body.full_sync === true

    // Check if Aryeo is configured
    if (!isAryeoConfigured()) {
      return NextResponse.json(
        { error: 'Aryeo integration not configured. Set ARYEO_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    const aryeo = requireAryeoClient()
    const supabase = createAdminClient()

    const stats = {
      listings_synced: 0,
      agents_synced: 0,
      media_synced: 0,
      errors: [] as string[],
    }

    // Fetch all listings from Aryeo
    console.log('Fetching listings from Aryeo...')
    const listings = await aryeo.getAllDeliveredListings()
    console.log(`Found ${listings.length} listings`)

    for (const aryeoListing of listings) {
      try {
        // Handle agent first
        let agentId: string | undefined

        if (aryeoListing.list_agent?.email) {
          const agentData = transformAgent(aryeoListing.list_agent) as AgentInsert | null

          if (agentData) {
            const { data: agent, error } = await supabase
              .from('agents')
              .upsert(agentData as AgentInsert, { onConflict: 'email' })
              .select('id')
              .single()

            if (error) {
              stats.errors.push(`Agent sync error for ${agentData.email}: ${error.message}`)
            } else {
              agentId = agent?.id
              stats.agents_synced++
            }
          }
        }

        // Transform and upsert listing
        const listingData = transformListing(aryeoListing, agentId)

        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .upsert(listingData, { onConflict: 'aryeo_listing_id' })
          .select('id')
          .single()

        if (listingError) {
          stats.errors.push(`Listing sync error for ${aryeoListing.id}: ${listingError.message}`)
          continue
        }

        stats.listings_synced++

        // Sync media if listing was delivered
        if (listing?.id && aryeoListing.delivery_status === 'DELIVERED') {
          const mediaAssets = transformMedia(aryeoListing, listing.id)

          if (mediaAssets.length > 0) {
            if (fullSync) {
              // Delete existing media and replace
              await supabase
                .from('media_assets')
                .delete()
                .eq('listing_id', listing.id)
            }

            const { error: mediaError } = await supabase
              .from('media_assets')
              .upsert(mediaAssets, { onConflict: 'id' })

            if (mediaError) {
              stats.errors.push(`Media sync error for listing ${listing.id}: ${mediaError.message}`)
            } else {
              stats.media_synced += mediaAssets.length
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        stats.errors.push(`Error processing listing ${aryeoListing.id}: ${message}`)
      }
    }

    return NextResponse.json({
      status: 'ok',
      stats,
      message: `Sync completed: ${stats.listings_synced} listings, ${stats.agents_synced} agents, ${stats.media_synced} media assets`,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Get counts
    const [listings, agents, media, webhookEvents] = await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('media_assets').select('id', { count: 'exact', head: true }),
      supabase.from('webhook_events').select('status', { count: 'exact', head: true }),
    ])

    // Get recent webhook events
    const { data: recentEvents } = await supabase
      .from('webhook_events')
      .select('event_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      status: 'ok',
      counts: {
        listings: listings.count ?? 0,
        agents: agents.count ?? 0,
        media_assets: media.count ?? 0,
        webhook_events: webhookEvents.count ?? 0,
      },
      recent_events: recentEvents ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
