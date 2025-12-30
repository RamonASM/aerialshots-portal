/**
 * Media Pipeline Service
 *
 * Orchestrates media flow through processing stages:
 * RAW Upload → AI HDR Edit → QC Review → Final Delivery
 *
 * Each stage has its own bucket with appropriate retention:
 * - asm-raw-uploads: Temporary (7 day auto-expire)
 * - asm-processing: Temporary (48h auto-expire)
 * - asm-qc-staging: Until approved/rejected
 * - asm-media: Permanent delivery
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Pipeline stages
export type PipelineStage = 'raw' | 'processing' | 'qc' | 'final'

// Bucket mapping for each stage
export const PIPELINE_BUCKETS: Record<PipelineStage, string> = {
  raw: 'asm-raw-uploads',
  processing: 'asm-processing',
  qc: 'asm-qc-staging',
  final: 'asm-media',
}

// Retention periods in hours
export const RETENTION_HOURS: Record<PipelineStage, number | null> = {
  raw: 168, // 7 days
  processing: 48, // 48 hours
  qc: null, // Until approved/rejected
  final: null, // Permanent
}

export interface PipelinePathOptions {
  listingId: string
  stage: PipelineStage
  filename: string
  category?: string
}

/**
 * Generate a storage path for a file in the pipeline
 */
export function generatePipelinePath(options: PipelinePathOptions): string {
  const { listingId, stage, filename, category } = options

  // Sanitize listing ID - only allow alphanumeric, underscore, hyphen
  // Remove path traversal and keep only valid UUID-like characters
  const safeListingId = listingId
    .replace(/\.\./g, '') // Remove path traversal
    .split('/').pop() || 'unknown' // Take last segment only
  const cleanId = safeListingId.replace(/[^a-zA-Z0-9_-]/g, '')

  // Get file extension
  const parts = filename.split('.')
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin'

  // Generate unique identifier
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)

  // Build path with optional category
  if (category) {
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${cleanId}/${stage}/${safeCategory}/${timestamp}-${randomId}.${extension}`
  }

  return `${cleanId}/${stage}/${timestamp}-${randomId}.${extension}`
}

// Ingest options
export interface IngestOptions {
  listingId: string
  file: Buffer | ArrayBuffer
  filename: string
  contentType: string
  category?: string
  metadata?: Record<string, unknown>
}

// Promote options
export interface PromoteOptions {
  listingId: string
  rawPath?: string
  processingPath?: string
  qcPath?: string
}

// Reject options
export interface RejectOptions {
  listingId: string
  qcPath: string
  reason: string
}

// Presigned URL options
export interface PresignedUploadOptions {
  listingId: string
  filename: string
  contentType: string
  category?: string
  expiresIn?: number // seconds, default 3600
}

// List options
export interface ListStageOptions {
  listingId: string
  stage: PipelineStage
  category?: string
}

// Result types
export interface PipelineResult {
  success: boolean
  path?: string
  newPath?: string
  publicUrl?: string
  error?: string
}

export interface PresignedResult {
  success: boolean
  uploadUrl?: string
  path?: string
  token?: string
  error?: string
}

export interface PipelineFile {
  name: string
  path: string
  size: number
  createdAt: string
  contentType: string
}

export interface PipelineStatus {
  raw: number
  processing: number
  qc: number
  final: number
}

/**
 * Media Pipeline Service
 *
 * Handles media processing workflow from upload to delivery.
 */
export class MediaPipelineService {
  private _supabase: ReturnType<typeof createAdminClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createAdminClient()
    }
    return this._supabase
  }

  /**
   * Ingest a raw file into the pipeline
   */
  async ingestRaw(options: IngestOptions): Promise<PipelineResult> {
    const { listingId, file, filename, contentType, category, metadata } = options

    try {
      const bucket = PIPELINE_BUCKETS.raw
      const path = generatePipelinePath({
        listingId,
        stage: 'raw',
        filename,
        category,
      })

      const buffer = file instanceof ArrayBuffer ? Buffer.from(file) : file

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType,
          upsert: false,
        })

      if (error) {
        return { success: false, error: error.message }
      }

      // Log the ingest for tracking
      await this.logPipelineEvent({
        listingId,
        stage: 'raw',
        action: 'ingest',
        path: data.path,
        metadata,
      })

      return {
        success: true,
        path: data.path,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Ingest failed',
      }
    }
  }

  /**
   * Promote file from raw to processing stage
   */
  async promoteToProcessing(options: PromoteOptions): Promise<PipelineResult> {
    const { listingId, rawPath } = options

    if (!rawPath) {
      return { success: false, error: 'rawPath is required' }
    }

    try {
      const filename = rawPath.split('/').pop() || 'file'
      const newPath = generatePipelinePath({
        listingId,
        stage: 'processing',
        filename,
      })

      // Copy to processing bucket
      const { error: copyError } = await this.supabase.storage
        .from(PIPELINE_BUCKETS.processing)
        .copy(`${PIPELINE_BUCKETS.raw}/${rawPath}`, newPath)

      if (copyError) {
        return { success: false, error: copyError.message }
      }

      // Optionally delete from raw (or let auto-expire handle it)
      await this.logPipelineEvent({
        listingId,
        stage: 'processing',
        action: 'promote',
        path: newPath,
        previousPath: rawPath,
      })

      return {
        success: true,
        newPath,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Promotion failed',
      }
    }
  }

  /**
   * Promote file from processing to QC stage
   */
  async promoteToQC(options: PromoteOptions): Promise<PipelineResult> {
    const { listingId, processingPath } = options

    if (!processingPath) {
      return { success: false, error: 'processingPath is required' }
    }

    try {
      const filename = processingPath.split('/').pop() || 'file'
      const newPath = generatePipelinePath({
        listingId,
        stage: 'qc',
        filename,
      })

      // Copy to QC bucket
      const { error: copyError } = await this.supabase.storage
        .from(PIPELINE_BUCKETS.qc)
        .copy(`${PIPELINE_BUCKETS.processing}/${processingPath}`, newPath)

      if (copyError) {
        return { success: false, error: copyError.message }
      }

      await this.logPipelineEvent({
        listingId,
        stage: 'qc',
        action: 'promote',
        path: newPath,
        previousPath: processingPath,
      })

      return {
        success: true,
        newPath,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Promotion failed',
      }
    }
  }

  /**
   * Promote file from QC to final delivery stage
   */
  async promoteToFinal(options: PromoteOptions): Promise<PipelineResult> {
    const { listingId, qcPath } = options

    if (!qcPath) {
      return { success: false, error: 'qcPath is required' }
    }

    try {
      const filename = qcPath.split('/').pop() || 'file'
      const newPath = generatePipelinePath({
        listingId,
        stage: 'final',
        filename,
      })

      // Copy to final bucket
      const { error: copyError } = await this.supabase.storage
        .from(PIPELINE_BUCKETS.final)
        .copy(`${PIPELINE_BUCKETS.qc}/${qcPath}`, newPath)

      if (copyError) {
        return { success: false, error: copyError.message }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(PIPELINE_BUCKETS.final)
        .getPublicUrl(newPath)

      // Delete from QC after successful promotion
      await this.supabase.storage
        .from(PIPELINE_BUCKETS.qc)
        .remove([qcPath])

      await this.logPipelineEvent({
        listingId,
        stage: 'final',
        action: 'promote',
        path: newPath,
        previousPath: qcPath,
      })

      return {
        success: true,
        newPath,
        publicUrl: urlData.publicUrl,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Promotion failed',
      }
    }
  }

  /**
   * Reject file from QC (delete it)
   */
  async rejectFromQC(options: RejectOptions): Promise<PipelineResult> {
    const { listingId, qcPath, reason } = options

    try {
      const { error } = await this.supabase.storage
        .from(PIPELINE_BUCKETS.qc)
        .remove([qcPath])

      if (error) {
        return { success: false, error: error.message }
      }

      await this.logPipelineEvent({
        listingId,
        stage: 'qc',
        action: 'reject',
        path: qcPath,
        metadata: { reason },
      })

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Rejection failed',
      }
    }
  }

  /**
   * Get a presigned URL for direct upload to raw bucket
   */
  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedResult> {
    const { listingId, filename, contentType, category, expiresIn = 3600 } = options

    try {
      const path = generatePipelinePath({
        listingId,
        stage: 'raw',
        filename,
        category,
      })

      const { data, error } = await this.supabase.storage
        .from(PIPELINE_BUCKETS.raw)
        .createSignedUploadUrl(path)

      if (error || !data) {
        return { success: false, error: error?.message || 'Failed to create upload URL' }
      }

      return {
        success: true,
        uploadUrl: data.signedUrl,
        path: data.path,
        token: data.token,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get presigned URL',
      }
    }
  }

  /**
   * List files in a pipeline stage
   */
  async getStageContents(options: ListStageOptions): Promise<PipelineFile[]> {
    const { listingId, stage, category } = options

    try {
      const bucket = PIPELINE_BUCKETS[stage]
      let prefix = `${listingId}/${stage}`
      if (category) {
        prefix = `${prefix}/${category}`
      }

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(prefix)

      if (error || !data) {
        return []
      }

      return data.map((file) => ({
        name: file.name,
        path: `${prefix}/${file.name}`,
        size: file.metadata?.size || 0,
        createdAt: file.created_at || new Date().toISOString(),
        contentType: file.metadata?.mimetype || 'application/octet-stream',
      }))
    } catch {
      return []
    }
  }

  /**
   * Get pipeline status (file counts per stage)
   */
  async getPipelineStatus(listingId: string): Promise<PipelineStatus> {
    const stages: PipelineStage[] = ['raw', 'processing', 'qc', 'final']
    const status: PipelineStatus = { raw: 0, processing: 0, qc: 0, final: 0 }

    await Promise.all(
      stages.map(async (stage) => {
        const files = await this.getStageContents({ listingId, stage })
        status[stage] = files.length
      })
    )

    return status
  }

  /**
   * Log pipeline event for tracking
   */
  private async logPipelineEvent(event: {
    listingId: string
    stage: PipelineStage
    action: string
    path: string
    previousPath?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Pipeline]', event)
      }

      // Could also log to database table for tracking
      // await this.supabase.from('pipeline_events').insert({
      //   listing_id: event.listingId,
      //   stage: event.stage,
      //   action: event.action,
      //   path: event.path,
      //   previous_path: event.previousPath,
      //   metadata: event.metadata,
      //   created_at: new Date().toISOString(),
      // })
    } catch {
      // Ignore logging errors
    }
  }
}

// Factory function
export function createMediaPipeline(): MediaPipelineService {
  return new MediaPipelineService()
}
