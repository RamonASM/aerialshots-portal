/**
 * MLS Integration Client
 *
 * Direct photo upload to MLS providers (FlexMLS, Matrix, Bright MLS, etc.)
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Types
export interface MLSProvider {
  id: string
  name: string
  slug: string
  provider_type: 'flexmls' | 'matrix' | 'bright' | 'crmls' | 'stellar' | 'other'
  api_base_url?: string
  supports_photo_upload: boolean
  supports_video_upload: boolean
  supports_3d_tour: boolean
  max_photos: number
  is_active: boolean
}

export interface MLSCredentials {
  provider_slug?: string
  agent_id: string
  password: string
  office_id?: string
}

export interface MLSPhoto {
  url: string
  order: number
  caption?: string
  is_primary?: boolean
}

export interface MLSUploadResult {
  success: boolean
  uploaded_count: number
  failed_count: number
  results: {
    id?: string
    order: number
    status: 'success' | 'failed'
    error?: string
  }[]
  error?: string
}

export interface MLSListing {
  listing_id: string
  address?: string
  status?: string
  photos?: { id: string; url: string }[]
}

// Provider API configurations
const PROVIDER_APIS: Record<string, { baseUrl: string; authType: 'basic' | 'bearer' | 'custom' }> = {
  flexmls: { baseUrl: 'https://api.flexmls.com/v1', authType: 'bearer' },
  matrix: { baseUrl: 'https://api.matrix.com/reso', authType: 'bearer' },
  bright: { baseUrl: 'https://api.brightmls.com/v1', authType: 'bearer' },
  crmls: { baseUrl: 'https://api.crmls.org/v1', authType: 'bearer' },
  stellar: { baseUrl: 'https://api.stellarmls.com/v1', authType: 'bearer' },
}

// Default providers (used when database not available)
const DEFAULT_PROVIDERS: MLSProvider[] = [
  // National providers
  {
    id: '1',
    name: 'FlexMLS',
    slug: 'flexmls',
    provider_type: 'flexmls',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  {
    id: '2',
    name: 'Matrix',
    slug: 'matrix',
    provider_type: 'matrix',
    supports_photo_upload: true,
    supports_video_upload: false,
    supports_3d_tour: true,
    max_photos: 40,
    is_active: true,
  },
  {
    id: '3',
    name: 'Bright MLS',
    slug: 'bright',
    provider_type: 'bright',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  // Florida MLS providers
  {
    id: '10',
    name: 'Stellar MLS (Central Florida)',
    slug: 'stellar-mls',
    provider_type: 'stellar',
    api_base_url: 'https://api.stellarmls.com/v1',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  {
    id: '11',
    name: 'Space Coast MLS',
    slug: 'space-coast-mls',
    provider_type: 'flexmls',
    api_base_url: 'https://api.spacecoastmls.com/v1',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  {
    id: '12',
    name: 'Orlando Regional Realtors',
    slug: 'orra',
    provider_type: 'matrix',
    api_base_url: 'https://api.orlandorealtors.org/v1',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  {
    id: '13',
    name: 'Polk County MLS',
    slug: 'polk-mls',
    provider_type: 'flexmls',
    api_base_url: 'https://api.polkmls.com/v1',
    supports_photo_upload: true,
    supports_video_upload: false,
    supports_3d_tour: true,
    max_photos: 40,
    is_active: true,
  },
  {
    id: '14',
    name: 'My Florida Regional MLS (Tampa)',
    slug: 'mfrmls',
    provider_type: 'matrix',
    api_base_url: 'https://api.mfrmls.com/v1',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
  {
    id: '15',
    name: 'Greater Tampa Realtors MLS',
    slug: 'gtar-mls',
    provider_type: 'matrix',
    api_base_url: 'https://api.tamparealtors.org/v1',
    supports_photo_upload: true,
    supports_video_upload: true,
    supports_3d_tour: true,
    max_photos: 50,
    is_active: true,
  },
]

/**
 * List available MLS providers
 */
export async function listMLSProviders(): Promise<MLSProvider[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('mls_providers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error || !data) {
      return DEFAULT_PROVIDERS
    }

    return data
  } catch {
    return DEFAULT_PROVIDERS
  }
}

/**
 * Get MLS provider by slug
 */
export async function getMLSProvider(slug: string): Promise<MLSProvider | null> {
  const providers = await listMLSProviders()
  return providers.find((p) => p.slug === slug) || null
}

/**
 * Validate MLS credentials
 */
export async function validateMLSCredentials(
  credentials: MLSCredentials
): Promise<{ valid: boolean; agent_name?: string; error?: string }> {
  const providerSlug = credentials.provider_slug || 'flexmls'
  const provider = await getMLSProvider(providerSlug)

  if (!provider) {
    return { valid: false, error: 'Unknown MLS provider' }
  }

  const apiConfig = PROVIDER_APIS[providerSlug] || PROVIDER_APIS.flexmls

  try {
    const response = await fetch(`${apiConfig.baseUrl}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${credentials.agent_id}:${credentials.password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        agent_id: credentials.agent_id,
        office_id: credentials.office_id,
      }),
    })

    if (!response.ok) {
      return { valid: false, error: 'Invalid credentials' }
    }

    const data = await response.json()
    return { valid: true, agent_name: data.agent_name }
  } catch (error) {
    return { valid: false, error: `Connection error: ${error}` }
  }
}

/**
 * Upload photos to MLS
 */
export async function uploadPhotosToMLS(params: {
  provider_slug: string
  listing_id: string
  photos: MLSPhoto[]
  credentials: { agent_id: string; password: string; office_id?: string }
  replace_existing?: boolean
}): Promise<MLSUploadResult> {
  const { provider_slug, listing_id, photos, credentials, replace_existing } = params

  // Validate listing ID
  if (!listing_id || listing_id.trim() === '') {
    throw new Error('Listing ID is required')
  }

  // Get provider
  const provider = await getMLSProvider(provider_slug)

  if (!provider) {
    return { success: false, uploaded_count: 0, failed_count: 0, results: [], error: 'Unknown MLS provider' }
  }

  // Check max photos
  if (photos.length > provider.max_photos) {
    throw new Error(`Photo count (${photos.length}) exceeds maximum allowed (${provider.max_photos})`)
  }

  const apiConfig = PROVIDER_APIS[provider_slug] || PROVIDER_APIS.flexmls

  try {
    // Delete existing photos if replace mode
    if (replace_existing) {
      await fetch(`${apiConfig.baseUrl}/listings/${listing_id}/photos`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${credentials.agent_id}:${credentials.password}`).toString('base64')}`,
        },
      })
    }

    // Upload new photos
    const response = await fetch(`${apiConfig.baseUrl}/listings/${listing_id}/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${credentials.agent_id}:${credentials.password}`).toString('base64')}`,
      },
      body: JSON.stringify({
        photos: photos.map((p) => ({
          url: p.url,
          order: p.order,
          caption: p.caption,
          is_primary: p.is_primary || p.order === 1,
        })),
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, uploaded_count: 0, failed_count: 0, results: [], error: 'Rate limited - please try again later' }
      }
      if (response.status === 401) {
        return { success: false, uploaded_count: 0, failed_count: 0, results: [], error: 'Authentication failed' }
      }
      return { success: false, uploaded_count: 0, failed_count: 0, results: [], error: `Upload failed: ${response.status}` }
    }

    const data = await response.json()
    const results = data.uploaded || []

    const uploaded = results.filter((r: { status: string }) => r.status === 'success')
    const failed = results.filter((r: { status: string }) => r.status === 'failed')

    return {
      success: failed.length === 0,
      uploaded_count: uploaded.length,
      failed_count: failed.length,
      results,
    }
  } catch (error) {
    return {
      success: false,
      uploaded_count: 0,
      failed_count: photos.length,
      results: [],
      error: `Network error: ${error}`,
    }
  }
}

/**
 * MLS Client Class
 *
 * Convenient wrapper for MLS operations
 */
export class MLSClient {
  private providerSlug: string
  private credentials: { agent_id: string; password: string; office_id?: string }

  constructor(
    providerSlug: string,
    credentials: { agent_id: string; password: string; office_id?: string }
  ) {
    this.providerSlug = providerSlug
    this.credentials = credentials
  }

  getProviderSlug(): string {
    return this.providerSlug
  }

  async isAuthenticated(): Promise<boolean> {
    const result = await validateMLSCredentials({
      provider_slug: this.providerSlug,
      ...this.credentials,
    })
    return result.valid
  }

  async uploadPhotos(listingId: string, photos: MLSPhoto[]): Promise<MLSUploadResult> {
    return uploadPhotosToMLS({
      provider_slug: this.providerSlug,
      listing_id: listingId,
      photos,
      credentials: this.credentials,
    })
  }

  async getListing(listingId: string): Promise<MLSListing | null> {
    const apiConfig = PROVIDER_APIS[this.providerSlug] || PROVIDER_APIS.flexmls

    try {
      const response = await fetch(`${apiConfig.baseUrl}/listings/${listingId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.credentials.agent_id}:${this.credentials.password}`).toString('base64')}`,
        },
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch {
      return null
    }
  }
}
