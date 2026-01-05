import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Asset types
 */
export type AssetType = 'social_post' | 'flyer' | 'instagram_story' | 'facebook_cover' | 'email_header'

/**
 * Marketing asset
 */
export interface MarketingAsset {
  id: string
  kit_id: string
  type: AssetType
  url: string
  format?: string
  dimensions?: { width: number; height: number }
  platform?: string
  template?: string
  has_qr_code?: boolean
  created_at: string
  regenerated_at?: string
}

/**
 * Marketing kit
 */
export interface MarketingKit {
  id: string
  listing_id: string
  assets: MarketingAsset[]
  created_at: string
  updated_at?: string
}

/**
 * Listing data for generation
 */
interface ListingData {
  id: string
  address: string
  price?: number
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  photos: string[]
  agent?: {
    name?: string
    phone?: string
    email?: string
    logo_url?: string
    brand_color?: string
  }
}

/**
 * Generate a complete marketing kit for a listing
 */
export async function generateMarketingKit(
  listingId: string,
  options: {
    asset_types?: AssetType[]
  } = {}
): Promise<{
  success: boolean
  kit?: MarketingKit
  error?: string
}> {
  const { asset_types = ['social_post', 'flyer', 'instagram_story'] } = options

  try {
    const supabase = createAdminClient()

    // Get listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, agent:agents(name, phone, email, logo_url, brand_color)')
      .eq('id', listingId)
      .single()
      .returns<ListingData>()

    if (listingError || !listing) {
      return {
        success: false,
        error: 'Listing not found.',
      }
    }

    // Check for photos
    if (!listing.photos || listing.photos.length === 0) {
      return {
        success: false,
        error: 'Listing must have at least one photo.',
      }
    }

    // Create marketing kit record
    const { data: kit, error: kitError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_kits' as any)
      .insert({
        listing_id: listingId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
      .returns<MarketingKit>()

    if (kitError || !kit) {
      return {
        success: false,
        error: 'Failed to create marketing kit.',
      }
    }

    // Generate each asset type (in real implementation, would call Bannerbear)
    const assets: MarketingAsset[] = []

    for (const assetType of asset_types) {
      const asset: MarketingAsset = {
        id: `asset-${Date.now()}-${assetType}`,
        kit_id: kit.id,
        type: assetType,
        url: `https://cdn.example.com/${assetType}.png`,
        created_at: new Date().toISOString(),
      }
      assets.push(asset)
    }

    kit.assets = assets

    return {
      success: true,
      kit,
    }
  } catch (error) {
    console.error('[MarketingKit] Error generating kit:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Generate social media post image
 */
export async function generateSocialPost(params: {
  listing_id: string
  photo_url: string
  headline?: string
  price?: string
  address?: string
  platform?: 'facebook' | 'twitter' | 'linkedin'
  agent_name?: string
  agent_phone?: string
}): Promise<{
  success: boolean
  asset?: MarketingAsset
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // In real implementation, would call Bannerbear API
    const asset: MarketingAsset = {
      id: `asset-${Date.now()}`,
      kit_id: '',
      type: 'social_post',
      url: 'https://cdn.example.com/social.png',
      platform: params.platform || 'facebook',
      dimensions: { width: 1200, height: 630 },
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .insert({
        listing_id: params.listing_id,
        type: 'social_post' as AssetType,
        url: asset.url,
        platform: asset.platform,
        dimensions: asset.dimensions,
        created_at: asset.created_at,
      })
      .select()
      .single()
      .returns<MarketingAsset>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to generate social post.',
      }
    }

    return {
      success: true,
      asset: data,
    }
  } catch (error) {
    console.error('[MarketingKit] Error generating social post:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Generate property flyer
 */
export async function generatePropertyFlyer(params: {
  listing_id: string
  photos?: string[]
  details?: {
    price?: string
    bedrooms?: number
    bathrooms?: number
    sqft?: number
  }
  template?: 'standard' | 'luxury' | 'modern'
  include_qr_code?: boolean
  property_url?: string
}): Promise<{
  success: boolean
  asset?: MarketingAsset
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const asset: MarketingAsset = {
      id: `asset-${Date.now()}`,
      kit_id: '',
      type: 'flyer',
      url: 'https://cdn.example.com/flyer.pdf',
      format: 'pdf',
      template: params.template || 'standard',
      has_qr_code: params.include_qr_code || false,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .insert({
        listing_id: params.listing_id,
        type: 'flyer' as AssetType,
        url: asset.url,
        format: asset.format,
        template: asset.template,
        has_qr_code: asset.has_qr_code,
        created_at: asset.created_at,
      })
      .select()
      .single()
      .returns<MarketingAsset>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to generate flyer.',
      }
    }

    return {
      success: true,
      asset: data,
    }
  } catch (error) {
    console.error('[MarketingKit] Error generating flyer:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Generate Instagram story image
 */
export async function generateInstagramStory(params: {
  listing_id: string
  photo_url: string
  headline?: string
  animated?: boolean
}): Promise<{
  success: boolean
  asset?: MarketingAsset
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    const asset: MarketingAsset = {
      id: `asset-${Date.now()}`,
      kit_id: '',
      type: 'instagram_story',
      url: params.animated
        ? 'https://cdn.example.com/story.mp4'
        : 'https://cdn.example.com/story.png',
      format: params.animated ? 'mp4' : 'png',
      dimensions: { width: 1080, height: 1920 },
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .insert({
        listing_id: params.listing_id,
        type: 'instagram_story' as AssetType,
        url: asset.url,
        format: asset.format,
        dimensions: asset.dimensions,
        created_at: asset.created_at,
      })
      .select()
      .single()
      .returns<MarketingAsset>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to generate Instagram story.',
      }
    }

    return {
      success: true,
      asset: data,
    }
  } catch (error) {
    console.error('[MarketingKit] Error generating Instagram story:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get existing marketing kit for a listing
 */
export async function getMarketingKit(listingId: string): Promise<MarketingKit | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_kits' as any)
      .select('*, assets:marketing_assets(*)')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .returns<MarketingKit>()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[MarketingKit] Error getting kit:', error)
    return null
  }
}

/**
 * Regenerate a specific asset
 */
export async function regenerateAsset(assetId: string): Promise<{
  success: boolean
  asset?: MarketingAsset
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get current asset
    const { data: currentAsset, error: getError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .select('*')
      .eq('id', assetId)
      .single()
      .returns<MarketingAsset>()

    if (getError || !currentAsset) {
      return {
        success: false,
        error: 'Asset not found.',
      }
    }

    // Regenerate (in real implementation, would call Bannerbear)
    const newUrl = `https://cdn.example.com/regenerated-${Date.now()}.png`

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .update({
        url: newUrl,
        regenerated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .select()
      .single()
      .returns<MarketingAsset>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to regenerate asset.',
      }
    }

    return {
      success: true,
      asset: data,
    }
  } catch (error) {
    console.error('[MarketingKit] Error regenerating asset:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Delete a marketing kit and all assets
 */
export async function deleteMarketingKit(kitId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Delete assets first
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_assets' as any)
      .delete()
      .eq('kit_id', kitId)

    // Delete kit
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('marketing_kits' as any)
      .delete()
      .eq('id', kitId)

    if (error) {
      return {
        success: false,
        error: 'Failed to delete marketing kit.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[MarketingKit] Error deleting kit:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}
