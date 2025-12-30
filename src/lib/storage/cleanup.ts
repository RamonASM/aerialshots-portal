/**
 * Storage Cleanup Service
 *
 * Handles auto-expiration of temporary files in pipeline buckets.
 * Designed to run as a daily cron job.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { PIPELINE_BUCKETS, RETENTION_HOURS, PipelineStage } from './pipeline'

export interface CleanupResult {
  bucket: string
  stage: PipelineStage
  deletedCount: number
  errors: string[]
}

export interface CleanupSummary {
  startedAt: string
  completedAt: string
  results: CleanupResult[]
  totalDeleted: number
  totalErrors: number
}

/**
 * Parse timestamp from file path
 * Format: {listingId}/{stage}/{timestamp}-{randomId}.{ext}
 */
function extractTimestampFromPath(filePath: string): number | null {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1]
  const match = filename.match(/^(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Check if a file should be expired based on retention hours
 */
function isExpired(filePath: string, retentionHours: number): boolean {
  const timestamp = extractTimestampFromPath(filePath)
  if (!timestamp) return false

  const now = Date.now()
  const ageHours = (now - timestamp) / (1000 * 60 * 60)
  return ageHours > retentionHours
}

/**
 * Storage Cleanup Service
 */
export class StorageCleanupService {
  private _supabase: ReturnType<typeof createAdminClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createAdminClient()
    }
    return this._supabase
  }

  /**
   * Clean up expired files from a specific bucket
   */
  async cleanupBucket(stage: PipelineStage): Promise<CleanupResult> {
    const bucket = PIPELINE_BUCKETS[stage]
    const retentionHours = RETENTION_HOURS[stage]

    // Skip buckets with no retention (permanent)
    if (retentionHours === null) {
      return {
        bucket,
        stage,
        deletedCount: 0,
        errors: [],
      }
    }

    const errors: string[] = []
    let deletedCount = 0

    try {
      // List all files in the bucket
      const { data: listings, error: listError } = await this.supabase.storage
        .from(bucket)
        .list('', { limit: 1000 })

      if (listError) {
        return {
          bucket,
          stage,
          deletedCount: 0,
          errors: [listError.message],
        }
      }

      if (!listings) {
        return { bucket, stage, deletedCount: 0, errors: [] }
      }

      // Process each listing folder
      for (const folder of listings) {
        if (!folder.name) continue

        // List files within the listing folder
        const { data: stageFiles, error: stageError } = await this.supabase.storage
          .from(bucket)
          .list(`${folder.name}/${stage}`, { limit: 1000 })

        if (stageError) {
          errors.push(`Error listing ${folder.name}/${stage}: ${stageError.message}`)
          continue
        }

        if (!stageFiles) continue

        // Find expired files
        const expiredFiles: string[] = []
        for (const file of stageFiles) {
          const fullPath = `${folder.name}/${stage}/${file.name}`
          if (isExpired(fullPath, retentionHours)) {
            expiredFiles.push(fullPath)
          }
        }

        // Delete expired files in batches
        if (expiredFiles.length > 0) {
          const { error: deleteError } = await this.supabase.storage
            .from(bucket)
            .remove(expiredFiles)

          if (deleteError) {
            errors.push(`Error deleting from ${folder.name}: ${deleteError.message}`)
          } else {
            deletedCount += expiredFiles.length
          }
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown error')
    }

    return {
      bucket,
      stage,
      deletedCount,
      errors,
    }
  }

  /**
   * Run cleanup on all temporary buckets
   */
  async runFullCleanup(): Promise<CleanupSummary> {
    const startedAt = new Date().toISOString()
    const results: CleanupResult[] = []

    // Only clean buckets with retention policies
    const stagesToClean: PipelineStage[] = ['raw', 'processing']

    for (const stage of stagesToClean) {
      const result = await this.cleanupBucket(stage)
      results.push(result)
    }

    const completedAt = new Date().toISOString()
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    return {
      startedAt,
      completedAt,
      results,
      totalDeleted,
      totalErrors,
    }
  }

  /**
   * Get storage statistics for monitoring
   */
  async getStorageStats(): Promise<{
    raw: { count: number; sizeBytes: number }
    processing: { count: number; sizeBytes: number }
    qc: { count: number; sizeBytes: number }
    final: { count: number; sizeBytes: number }
  }> {
    const stats = {
      raw: { count: 0, sizeBytes: 0 },
      processing: { count: 0, sizeBytes: 0 },
      qc: { count: 0, sizeBytes: 0 },
      final: { count: 0, sizeBytes: 0 },
    }

    const stages: PipelineStage[] = ['raw', 'processing', 'qc', 'final']

    for (const stage of stages) {
      const bucket = PIPELINE_BUCKETS[stage]
      try {
        const { data: folders } = await this.supabase.storage
          .from(bucket)
          .list('', { limit: 1000 })

        if (folders) {
          for (const folder of folders) {
            const { data: files } = await this.supabase.storage
              .from(bucket)
              .list(`${folder.name}/${stage}`, { limit: 1000 })

            if (files) {
              stats[stage].count += files.length
              stats[stage].sizeBytes += files.reduce(
                (sum, f) => sum + (f.metadata?.size || 0),
                0
              )
            }
          }
        }
      } catch {
        // Ignore errors for stats
      }
    }

    return stats
  }
}

// Factory function
export function createStorageCleanup(): StorageCleanupService {
  return new StorageCleanupService()
}

// Export utility functions for testing
export { extractTimestampFromPath, isExpired }
