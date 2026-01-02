/**
 * Media URL Resolution Utilities
 *
 * Provides functions to resolve media URLs from ASM native storage.
 */

import type { Database } from '@/lib/supabase/types'

type MediaAsset = Database['public']['Tables']['media_assets']['Row']

/**
 * Partial type for resolveMediaUrl - allows for partial asset objects
 * Useful when only specific fields are selected from the database
 */
export type PartialMediaAsset = {
  aryeo_url?: string | null
  storage_path?: string | null
  media_url?: string | null
}

/**
 * Resolves the best available URL for a media asset.
 * Priority order:
 * 1. aryeo_url (external CDN URL)
 * 2. storage_path (Supabase Storage path)
 *
 * @param asset - The media asset record (can be partial)
 * @returns The resolved URL or null if no URL is available
 */
export function resolveMediaUrl(asset: PartialMediaAsset | MediaAsset | null | undefined): string | null {
  if (!asset) return null

  // 1. Prefer media URL (native storage)
  if ('media_url' in asset && asset.media_url) {
    return asset.media_url
  }

  // 2. Prefer aryeo URL (external CDN)
  if ('aryeo_url' in asset && asset.aryeo_url) {
    return asset.aryeo_url
  }

  // 3. Use storage path (Supabase Storage)
  if ('storage_path' in asset && asset.storage_path) {
    return asset.storage_path
  }

  return null
}

/**
 * Determines the source of a media asset's URL
 */
export type MediaUrlSource = 'native' | 'approved' | 'processed' | 'missing'

/**
 * Gets the source type for a media asset's URL
 */
export function getMediaUrlSource(asset: MediaAsset): MediaUrlSource {
  if (asset.media_url) return 'native'
  if (asset.approved_storage_path) return 'approved'
  if (asset.processed_storage_path) return 'processed'
  return 'missing'
}

/**
 * Checks if a media asset has been migrated to native storage
 */
export function isNativeMedia(asset: MediaAsset): boolean {
  return asset.migration_status === 'completed' && !!asset.media_url
}

/**
 * Resolves URLs for an array of media assets
 */
export function resolveMediaUrls(assets: MediaAsset[]): Array<{
  id: string
  url: string | null
  source: MediaUrlSource
  type: string
  category: string | null
}> {
  return assets.map((asset) => ({
    id: asset.id,
    url: resolveMediaUrl(asset),
    source: getMediaUrlSource(asset),
    type: asset.type,
    category: asset.category,
  }))
}

/**
 * Filters media assets by URL source
 */
export function filterBySource(
  assets: MediaAsset[],
  source: MediaUrlSource
): MediaAsset[] {
  return assets.filter((asset) => getMediaUrlSource(asset) === source)
}

/**
 * Gets stats for an array of media assets
 */
export function getMediaStats(assets: MediaAsset[]): {
  total: number
  native: number
  processed: number
  missing: number
} {
  const stats = {
    total: assets.length,
    native: 0,
    processed: 0,
    missing: 0,
  }

  for (const asset of assets) {
    const source = getMediaUrlSource(asset)
    if (source === 'native') stats.native++
    else if (source === 'processed' || source === 'approved') stats.processed++
    else stats.missing++
  }

  return stats
}

/**
 * @deprecated Use getMediaStats instead
 */
export const getMigrationStats = getMediaStats

/**
 * Checks if a URL is from ASM native storage
 */
export function isNativeUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  return url.startsWith(supabaseUrl)
}
