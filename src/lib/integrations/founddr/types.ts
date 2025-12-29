/**
 * FoundDR Integration Types
 *
 * Type definitions for the FoundDR HDR processing API.
 */

/**
 * Job status enum matching FoundDR backend
 */
export type FoundDRJobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Configuration for FoundDR client
 */
export interface FoundDRConfig {
  apiUrl: string
  apiSecret: string
  webhookUrl?: string
  timeout?: number
}

/**
 * Request to create an HDR processing job from Portal
 */
export interface CreateJobRequest {
  listing_id: string
  media_asset_ids: string[]
  storage_paths: string[]
  callback_url?: string
  is_rush?: boolean
  options?: Record<string, unknown>
}

/**
 * Response after creating a job
 */
export interface CreateJobResponse {
  founddr_job_id: string
  status: FoundDRJobStatus
  message: string
  estimated_time_seconds: number
}

/**
 * Job status response
 */
export interface JobStatusResponse {
  job_id: string
  status: FoundDRJobStatus
  output_key?: string | null
  error_message?: string | null
  metrics?: JobMetrics | null
}

/**
 * Full job details
 */
export interface FoundDRJob {
  id: string
  status: FoundDRJobStatus
  input_keys: string[]
  output_key?: string | null
  sqft?: number | null
  metrics?: JobMetrics | null
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  error_message?: string | null
}

/**
 * Processing metrics from FoundDR
 */
export interface JobMetrics {
  source?: string
  listing_id?: string
  media_asset_ids?: string[]
  is_rush?: boolean
  callback_url?: string
  // Timing metrics (populated after completion)
  download_ms?: number
  alignment_ms?: number
  segmentation_ms?: number
  fusion_ms?: number
  export_ms?: number
  upload_ms?: number
  total_ms?: number
  // Model info
  model_version?: string
  gpu_used?: string
}

/**
 * Request to create an inpainting (object removal) job
 */
export interface CreateInpaintRequest {
  job_id: string
  image_url: string
  mask_storage_path: string
  media_asset_id: string
  listing_id: string
  callback_url?: string
  prompt?: string
}

/**
 * Response after creating an inpainting job
 */
export interface CreateInpaintResponse {
  job_id: string
  status: string
  message: string
  estimated_time_seconds: number
}

/**
 * Inpainting job status
 */
export interface InpaintStatusResponse {
  job_id: string
  status: string
  output_key?: string | null
  error_message?: string | null
}

/**
 * Queue statistics
 */
export interface QueueStats {
  queues: Record<string, QueueInfo>
  total_pending: number
  total_failed: number
}

export interface QueueInfo {
  queued: number
  active: number
  completed: number
  failed: number
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  environment: string
  checks: {
    redis?: string
    supabase?: string
  }
}

/**
 * Webhook payload sent by FoundDR on job completion
 */
export interface WebhookPayload {
  job_id: string
  status: FoundDRJobStatus
  output_key?: string
  error_message?: string
  metrics?: JobMetrics
  listing_id?: string
  media_asset_ids?: string[]
}

/**
 * Processing job for local tracking (matches database schema)
 */
export interface ProcessingJob {
  id: string
  founddr_job_id?: string | null
  listing_id: string
  status: FoundDRJobStatus
  input_keys: string[]
  output_key?: string | null
  bracket_count?: number | null
  queued_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  processing_time_ms?: number | null
  metrics?: JobMetrics | null
  error_message?: string | null
  webhook_received_at?: string | null
  created_at: string
  updated_at: string
}

/**
 * Options for creating a processing job
 */
export interface ProcessJobOptions {
  isRush?: boolean
  callbackUrl?: string
  waitForCompletion?: boolean
  pollIntervalMs?: number
  maxWaitMs?: number
}
