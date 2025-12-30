/**
 * ASM Media Storage Module
 *
 * Native media storage service replacing Aryeo CDN.
 */

// Core storage service
export {
  MediaStorageService,
  createMediaStorage,
  getMediaBucket,
  generateStoragePath,
  getPublicUrl,
  validateMediaFile,
  type MediaType,
  type StoredMedia,
  type MediaUploadOptions,
  type UploadFromUrlOptions,
  type MigrateFromAryeoOptions,
  type UploadResult,
  type DeleteResult,
  type MigrateResult,
  type ValidationResult,
} from './media'

// URL resolution utilities
export {
  resolveMediaUrl,
  getMediaUrlSource,
  isNativeMedia,
  resolveMediaUrls,
  filterBySource,
  getMediaStats,
  getMigrationStats, // deprecated alias
  isNativeUrl,
  type MediaUrlSource,
} from './resolve-url'

// Media pipeline for processing workflow
export {
  MediaPipelineService,
  createMediaPipeline,
  generatePipelinePath,
  PIPELINE_BUCKETS,
  RETENTION_HOURS,
  type PipelineStage,
  type IngestOptions,
  type PromoteOptions,
  type RejectOptions,
  type PresignedUploadOptions,
  type ListStageOptions,
  type PipelineResult,
  type PresignedResult,
  type PipelineFile,
  type PipelineStatus,
} from './pipeline'

// Storage cleanup service
export {
  StorageCleanupService,
  createStorageCleanup,
  extractTimestampFromPath,
  isExpired,
  type CleanupResult,
  type CleanupSummary,
} from './cleanup'
