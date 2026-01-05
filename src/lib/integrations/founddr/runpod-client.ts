/**
 * RunPod Serverless Client for FoundDR
 *
 * Handles HDR processing via RunPod Serverless GPU endpoints.
 * This is the production client that replaces direct FoundDR API calls.
 */

import { apiLogger, formatError } from '@/lib/logger'
import { fetchWithTimeout, FETCH_TIMEOUTS } from '@/lib/utils/fetch-with-timeout'

interface RunPodConfig {
  endpointId: string
  apiKey: string
  timeout?: number
}

interface ProcessHDRRequest {
  storagePaths: string[]
  bucket?: string
  options?: {
    enableWindowPull?: boolean
    jpegQuality?: number
  }
}

interface ProcessHDRResponse {
  id: string
  status: 'COMPLETED' | 'FAILED' | 'IN_QUEUE' | 'IN_PROGRESS'
  output?: {
    image_base64: string
    metrics: {
      segmentation_time_ms: number
      fusion_time_ms: number
      tone_mapping_time_ms: number
      total_time_ms: number
      rgb_white_diff: number
      fusion_method: string
    }
    width: number
    height: number
  }
  error?: string
}

export class RunPodFoundDRClient {
  private config: Required<RunPodConfig>

  constructor(config?: Partial<RunPodConfig>) {
    this.config = {
      endpointId: config?.endpointId || process.env.RUNPOD_ENDPOINT_ID || '',
      apiKey: config?.apiKey || process.env.RUNPOD_API_KEY || '',
      timeout: config?.timeout || 180000, // 3 minutes for HDR processing
    }
  }

  /**
   * Check if RunPod is configured
   */
  isConfigured(): boolean {
    return !!(this.config.endpointId && this.config.apiKey)
  }

  /**
   * Process HDR brackets synchronously
   * Use for single images where you need immediate results
   */
  async processHDRSync(request: ProcessHDRRequest): Promise<ProcessHDRResponse> {
    const url = `https://api.runpod.ai/v2/${this.config.endpointId}/runsync`

    apiLogger.info(
      {
        bracketCount: request.storagePaths.length,
        bucket: request.bucket,
      },
      'Starting RunPod HDR processing (sync)'
    )

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            storage_paths: request.storagePaths,
            bucket: request.bucket || 'staged-photos',
            options: {
              enable_window_pull: request.options?.enableWindowPull ?? true,
              jpeg_quality: request.options?.jpegQuality ?? 95,
            },
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const result = await response.json()

      if (result.status === 'COMPLETED') {
        apiLogger.info(
          {
            processingTime: result.output?.metrics?.total_time_ms,
            fusionMethod: result.output?.metrics?.fusion_method,
          },
          'RunPod HDR processing completed'
        )
      } else if (result.status === 'FAILED') {
        apiLogger.error(
          { error: result.error },
          'RunPod HDR processing failed'
        )
      }

      return result
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`RunPod request timeout after ${this.config.timeout}ms`)
      }

      apiLogger.error(
        { error: formatError(error) },
        'RunPod request error'
      )
      throw error
    }
  }

  /**
   * Process HDR brackets asynchronously
   * Use for batch processing or when you want webhook callbacks
   */
  async processHDRAsync(request: ProcessHDRRequest): Promise<{ jobId: string }> {
    const url = `https://api.runpod.ai/v2/${this.config.endpointId}/run`

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          storage_paths: request.storagePaths,
          bucket: request.bucket || 'staged-photos',
          options: {
            enable_window_pull: request.options?.enableWindowPull ?? true,
            jpeg_quality: request.options?.jpegQuality ?? 95,
          },
        },
      }),
      timeout: FETCH_TIMEOUTS.DEFAULT,
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    apiLogger.info(
      { jobId: result.id, status: result.status },
      'RunPod HDR job queued'
    )

    return { jobId: result.id }
  }

  /**
   * Check status of an async job
   */
  async getJobStatus(jobId: string): Promise<ProcessHDRResponse> {
    const url = `https://api.runpod.ai/v2/${this.config.endpointId}/status/${jobId}`

    const response = await fetchWithTimeout(url, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      timeout: FETCH_TIMEOUTS.QUICK,
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Process HDR and wait for result
   * Combines async submission with polling
   */
  async processHDRAndWait(
    request: ProcessHDRRequest,
    options: { pollInterval?: number; maxWait?: number } = {}
  ): Promise<ProcessHDRResponse> {
    const pollInterval = options.pollInterval || 2000
    const maxWait = options.maxWait || 300000 // 5 minutes

    const { jobId } = await this.processHDRAsync(request)
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      const status = await this.getJobStatus(jobId)

      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        return status
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Job ${jobId} did not complete within ${maxWait}ms`)
  }

  /**
   * Process with URLs instead of storage paths
   */
  async processHDRFromURLs(urls: string[], options?: ProcessHDRRequest['options']): Promise<ProcessHDRResponse> {
    const url = `https://api.runpod.ai/v2/${this.config.endpointId}/runsync`

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          urls: urls,
          options: {
            enable_window_pull: options?.enableWindowPull ?? true,
            jpeg_quality: options?.jpegQuality ?? 95,
          },
        },
      }),
      timeout: this.config.timeout,
    })

    if (!response.ok) {
      throw new Error(`RunPod API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }
}

// Singleton instance
let runpodClient: RunPodFoundDRClient | null = null

/**
 * Get the singleton RunPod FoundDR client instance
 */
export function getRunPodClient(): RunPodFoundDRClient {
  if (!runpodClient) {
    runpodClient = new RunPodFoundDRClient()
  }
  return runpodClient
}
