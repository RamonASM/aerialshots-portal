import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PortfolioItem } from '@/components/marketing/portfolio'

const CACHE_REVALIDATION = 3600 // 1 hour

/**
 * Fetch portfolio items from delivered listings
 * Only includes listings with media that have been delivered
 */
export const getPortfolioItems = unstable_cache(
  async (): Promise<PortfolioItem[]> => {
    const supabase = createAdminClient()

    // Fetch delivered listings with their media assets
    // Using 'as any' to bypass type checking for nested selects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listings, error } = await (supabase as any)
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        sqft,
        beds,
        baths,
        media_assets (
          id,
          type,
          media_url,
          storage_path,
          category
        )
      `)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(100)

    if (error || !listings) {
      console.error('Failed to fetch portfolio items:', error)
      return []
    }

    // Transform to portfolio items
    const items: PortfolioItem[] = []

    interface ListingWithMedia {
      id: string
      address: string
      city: string | null
      state: string | null
      sqft: number | null
      beds: number | null
      baths: number | null
      media_assets: Array<{
        id: string
        type: string
        media_url: string | null
        storage_path: string | null
        category: string | null
      }> | null
    }

    for (const listing of listings as ListingWithMedia[]) {
      if (!listing.media_assets) continue

      for (const asset of listing.media_assets) {
        // Map asset type to portfolio type
        const portfolioType = mapAssetType(asset.type)
        if (!portfolioType) continue

        // Use media_url or construct storage URL
        const imageUrl = asset.media_url || asset.storage_path || ''
        if (!imageUrl) continue

        // Generate property type from beds/baths
        const propertyType = listing.beds
          ? `${listing.beds} bed${listing.beds > 1 ? 's' : ''}`
          : undefined

        items.push({
          id: asset.id,
          type: portfolioType,
          src: imageUrl,
          thumbnail: imageUrl, // Would use thumbnail variant in production
          title: listing.address,
          location: listing.city && listing.state
            ? `${listing.city}, ${listing.state}`
            : undefined,
          propertyType,
          sqft: listing.sqft || undefined,
          width: 1600, // Default dimensions
          height: 1200,
          featured: false,
        })
      }
    }

    return items
  },
  ['portfolio-items'],
  { revalidate: CACHE_REVALIDATION, tags: ['portfolio'] }
)

/**
 * Map database asset type to portfolio type
 */
function mapAssetType(type: string): PortfolioItem['type'] | null {
  const typeMap: Record<string, PortfolioItem['type']> = {
    'photo': 'photo',
    'interior': 'photo',
    'exterior': 'photo',
    'video': 'video',
    'walkthrough': 'video',
    'drone': 'drone',
    'aerial': 'drone',
    '3d': '3d-tour',
    'matterport': '3d-tour',
    'zillow-3d': '3d-tour',
    'staging': 'staging',
    'virtual-staging': 'staging',
    'floor-plan': 'floor-plan',
    'floorplan': 'floor-plan',
  }

  return typeMap[type.toLowerCase()] || null
}

/**
 * Fetch featured portfolio items for homepage
 */
export const getFeaturedPortfolioItems = unstable_cache(
  async (limit = 6): Promise<PortfolioItem[]> => {
    const allItems = await getPortfolioItems()

    // Get featured items first, then fill with recent items
    const featured = allItems.filter(item => item.featured)
    const nonFeatured = allItems.filter(item => !item.featured)

    return [...featured, ...nonFeatured].slice(0, limit)
  },
  ['featured-portfolio'],
  { revalidate: CACHE_REVALIDATION, tags: ['portfolio'] }
)

/**
 * Fetch virtual staging examples for showcase
 */
export const getStagingExamples = unstable_cache(
  async (): Promise<Array<{
    id: string
    before: string
    after: string
    room: string
    style: string
  }>> => {
    const supabase = createAdminClient()

    // Fetch staging pairs from media assets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stagingAssets, error } = await (supabase as any)
      .from('media_assets')
      .select('id, media_url, storage_path, category')
      .eq('type', 'staging')
      .order('created_at', { ascending: false })
      .limit(6)

    if (error || !stagingAssets) {
      console.error('Failed to fetch staging examples:', error)
      return []
    }

    // For now, return placeholder data since we need proper before/after pairs
    // In production, this would come from a dedicated staging_pairs table
    return (stagingAssets as Array<{
      id: string
      media_url: string | null
      storage_path: string | null
      category: string | null
    }>).map((asset, index) => {
      const rooms = ['Living Room', 'Master Bedroom', 'Kitchen', 'Dining Room', 'Office', 'Guest Room']
      const styles = ['Modern', 'Transitional', 'Contemporary', 'Farmhouse', 'Coastal', 'Minimalist']

      return {
        id: asset.id,
        before: '', // Would come from original photo
        after: asset.media_url || asset.storage_path || '',
        room: rooms[index % rooms.length],
        style: styles[index % styles.length],
      }
    }).filter(item => item.after)
  },
  ['staging-examples'],
  { revalidate: CACHE_REVALIDATION, tags: ['portfolio', 'staging'] }
)

/**
 * Get portfolio stats for display
 */
export const getPortfolioStats = unstable_cache(
  async (): Promise<{
    totalPhotos: number
    totalVideos: number
    totalDrone: number
    total3DTours: number
    totalStaged: number
    totalListings: number
  }> => {
    const items = await getPortfolioItems()

    return {
      totalPhotos: items.filter(i => i.type === 'photo').length,
      totalVideos: items.filter(i => i.type === 'video').length,
      totalDrone: items.filter(i => i.type === 'drone').length,
      total3DTours: items.filter(i => i.type === '3d-tour').length,
      totalStaged: items.filter(i => i.type === 'staging').length,
      totalListings: new Set(items.map(i => i.title)).size,
    }
  },
  ['portfolio-stats'],
  { revalidate: CACHE_REVALIDATION, tags: ['portfolio'] }
)
