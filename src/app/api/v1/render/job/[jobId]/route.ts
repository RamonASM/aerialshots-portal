/**
 * Render Job Status API
 * GET /api/v1/render/job/[jobId]
 *
 * Retrieves the status and results of a render job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type assertion helper for render tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRenderClient = (client: unknown) => client as any

// =====================
// SECURITY CONFIG
// =====================

/**
 * Get API secret at runtime (allows env to be set after module load for testing)
 */
function getApiSecret(): string | undefined {
  return process.env.RENDER_API_SECRET || process.env.AGENT_SHARED_SECRET
}

/**
 * Validate API authentication via X-ASM-Secret header
 */
function validateAuth(request: NextRequest): { valid: boolean; error?: string } {
  const apiSecret = getApiSecret()

  if (process.env.NODE_ENV === 'development' && !apiSecret) {
    return { valid: true }
  }

  const secret = request.headers.get('X-ASM-Secret') || request.headers.get('x-asm-secret')

  if (!secret) {
    return { valid: false, error: 'Missing authentication header' }
  }

  if (!apiSecret) {
    console.error('[Job API] RENDER_API_SECRET or AGENT_SHARED_SECRET not configured')
    return { valid: false, error: 'Server configuration error' }
  }

  // Constant-time comparison
  if (secret.length !== apiSecret.length) {
    return { valid: false, error: 'Invalid authentication' }
  }

  let valid = true
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] !== apiSecret[i]) {
      valid = false
    }
  }

  if (!valid) {
    return { valid: false, error: 'Invalid authentication' }
  }

  return { valid: true }
}

// =====================
// TYPES
// =====================

interface RenderJob {
  id: string
  job_type: 'single_image' | 'carousel'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  template_id: string | null
  input_data: Record<string, unknown> | null
  output_urls: string[] | null
  render_engine: string | null
  render_time_ms: number | null
  error_message: string | null
  webhook_url: string | null
  credits_cost: number | null
  created_at: string
  completed_at: string | null
}

interface RenderJobSlide {
  id: string
  job_id: string
  position: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  slide_data: Record<string, unknown> | null
  output_url: string | null
  render_time_ms: number | null
  error_message: string | null
}

// =====================
// ROUTE HANDLER
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check authentication
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = await params

    // Validate job ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the job
    const { data: job, error } = await asRenderClient(supabase)
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      throw error
    }

    const typedJob = job as RenderJob

    // For carousel jobs, fetch individual slide statuses
    let slides: Array<{
      position: number
      status: string
      outputUrl: string | null
      renderTimeMs: number | null
      error: string | null
    }> | null = null

    if (typedJob.job_type === 'carousel') {
      const { data: slideData } = await asRenderClient(supabase)
        .from('render_job_slides')
        .select('*')
        .eq('job_id', jobId)
        .order('position', { ascending: true })

      if (slideData && slideData.length > 0) {
        slides = (slideData as RenderJobSlide[]).map(s => ({
          position: s.position,
          status: s.status,
          outputUrl: s.output_url,
          renderTimeMs: s.render_time_ms,
          error: s.error_message,
        }))
      }
    }

    // Build response
    const response: Record<string, unknown> = {
      id: typedJob.id,
      type: typedJob.job_type,
      status: typedJob.status,
      createdAt: typedJob.created_at,
      completedAt: typedJob.completed_at,
    }

    // Add success/failure specific data
    if (typedJob.status === 'completed') {
      response.success = true
      response.outputUrls = typedJob.output_urls
      response.metadata = {
        renderEngine: typedJob.render_engine,
        renderTimeMs: typedJob.render_time_ms,
        creditsCost: typedJob.credits_cost,
      }
    } else if (typedJob.status === 'failed') {
      response.success = false
      response.error = typedJob.error_message || 'Unknown error'
      response.metadata = {
        renderEngine: typedJob.render_engine,
        renderTimeMs: typedJob.render_time_ms,
      }
    } else {
      // Still processing
      response.success = null // Indicates pending
    }

    // Add slides for carousel jobs
    if (slides) {
      response.slides = slides
      response.metadata = {
        ...response.metadata as Record<string, unknown>,
        slidesCompleted: slides.filter(s => s.status === 'completed').length,
        slidesTotal: slides.length,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Job API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve job status',
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An error occurred',
      },
      { status: 500 }
    )
  }
}
