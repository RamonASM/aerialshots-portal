/**
 * FoundDR Client
 *
 * API client for the FoundDR HDR processing engine.
 * Handles communication with the FoundDR backend for:
 * - HDR photo processing
 * - AI inpainting (object removal)
 * - Queue monitoring
 */

import { apiLogger, formatError } from '@/lib/logger'
import type {
  FoundDRConfig,
  CreateJobRequest,
  CreateJobResponse,
  JobStatusResponse,
  CreateInpaintRequest,
  CreateInpaintResponse,
  InpaintStatusResponse,
  QueueStats,
  HealthCheckResponse,
  ProcessJobOptions,
} from './types'

// Default configuration
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_POLL_INTERVAL = 2000 // 2 seconds
const DEFAULT_MAX_WAIT = 300000 // 5 minutes

export class FoundDRClient {
  private config: Required<FoundDRConfig>

  constructor(config?: Partial<FoundDRConfig>) {
    this.config = {
      apiUrl: config?.apiUrl || process.env.FOUNDDR_API_URL || 'http://localhost:8000',
      apiSecret: config?.apiSecret || process.env.FOUNDDR_API_SECRET || '',
      webhookUrl: config?.webhookUrl || process.env.FOUNDDR_WEBHOOK_URL || '',
      timeout: config?.timeout || DEFAULT_TIMEOUT,
    }
  }

  /**
   * Check if FoundDR is configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiUrl && this.config.apiSecret)
  }

  /**
   * Make authenticated API request to FoundDR
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Portal-Secret': this.config.apiSecret,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        apiLogger.error(
          { endpoint, status: response.status, error: errorText },
          'FoundDR API error'
        )
        throw new Error(`FoundDR API error: ${response.status} - ${errorText}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`FoundDR request timeout after ${this.config.timeout}ms`)
      }

      throw error
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('GET', '/health')
  }

  /**
   * Create an HDR processing job
   */
  async createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
    const payload = {
      listing_id: request.listing_id,
      media_asset_ids: request.media_asset_ids,
      storage_paths: request.storage_paths,
      callback_url: request.callback_url || this.config.webhookUrl,
      is_rush: request.is_rush || false,
      options: request.options || {},
    }

    apiLogger.info(
      {
        listingId: request.listing_id,
        bracketCount: request.storage_paths.length,
        isRush: request.is_rush,
      },
      'Creating FoundDR job'
    )

    const response = await this.request<CreateJobResponse>('POST', '/jobs/from-portal', payload)

    apiLogger.info(
      {
        jobId: response.founddr_job_id,
        listingId: request.listing_id,
        estimatedTime: response.estimated_time_seconds,
      },
      'FoundDR job created'
    )

    return response
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.request<JobStatusResponse>('GET', `/jobs/${jobId}/status`)
  }

  /**
   * Poll job status until completion or timeout
   */
  async waitForJob(
    jobId: string,
    options: {
      pollInterval?: number
      maxWait?: number
      onProgress?: (status: JobStatusResponse) => void
    } = {}
  ): Promise<JobStatusResponse> {
    const pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL
    const maxWait = options.maxWait || DEFAULT_MAX_WAIT
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      const status = await this.getJobStatus(jobId)

      if (options.onProgress) {
        options.onProgress(status)
      }

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        return status
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Job ${jobId} did not complete within ${maxWait}ms`)
  }

  /**
   * Create and optionally wait for an HDR processing job
   */
  async processListing(
    listingId: string,
    mediaAssetIds: string[],
    storagePaths: string[],
    options: ProcessJobOptions = {}
  ): Promise<{ jobId: string; status: JobStatusResponse | null }> {
    const createResponse = await this.createJob({
      listing_id: listingId,
      media_asset_ids: mediaAssetIds,
      storage_paths: storagePaths,
      is_rush: options.isRush,
      callback_url: options.callbackUrl,
    })

    if (!options.waitForCompletion) {
      return {
        jobId: createResponse.founddr_job_id,
        status: null,
      }
    }

    const finalStatus = await this.waitForJob(createResponse.founddr_job_id, {
      pollInterval: options.pollIntervalMs,
      maxWait: options.maxWaitMs,
    })

    return {
      jobId: createResponse.founddr_job_id,
      status: finalStatus,
    }
  }

  /**
   * Create an inpainting (object removal) job
   */
  async createInpaintJob(request: CreateInpaintRequest): Promise<CreateInpaintResponse> {
    const payload = {
      job_id: request.job_id,
      image_url: request.image_url,
      mask_storage_path: request.mask_storage_path,
      media_asset_id: request.media_asset_id,
      listing_id: request.listing_id,
      callback_url: request.callback_url || this.config.webhookUrl,
      prompt: request.prompt,
    }

    apiLogger.info(
      {
        jobId: request.job_id,
        listingId: request.listing_id,
        mediaAssetId: request.media_asset_id,
      },
      'Creating FoundDR inpaint job'
    )

    const response = await this.request<CreateInpaintResponse>('POST', '/inpaint', payload)

    apiLogger.info(
      {
        jobId: response.job_id,
        estimatedTime: response.estimated_time_seconds,
      },
      'FoundDR inpaint job created'
    )

    return response
  }

  /**
   * Get inpainting job status
   */
  async getInpaintStatus(jobId: string): Promise<InpaintStatusResponse> {
    return this.request<InpaintStatusResponse>('GET', `/inpaint/${jobId}`)
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    return this.request<QueueStats>('GET', '/queues/stats')
  }

  /**
   * Cancel a job (if supported)
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<void>('DELETE', `/jobs/${jobId}`)
      return { success: true, message: 'Job cancelled' }
    } catch (error) {
      apiLogger.warn({ jobId, error: formatError(error) }, 'Failed to cancel FoundDR job')
      return { success: false, message: 'Failed to cancel job' }
    }
  }
}

// Singleton instance
let founddrClient: FoundDRClient | null = null

/**
 * Get the singleton FoundDR client instance
 */
export function getFoundDRClient(): FoundDRClient {
  if (!founddrClient) {
    founddrClient = new FoundDRClient()
  }
  return founddrClient
}

/**
 * Create a new FoundDR client with custom configuration
 */
export function createFoundDRClient(config: Partial<FoundDRConfig>): FoundDRClient {
  return new FoundDRClient(config)
}
