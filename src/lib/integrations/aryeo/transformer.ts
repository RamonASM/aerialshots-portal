// Transform Aryeo data to ASM Portal schema

import type { AryeoListing, AryeoOrder, AryeoImage, AryeoVideo, AryeoFloorPlan, AryeoInteractiveContent } from './types'
import type { Database } from '@/lib/supabase/types'

type ListingInsert = Database['public']['Tables']['listings']['Insert']
type MediaAssetInsert = Database['public']['Tables']['media_assets']['Insert']
type AgentInsert = Database['public']['Tables']['agents']['Insert']

// Helper to generate agent slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Transform Aryeo listing to our listing schema
export function transformListing(
  aryeoListing: AryeoListing,
  agentId?: string
): ListingInsert {
  const address = aryeoListing.address
  const building = aryeoListing.building
  const price = aryeoListing.price

  return {
    aryeo_listing_id: aryeoListing.id,
    agent_id: agentId ?? null,
    address: address.unparsed_address ?? `${address.street_number ?? ''} ${address.street_name ?? ''}`.trim(),
    city: address.city ?? null,
    state: address.state_or_province ?? 'FL',
    zip: address.postal_code ?? null,
    lat: address.latitude ?? null,
    lng: address.longitude ?? null,
    beds: building?.bedrooms ?? null,
    baths: building?.bathrooms ?? null,
    sqft: building?.square_feet ?? null,
    price: price?.list_price ?? null,
    status: mapListingStatus(aryeoListing.status),
    ops_status: mapDeliveryStatus(aryeoListing.delivery_status),
    delivered_at: aryeoListing.delivery_status === 'DELIVERED' ? new Date().toISOString() : null,
  }
}

// Map Aryeo listing status to our simplified status
function mapListingStatus(aryeoStatus: string | null): string {
  if (!aryeoStatus) return 'active'

  const statusMap: Record<string, string> = {
    'FOR_SALE': 'active',
    'FOR_LEASE': 'active',
    'PENDING_SALE': 'active',
    'PENDING_LEASE': 'active',
    'SOLD': 'sold',
    'LEASED': 'sold',
    'OFF_MARKET': 'expired',
    'WITHDRAWN': 'expired',
    'EXPIRED': 'expired',
    'CANCELED': 'expired',
  }

  return statusMap[aryeoStatus] ?? 'active'
}

// Map Aryeo delivery status to our ops status
function mapDeliveryStatus(deliveryStatus: string): string {
  switch (deliveryStatus) {
    case 'DELIVERED':
      return 'delivered'
    case 'SCHEDULED':
      return 'scheduled'
    case 'UNDELIVERED':
    default:
      return 'pending'
  }
}

// Transform Aryeo media to our media_assets schema
export function transformMedia(
  aryeoListing: AryeoListing,
  listingId: string
): MediaAssetInsert[] {
  const assets: MediaAssetInsert[] = []

  // Transform photos
  aryeoListing.images.forEach((image, index) => {
    assets.push({
      listing_id: listingId,
      aryeo_url: image.original_url || image.large_thumbnail_url,
      type: 'photo',
      category: categorizePhoto(image, index),
      sort_order: image.index ?? index,
    })
  })

  // Transform videos
  aryeoListing.videos.forEach((video, index) => {
    assets.push({
      listing_id: listingId,
      aryeo_url: video.download_url || video.playback_url || '',
      type: 'video',
      category: categorizeVideo(video),
      sort_order: index,
    })
  })

  // Transform floor plans
  aryeoListing.floor_plans.forEach((floorPlan, index) => {
    assets.push({
      listing_id: listingId,
      aryeo_url: floorPlan.original_url,
      type: 'floorplan',
      category: null,
      sort_order: floorPlan.index ?? index,
    })
  })

  // Transform interactive content (Matterport, 3D tours, etc.)
  aryeoListing.interactive_content.forEach((content, index) => {
    assets.push({
      listing_id: listingId,
      aryeo_url: content.url,
      type: content.content_type === 'MATTERPORT' ? 'matterport' : 'interactive',
      category: null,
      sort_order: index,
    })
  })

  return assets
}

// Categorize photos by use case
function categorizePhoto(image: AryeoImage, index: number): string {
  // First few photos are typically MLS-ready hero shots
  if (index < 10) return 'mls'

  // Use caption to determine category if available
  const caption = image.caption?.toLowerCase() ?? ''

  if (caption.includes('exterior') || caption.includes('front') || caption.includes('drone') || caption.includes('aerial')) {
    return 'mls'
  }
  if (caption.includes('social') || caption.includes('lifestyle')) {
    return 'social_feed'
  }
  if (caption.includes('story') || caption.includes('stories')) {
    return 'social_stories'
  }
  if (caption.includes('print') || caption.includes('brochure')) {
    return 'print'
  }

  // Default to MLS for gallery display
  return 'mls'
}

// Categorize videos
function categorizeVideo(video: AryeoVideo): string {
  const displayType = video.display_type?.toLowerCase() ?? ''
  const title = video.title?.toLowerCase() ?? ''

  if (displayType.includes('social') || title.includes('social') || title.includes('reel')) {
    return 'social_feed'
  }
  if (displayType.includes('story') || title.includes('story')) {
    return 'social_stories'
  }

  return 'video'
}

// Transform Aryeo customer/agent to our agent schema
export function transformAgent(
  aryeoCustomer: AryeoListing['list_agent']
): AgentInsert | null {
  if (!aryeoCustomer || !aryeoCustomer.email) return null

  return {
    email: aryeoCustomer.email,
    name: aryeoCustomer.name ?? 'Unknown Agent',
    slug: generateSlug(aryeoCustomer.name ?? aryeoCustomer.email.split('@')[0]),
    phone: aryeoCustomer.phone ?? null,
    headshot_url: aryeoCustomer.avatar_url ?? null,
    logo_url: aryeoCustomer.logo_url ?? null,
    aryeo_customer_id: aryeoCustomer.id,
  }
}

// Transform Aryeo order to update listing with order info
export function transformOrderToListingUpdate(
  aryeoOrder: AryeoOrder
): Partial<ListingInsert> {
  return {
    aryeo_order_id: aryeoOrder.id,
    ops_status: mapOrderStatus(aryeoOrder.fulfillment_status),
    scheduled_at: aryeoOrder.fulfilled_at ?? null,
    is_rush: false, // Could be determined from order items/tags
  }
}

// Map order fulfillment status to ops status
function mapOrderStatus(fulfillmentStatus: string | null): string {
  if (!fulfillmentStatus) return 'pending'

  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'SCHEDULED': 'scheduled',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'delivered',
    'FULFILLED': 'delivered',
    'CANCELED': 'pending',
  }

  return statusMap[fulfillmentStatus.toUpperCase()] ?? 'pending'
}

// Determine order type for referral credits
export function determineOrderType(
  aryeoOrder: AryeoOrder
): 'photo' | 'video' | 'premium' | null {
  const items = aryeoOrder.items ?? []
  const total = aryeoOrder.total_amount ?? 0

  // Check for premium package indicators
  const hasVideo = items.some(item =>
    item.title?.toLowerCase().includes('video') ||
    item.title?.toLowerCase().includes('signature') ||
    item.title?.toLowerCase().includes('luxury')
  )

  const hasPremium = items.some(item =>
    item.title?.toLowerCase().includes('premium') ||
    item.title?.toLowerCase().includes('luxury') ||
    item.title?.toLowerCase().includes('pro+')
  )

  // Based on ASM pricing: Essentials $315-580, Signature $449-700, Luxury $649-1100
  if (hasPremium || total >= 600) return 'premium'
  if (hasVideo || total >= 400) return 'video'
  if (total > 0) return 'photo'

  return null
}
