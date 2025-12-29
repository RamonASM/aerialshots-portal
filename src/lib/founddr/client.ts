/**
 * FoundDR API Client
 *
 * Client for communicating with the FoundDR HDR processing backend.
 * Used to trigger processing jobs and check status.
 */

export interface FoundDRJobRequest {
  listing_id: string
  media_asset_ids: string[]
  storage_paths: string[]
  callback_url?: string
  is_rush?: boolean
  options?: Record<string, unknown>
}

export interface FoundDRJobResponse {
  founddr_job_id: string
  status: string
  message: string
  estimated_time_seconds: number
}

export interface FoundDRJobStatus {
  job_id: string
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed'
  output_key?: string
  error_message?: string
  metrics?: {
    alignment_time_ms?: number
    segmentation_time_ms?: number
    fusion_time_ms?: number
    export_time_ms?: number
    total_time_ms?: number
    [key: string]: unknown
  }
}

export class FoundDRClient {
  private baseUrl: string
  private secret: string

  constructor(baseUrl?: string, secret?: string) {
    this.baseUrl = baseUrl || process.env.FOUNDDR_API_URL || 'http://localhost:8000'
    this.secret = secret || process.env.FOUNDDR_API_SECRET || ''
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.secret) {
      headers['X-Portal-Secret'] = this.secret
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new FoundDRError(
        errorData.detail || `FoundDR API error: ${response.status}`,
        response.status,
        errorData
      )
    }

    return response.json()
  }

  /**
   * Create a new HDR processing job from portal uploads.
   *
   * @param request Job creation request
   * @returns Job creation response with founddr_job_id
   */
  async createJob(request: FoundDRJobRequest): Promise<FoundDRJobResponse> {
    return this.fetch<FoundDRJobResponse>('/jobs/from-portal', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get the status of a processing job.
   *
   * @param jobId FoundDR job ID
   * @returns Current job status
   */
  async getJobStatus(jobId: string): Promise<FoundDRJobStatus> {
    return this.fetch<FoundDRJobStatus>(`/jobs/${jobId}/status`)
  }

  /**
   * Check if the FoundDR API is healthy.
   *
   * @returns True if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetch<{ status: string }>('/health')
      return response.status === 'healthy'
    } catch {
      return false
    }
  }
}

export class FoundDRError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FoundDRError'
  }
}

// Singleton instance for server-side use
let clientInstance: FoundDRClient | null = null

export function getFoundDRClient(): FoundDRClient {
  if (!clientInstance) {
    clientInstance = new FoundDRClient()
  }
  return clientInstance
}

/**
 * Helper function to group uploaded photos into bracket sets.
 *
 * For HDR processing, we need multiple exposure brackets of the same scene.
 * This function groups photos by their naming pattern or timestamp proximity.
 *
 * @param storagePaths Array of storage paths
 * @returns Array of bracket groups (each group contains 2-7 images)
 */
export function groupIntoBrackets(
  storagePaths: string[]
): string[][] {
  // Sort by path (assumes sequential naming like bracket_0.arw, bracket_1.arw)
  const sorted = [...storagePaths].sort()

  // For now, return all as one bracket set
  // In production, we'd parse EXIF or use naming conventions
  // to intelligently group images into bracket sets
  if (sorted.length >= 2 && sorted.length <= 7) {
    return [sorted]
  }

  // If more than 7 images, split into groups
  const brackets: string[][] = []
  for (let i = 0; i < sorted.length; i += 3) {
    const group = sorted.slice(i, Math.min(i + 3, sorted.length))
    if (group.length >= 2) {
      brackets.push(group)
    }
  }

  return brackets
}
