import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Listing = Database['public']['Tables']['listings']['Row']
type MediaAsset = Database['public']['Tables']['media_assets']['Row']
type Agent = Database['public']['Tables']['agents']['Row']

export interface ListingWithDetails extends Listing {
  agent: Agent | null
  media_assets: MediaAsset[]
}

// Get listing by ID with all media assets
export async function getListingById(
  listingId: string
): Promise<ListingWithDetails | null> {
  const supabase = await createClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      agent:agents(*),
      media_assets(*)
    `)
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    console.error('Error fetching listing:', error)
    return null
  }

  return listing as unknown as ListingWithDetails
}

// Get listing by Aryeo listing ID
export async function getListingByAryeoId(
  aryeoListingId: string
): Promise<ListingWithDetails | null> {
  const supabase = await createClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      agent:agents(*),
      media_assets(*)
    `)
    .eq('aryeo_listing_id', aryeoListingId)
    .single()

  if (error || !listing) {
    console.error('Error fetching listing by Aryeo ID:', error)
    return null
  }

  return listing as unknown as ListingWithDetails
}

// Get all listings for an agent
export async function getAgentListings(
  agentId: string
): Promise<ListingWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      agent:agents(*),
      media_assets(*)
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching agent listings:', error)
    return []
  }

  return data as unknown as ListingWithDetails[]
}

// Organize media assets by category for delivery page
export function organizeMediaByCategory(
  assets: MediaAsset[]
): Record<string, MediaAsset[]> {
  const categories: Record<string, MediaAsset[]> = {
    mls: [],
    social_feed: [],
    social_stories: [],
    print: [],
    video: [],
    interactive: [],
    floorplan: [],
    matterport: [],
  }

  for (const asset of assets) {
    // First check type
    if (asset.type === 'video') {
      categories.video.push(asset)
    } else if (asset.type === 'floorplan') {
      categories.floorplan.push(asset)
    } else if (asset.type === 'matterport') {
      categories.matterport.push(asset)
    } else if (asset.type === 'interactive') {
      categories.interactive.push(asset)
    } else if (asset.category) {
      // Use category if set
      if (categories[asset.category]) {
        categories[asset.category].push(asset)
      } else {
        categories.mls.push(asset)
      }
    } else {
      // Default to MLS
      categories.mls.push(asset)
    }
  }

  // Sort by sort_order within each category
  for (const key of Object.keys(categories)) {
    categories[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  return categories
}

// Get category display info
export function getCategoryInfo(category: string): {
  title: string
  description: string
  tip: string
} {
  const categoryInfo: Record<string, { title: string; description: string; tip: string }> = {
    mls: {
      title: 'MLS Ready',
      description: 'High-resolution photos sized for MLS upload',
      tip: 'Lead with the exterior shot, then living spaces, kitchen, primary bedroom.',
    },
    social_feed: {
      title: 'Social Media Feed',
      description: 'Square and landscape formats for Instagram/Facebook posts',
      tip: 'Post 3-4 images at once for a carousel. Include the exterior + best interior shots.',
    },
    social_stories: {
      title: 'Social Stories',
      description: '9:16 vertical format for Instagram/Facebook Stories',
      tip: 'Create a walkthrough sequence. Add text overlays with key features.',
    },
    print: {
      title: 'Print Ready',
      description: 'High-resolution files for brochures and flyers',
      tip: 'Use these for open house materials and direct mail campaigns.',
    },
    video: {
      title: 'Property Video',
      description: 'Cinematic walkthrough and highlight reels',
      tip: 'Share on YouTube, embed in MLS, and post teasers to social.',
    },
    floorplan: {
      title: 'Floor Plans',
      description: '2D and 3D floor plans',
      tip: 'Floor plans help buyers visualize layout and are highly requested.',
    },
    matterport: {
      title: '3D Virtual Tour',
      description: 'Interactive Matterport tour',
      tip: 'Embed in your listing page and share the link with serious buyers.',
    },
    interactive: {
      title: 'Interactive Content',
      description: 'Zillow 3D Home tours and other interactive media',
      tip: 'Perfect for Zillow Showcase and virtual open houses.',
    },
  }

  return categoryInfo[category] ?? {
    title: category,
    description: '',
    tip: '',
  }
}
