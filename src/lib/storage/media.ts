/**
 * ASM Media Storage Service
 *
 * Native media storage using Supabase Storage to replace Aryeo CDN.
 * Provides organized bucket structure for different media types.
 * Includes circuit breaker protection for resilience.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { withCircuitBreaker, CircuitOpenError } from '@/lib/resilience/circuit-breaker'

// Media type definitions
export type MediaType =
  | 'photo'
  | 'video'
  | 'floor_plan'
  | 'document'
  | 'virtual_staging'
  | 'drone'
  | 'twilight'
  | '3d_tour'
  | 'matterport'

// Bucket mapping for each media type
const BUCKET_MAP: Record<MediaType, string> = {
  photo: 'listing-photos',
  video: 'listing-videos',
  floor_plan: 'floor-plans',
  document: 'listing-documents',
  virtual_staging: 'virtual-staging',
  drone: 'drone-media',
  twilight: 'twilight-photos',
  '3d_tour': '3d-tours',
  matterport: 'matterport-tours',
}

// Default bucket for unknown types
const DEFAULT_BUCKET = 'listing-media'

// File size limits in bytes
const SIZE_LIMITS: Record<MediaType, number> = {
  photo: 50 * 1024 * 1024, // 50MB
  video: 2 * 1024 * 1024 * 1024, // 2GB
  floor_plan: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  virtual_staging: 50 * 1024 * 1024, // 50MB
  drone: 50 * 1024 * 1024, // 50MB
  twilight: 50 * 1024 * 1024, // 50MB
  '3d_tour': 500 * 1024 * 1024, // 500MB
  matterport: 500 * 1024 * 1024, // 500MB
}

// Allowed MIME types per media type
const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  floor_plan: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  virtual_staging: ['image/jpeg', 'image/png', 'image/webp'],
  drone: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'],
  twilight: ['image/jpeg', 'image/png', 'image/webp'],
  '3d_tour': ['application/octet-stream', 'model/gltf-binary', 'model/gltf+json'],
  matterport: ['application/json', 'text/html'],
}

// Folder names for path generation
const TYPE_FOLDERS: Record<MediaType, string> = {
  photo: 'photos',
  video: 'videos',
  floor_plan: 'floor_plans',
  document: 'documents',
  virtual_staging: 'staging',
  drone: 'drone',
  twilight: 'twilight',
  '3d_tour': '3d_tours',
  matterport: 'matterport',
}

export interface StoredMedia {
  id: string
  url: string
  path: string
  bucket: string
  type: MediaType
  filename: string
  size: number
  contentType: string
  category?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface MediaUploadOptions {
  listingId: string
  type: MediaType
  file: Buffer | ArrayBuffer
  filename: string
  contentType: string
  category?: string
  metadata?: Record<string, unknown>
}

export interface UploadFromUrlOptions {
  listingId: string
  type: MediaType
  sourceUrl: string
  filename: string
  category?: string
  metadata?: Record<string, unknown>
}

export interface MigrateFromAryeoOptions {
  listingId: string
  aryeoUrl: string
  type: MediaType
  category?: string
  originalMetadata?: Record<string, unknown>
}

export interface UploadResult {
  success: boolean
  media?: StoredMedia
  error?: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

export interface MigrateResult {
  success: boolean
  newUrl?: string
  path?: string
  metadata?: Record<string, unknown>
  error?: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Get the bucket name for a media type
 */
export function getMediaBucket(type: MediaType): string {
  return BUCKET_MAP[type] || DEFAULT_BUCKET
}

/**
 * Generate a storage path for a file
 */
export function generateStoragePath(
  listingId: string,
  type: MediaType,
  filename: string,
  category?: string
): string {
  // Sanitize listing ID - remove path traversal attempts
  const safeListingId = listingId.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_-]/g, '_')

  // Get file extension
  const parts = filename.split('.')
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin'

  // Generate unique identifier
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)

  // Get folder name for type
  const folder = TYPE_FOLDERS[type] || 'other'

  // Build path with optional category
  if (category) {
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${safeListingId}/${folder}/${safeCategory}/${timestamp}-${randomId}.${extension}`
  }

  return `${safeListingId}/${folder}/${timestamp}-${randomId}.${extension}`
}

/**
 * Get the public URL for a stored file
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Validate a file for upload
 */
export function validateMediaFile(
  file: { name: string; type: string; size: number },
  mediaType: MediaType
): ValidationResult {
  // Check size limit
  const maxSize = SIZE_LIMITS[mediaType] || SIZE_LIMITS.photo
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024)
    const unit = maxMB >= 1024 ? `${maxMB / 1024}GB` : `${maxMB}MB`
    return {
      valid: false,
      error: `File size exceeds maximum of ${unit}`,
    }
  }

  // Check MIME type
  const allowedTypes = ALLOWED_MIME_TYPES[mediaType] || ALLOWED_MIME_TYPES.photo
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed for ${mediaType}`,
    }
  }

  return { valid: true }
}

/**
 * Media Storage Service Class
 *
 * Handles all media storage operations for the ASM platform.
 */
export class MediaStorageService {
  private _supabase: ReturnType<typeof createAdminClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createAdminClient()
    }
    return this._supabase
  }

  /**
   * Upload a file to storage
   * Wrapped with circuit breaker for resilience.
   */
  async upload(options: MediaUploadOptions): Promise<UploadResult> {
    const { listingId, type, file, filename, contentType, category, metadata } = options

    try {
      const bucket = getMediaBucket(type)
      const path = generateStoragePath(listingId, type, filename, category)
      const buffer = file instanceof ArrayBuffer ? Buffer.from(file) : file

      return await withCircuitBreaker('supabase-storage', async () => {
        const { data, error } = await this.supabase.storage
          .from(bucket)
          .upload(path, buffer, {
            contentType,
            upsert: false,
          })

        if (error) {
          throw new Error(error.message)
        }

        const { data: urlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(data.path)

        const media: StoredMedia = {
          id: `${bucket}:${data.path}`,
          url: urlData.publicUrl,
          path: data.path,
          bucket,
          type,
          filename,
          size: buffer.length,
          contentType,
          category,
          metadata,
          createdAt: new Date().toISOString(),
        }

        return {
          success: true,
          media,
        }
      }, { timeout: 30000 })
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        return {
          success: false,
          error: 'Storage service temporarily unavailable. Please try again later.',
        }
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      }
    }
  }

  /**
   * Upload from a URL (fetch and store)
   */
  async uploadFromUrl(options: UploadFromUrlOptions): Promise<UploadResult> {
    const { listingId, type, sourceUrl, filename, category, metadata } = options

    try {
      const response = await fetch(sourceUrl)
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch from URL: ${response.status}`,
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'application/octet-stream'

      return this.upload({
        listingId,
        type,
        file: arrayBuffer,
        filename,
        contentType,
        category,
        metadata,
      })
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload from URL',
      }
    }
  }

  /**
   * Delete a file from storage
   * Wrapped with circuit breaker for resilience.
   */
  async delete(bucket: string, path: string): Promise<DeleteResult> {
    try {
      return await withCircuitBreaker('supabase-storage', async () => {
        const { error } = await this.supabase.storage
          .from(bucket)
          .remove([path])

        if (error) {
          throw new Error(error.message)
        }

        return { success: true }
      }, { timeout: 15000 })
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        return {
          success: false,
          error: 'Storage service temporarily unavailable. Please try again later.',
        }
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Delete failed',
      }
    }
  }

  /**
   * Get a signed URL for private access
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error || !data) {
        return null
      }

      return data.signedUrl
    } catch {
      return null
    }
  }

  /**
   * List all media for a listing
   */
  async listByListing(listingId: string, type: MediaType): Promise<StoredMedia[]> {
    try {
      const bucket = getMediaBucket(type)
      const folder = TYPE_FOLDERS[type] || 'other'
      const prefix = `${listingId}/${folder}`

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(prefix)

      if (error || !data) {
        return []
      }

      return data.map((file) => ({
        id: `${bucket}:${prefix}/${file.name}`,
        url: getPublicUrl(bucket, `${prefix}/${file.name}`),
        path: `${prefix}/${file.name}`,
        bucket,
        type,
        filename: file.name,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        createdAt: file.created_at || new Date().toISOString(),
      }))
    } catch {
      return []
    }
  }

  /**
   * Migrate media from Aryeo URL to native storage
   */
  async migrateFromAryeo(options: MigrateFromAryeoOptions): Promise<MigrateResult> {
    const { listingId, aryeoUrl, type, category, originalMetadata } = options

    try {
      // Extract filename from Aryeo URL
      const urlParts = aryeoUrl.split('/')
      const originalFilename = urlParts[urlParts.length - 1].split('?')[0]
      const filename = `migrated-${originalFilename}`

      // Fetch the file from Aryeo
      const response = await fetch(aryeoUrl)
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch from Aryeo: ${response.status}`,
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // Upload to native storage
      const bucket = getMediaBucket(type)
      const path = generateStoragePath(listingId, type, filename, category)

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, Buffer.from(arrayBuffer), {
          contentType,
          upsert: false,
        })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      // Combine original metadata with migration info
      const metadata = {
        ...originalMetadata,
        migratedFrom: 'aryeo',
      }

      return {
        success: true,
        newUrl: urlData.publicUrl,
        path: data.path,
        metadata,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Migration failed',
      }
    }
  }
}

// Factory function for creating service instances
export function createMediaStorage(): MediaStorageService {
  return new MediaStorageService()
}
