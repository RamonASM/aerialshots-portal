import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'
import type { Tables } from '@/lib/supabase/types'
import type { CommunityRow } from '@/lib/supabase/types-custom'

export type Community = CommunityRow

/**
 * Get a community by its slug
 * Cached for 5 minutes
 */
export const getCommunityBySlug = unstable_cache(
  async (slug: string): Promise<Community | null> => {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single() as { data: CommunityRow | null; error: Error | null }

    if (error) {
      console.error('Error fetching community:', error)
      return null
    }

    return data
  },
  ['community-by-slug'],
  {
    revalidate: CACHE_REVALIDATION.AGENT, // 5 minutes
    tags: [CACHE_TAGS.AGENTS, 'communities'],
  }
)

/**
 * Get all published communities
 */
export const getAllCommunities = unstable_cache(
  async (): Promise<Community[]> => {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('communities')
      .select('*')
      .eq('is_published', true)
      .order('name', { ascending: true }) as { data: CommunityRow[] | null; error: Error | null }

    if (error) {
      console.error('Error fetching communities:', error)
      return []
    }

    return data || []
  },
  ['all-communities'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: ['communities'],
  }
)

/**
 * Get listings within a community's area
 * Uses bounding box + Haversine distance calculation
 */
export const getListingsInCommunity = unstable_cache(
  async (
    lat: number,
    lng: number,
    radiusMiles: number = 5
  ): Promise<Tables<'listings'>[]> => {
    const supabase = createAdminClient()

    // Calculate bounding box for initial filter
    const latDelta = radiusMiles / 69.0 // ~69 miles per degree of latitude
    const lngDelta = radiusMiles / (69.0 * Math.cos(lat * (Math.PI / 180)))

    const { data, error } = await supabase
      .from('listings')
      .select('*, media_assets(*)')
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error fetching listings in community:', error)
      return []
    }

    // Post-filter using Haversine formula for accurate distance
    const filteredListings = (data || []).filter((listing) => {
      if (!listing.lat || !listing.lng) return false
      const distance = haversineDistance(lat, lng, listing.lat, listing.lng)
      return distance <= radiusMiles
    })

    return filteredListings
  },
  ['listings-in-community'],
  {
    revalidate: CACHE_REVALIDATION.LISTING, // 60 seconds
    tags: [CACHE_TAGS.LISTINGS],
  }
)

/**
 * Get featured agents for a community
 */
export const getFeaturedAgents = unstable_cache(
  async (agentIds: string[]): Promise<Tables<'agents'>[]> => {
    if (!agentIds || agentIds.length === 0) return []

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .in('id', agentIds)

    if (error) {
      console.error('Error fetching featured agents:', error)
      return []
    }

    return data || []
  },
  ['featured-agents'],
  {
    revalidate: CACHE_REVALIDATION.AGENT,
    tags: [CACHE_TAGS.AGENTS],
  }
)

/**
 * Get recently sold listings in a community area
 */
export const getRecentSalesInCommunity = unstable_cache(
  async (
    lat: number,
    lng: number,
    radiusMiles: number = 5,
    limit: number = 6
  ): Promise<Tables<'listings'>[]> => {
    const supabase = createAdminClient()

    const latDelta = radiusMiles / 69.0
    const lngDelta = radiusMiles / (69.0 * Math.cos(lat * (Math.PI / 180)))

    const { data, error } = await supabase
      .from('listings')
      .select('*, media_assets(*)')
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .eq('status', 'sold')
      .order('sold_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent sales:', error)
      return []
    }

    return (data || []).filter((listing) => {
      if (!listing.lat || !listing.lng) return false
      const distance = haversineDistance(lat, lng, listing.lat, listing.lng)
      return distance <= radiusMiles
    })
  },
  ['recent-sales-in-community'],
  {
    revalidate: CACHE_REVALIDATION.LISTING,
    tags: [CACHE_TAGS.LISTINGS],
  }
)

/**
 * Haversine formula to calculate distance between two points
 * Returns distance in miles
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
