/**
 * Render Carousel API
 * POST /api/v1/render/carousel
 *
 * Renders multiple slides in parallel for Instagram carousels
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { renderCarouselSkill } from '@/lib/skills/render'
import type { RenderCarouselInput, CarouselSlideInput } from '@/lib/skills/render/types'
import type { BrandKit } from '@/lib/render/types'
import type { SkillExecutionContext } from '@/lib/skills/types'
import {
  checkRateLimit as checkDistributedRateLimit,
  getRateLimitHeaders,
  createRateLimitResponse,
  getIdentifier,
} from '@/lib/rate-limit'

// Type assertion helper for render tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRenderClient = (client: unknown) => client as any

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

  // Allow unauthenticated access in development for easier testing
  if (process.env.NODE_ENV === 'development' && !apiSecret) {
    return { valid: true }
  }

  const secret = request.headers.get('X-ASM-Secret') || request.headers.get('x-asm-secret')

  if (!secret) {
    return { valid: false, error: 'Missing authentication header' }
  }

  if (!apiSecret) {
    console.error('[Carousel API] RENDER_API_SECRET or AGENT_SHARED_SECRET not configured')
    return { valid: false, error: 'Server configuration error' }
  }

  // Constant-time comparison to prevent timing attacks
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


/**
 * Sanitize error messages for production
 */
function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Unknown error'
  }

  if (error instanceof Error) {
    const safePatterns = [
      /template not found/i,
      /invalid request/i,
      /validation failed/i,
      /missing required/i,
      /slides required/i,
    ]

    if (safePatterns.some(p => p.test(error.message))) {
      return error.message
    }
  }

  return 'An error occurred while processing your request'
}

// =====================
// REQUEST VALIDATION
// =====================

const SlideSchema = z.object({
  position: z.number().min(0).max(9),
  templateId: z.string().uuid().optional(),
  templateSlug: z.string().optional(),
  template: z.record(z.string(), z.unknown()).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
  width: z.number().min(100).max(4096).optional(),
  height: z.number().min(100).max(4096).optional(),
})

const RenderCarouselSchema = z.object({
  // Slides array
  slides: z.array(SlideSchema).min(1).max(10),

  // Template set (alternative to per-slide templates)
  templateSetId: z.string().uuid().optional(),
  templateSetSlug: z.string().optional(),

  // Shared context data
  brandKit: z.object({
    id: z.string(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    fontFamily: z.string().optional(),
    logoUrl: z.string().optional(),
    agentName: z.string().optional(),
    agentTitle: z.string().optional(),
    agentPhone: z.string().optional(),
    agentEmail: z.string().optional(),
    agentPhotoUrl: z.string().optional(),
    brokerageName: z.string().optional(),
    brokerageLogo: z.string().optional(),
  }).optional(),

  lifeHereData: z.record(z.string(), z.unknown()).optional(),
  listingData: z.record(z.string(), z.unknown()).optional(),
  agentData: z.record(z.string(), z.unknown()).optional(),

  // Output options
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(1).max(100).default(90),

  // Rendering options
  parallel: z.boolean().default(true),
  maxConcurrent: z.number().min(1).max(10).default(4),

  // Job tracking
  webhookUrl: z.string().url().optional(),
})

type RenderCarouselRequest = z.infer<typeof RenderCarouselSchema>

// =====================
// HELPER FUNCTIONS
// =====================

function generateExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

async function createCarouselJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: RenderCarouselRequest
): Promise<string> {
  const { data, error } = await asRenderClient(supabase)
    .from('render_jobs')
    .insert({
      job_type: 'carousel',
      status: 'processing',
      input_data: {
        slideCount: request.slides.length,
        format: request.format,
        quality: request.quality,
        parallel: request.parallel,
        hasBrandKit: !!request.brandKit,
        hasLifeHereData: !!request.lifeHereData,
        hasListingData: !!request.listingData,
      },
      webhook_url: request.webhookUrl,
      render_engine: 'satori',
    })
    .select('id')
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to create carousel job - no data returned')
  return data.id
}

async function updateCarouselJobStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  status: 'completed' | 'failed',
  result: {
    outputUrls?: string[]
    error?: string
    renderTimeMs?: number
    slidesRendered?: number
    slidesFailed?: number
  }
) {
  await asRenderClient(supabase)
    .from('render_jobs')
    .update({
      status,
      output_urls: result.outputUrls,
      error_message: result.error,
      render_time_ms: result.renderTimeMs,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  // Also update individual slide records if we have slides table
  // This would be done in a production system for per-slide tracking
}

// =====================
// ROUTE HANDLER
// =====================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check authentication
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check rate limit (distributed via Upstash Redis, falls back to in-memory)
    const identifier = getIdentifier(request)
    const rateLimit = await checkDistributedRateLimit(identifier, 'carousel')
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit)
    }

    // Parse and validate request
    const body = await request.json()
    const parsed = RenderCarouselSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const input = parsed.data
    const supabase = await createClient()
    const executionId = generateExecutionId()

    // Create job record
    const jobId = await createCarouselJob(supabase, input)

    // Build skill input
    const skillInput: RenderCarouselInput = {
      slides: input.slides.map((slide): CarouselSlideInput => ({
        position: slide.position,
        templateId: slide.templateId,
        templateSlug: slide.templateSlug,
        template: slide.template as CarouselSlideInput['template'],
        variables: slide.variables || {},
        width: slide.width,
        height: slide.height,
      })),
      templateSetId: input.templateSetId,
      templateSetSlug: input.templateSetSlug,
      brandKit: input.brandKit as BrandKit | undefined,
      lifeHereData: input.lifeHereData as RenderCarouselInput['lifeHereData'],
      listingData: input.listingData as RenderCarouselInput['listingData'],
      agentData: input.agentData as RenderCarouselInput['agentData'],
      format: input.format,
      quality: input.quality,
      parallel: input.parallel,
      maxConcurrent: input.maxConcurrent,
    }

    // Build execution context
    const context: SkillExecutionContext = {
      executionId,
      skillId: 'render-carousel',
      triggeredBy: 'api-v1-render-carousel',
      triggerSource: 'manual',
      startedAt: new Date(),
      config: {},
    }

    // Execute the carousel render skill
    const result = await renderCarouselSkill.execute(skillInput, context)

    const renderTimeMs = Date.now() - startTime

    // Extract output URLs
    const outputUrls = result.data?.slides
      .filter(s => s.success && s.imageUrl)
      .map(s => s.imageUrl as string) || []

    // Update job status
    await updateCarouselJobStatus(supabase, jobId, result.success ? 'completed' : 'failed', {
      outputUrls: outputUrls.length > 0 ? outputUrls : undefined,
      error: result.error,
      renderTimeMs,
      slidesRendered: result.data?.slidesRendered,
      slidesFailed: result.data?.slidesFailed,
    })

    // Return response with rate limit headers
    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          jobId,
          slides: result.data?.slides.map(slide => ({
            position: slide.position,
            success: slide.success,
            imageUrl: slide.imageUrl,
            width: slide.width,
            height: slide.height,
            renderTimeMs: slide.renderTimeMs,
            error: slide.error,
          })),
          metadata: {
            slidesRendered: result.data?.slidesRendered,
            slidesFailed: result.data?.slidesFailed,
            format: result.data?.format,
            totalRenderTimeMs: renderTimeMs,
            engine: 'satori',
          },
        },
        {
          headers: getRateLimitHeaders(rateLimit),
        }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          jobId,
          error: result.error,
          slides: result.data?.slides || [],
          metadata: {
            slidesRendered: result.data?.slidesRendered || 0,
            slidesFailed: result.data?.slidesFailed || input.slides.length,
            totalRenderTimeMs: renderTimeMs,
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Carousel API] Error:', error)

    return NextResponse.json(
      {
        error: 'Carousel render failed',
        message: sanitizeError(error),
      },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    engine: 'satori',
    version: '1.0.0',
    maxSlides: 10,
    maxConcurrent: 10,
  })
}
