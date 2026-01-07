/**
 * Render Image API
 * POST /api/v1/render/image
 *
 * Renders a single image from a template with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderWithSatori } from '@/lib/render/engine'
import type { TemplateDefinition, BrandKit } from '@/lib/render/types'
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
    console.error('[Render API] RENDER_API_SECRET or AGENT_SHARED_SECRET not configured')
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
 * Sanitize error messages for production (prevent info disclosure)
 */
function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Unknown error'
  }

  // In production, return generic messages
  if (error instanceof Error) {
    // Allow safe error messages through
    const safePatterns = [
      /template not found/i,
      /invalid request/i,
      /validation failed/i,
      /missing required/i,
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

const RenderImageSchema = z.object({
  // Template identification
  templateId: z.string().uuid().optional(),
  templateSlug: z.string().optional(),

  // Inline template definition (for custom/one-off renders)
  template: z.record(z.string(), z.unknown()).optional(),

  // Variable data
  variables: z.record(z.string(), z.unknown()).default({}),

  // Brand kit override
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

  // Output options
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(1).max(100).default(90),

  // Size override (uses template canvas if not specified)
  width: z.number().min(100).max(4096).optional(),
  height: z.number().min(100).max(4096).optional(),

  // Job tracking
  jobId: z.string().uuid().optional(),
  webhookUrl: z.string().url().optional(),
}).refine(
  (data) => data.templateId || data.templateSlug || data.template,
  { message: 'Must provide templateId, templateSlug, or inline template' }
)

type RenderImageRequest = z.infer<typeof RenderImageSchema>
type RenderSupabaseClient = ReturnType<typeof createAdminClient>

// =====================
// HELPER FUNCTIONS
// =====================

async function getTemplate(
  supabase: RenderSupabaseClient,
  templateId?: string,
  templateSlug?: string
): Promise<TemplateDefinition | null> {
  if (templateId) {
    const { data, error } = await asRenderClient(supabase)
      .from('render_templates')
      .select('*')
      .eq('id', templateId)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[Render API] Template lookup error:', error)
      return null
    }

    if (data) {
      return mapDbToTemplate(data)
    }
  }

  if (templateSlug) {
    // Get latest published version
    const { data } = await asRenderClient(supabase)
      .from('render_templates')
      .select('*')
      .eq('slug', templateSlug)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      return mapDbToTemplate(data[0])
    }
  }

  return null
}

function mapDbToTemplate(data: unknown): TemplateDefinition {
  const d = data as Record<string, unknown>
  return {
    id: d.id as string,
    slug: d.slug as string,
    version: d.version as string,
    name: d.name as string,
    category: d.category as TemplateDefinition['category'],
    subcategory: d.subcategory as string | undefined,
    extends: d.extends_slug as string | undefined,
    canvas: d.canvas as TemplateDefinition['canvas'],
    layers: d.layers as TemplateDefinition['layers'],
    variables: d.variables as TemplateDefinition['variables'],
    brandKitBindings: d.brand_kit_bindings as TemplateDefinition['brandKitBindings'],
    metadata: {
      isSystem: d.is_system as boolean,
      createdAt: d.created_at as string,
      updatedAt: d.updated_at as string,
    },
  }
}

async function resolveTemplateInheritance(
  supabase: RenderSupabaseClient,
  template: TemplateDefinition
): Promise<TemplateDefinition> {
  if (!template.extends) {
    return template
  }

  // Use database function for resolved template
  const { data, error } = await asRenderClient(supabase)
    .rpc('get_resolved_template', { template_slug: template.slug })
    .maybeSingle()

  if (error) {
    console.error('[Render API] Template resolution error:', error)
    return template
  }

  if (data) {
    return {
      ...template,
      canvas: data.canvas as TemplateDefinition['canvas'],
      layers: data.layers as TemplateDefinition['layers'],
    }
  }

  return template
}

async function createRenderJob(
  supabase: RenderSupabaseClient,
  request: RenderImageRequest,
  templateId: string
): Promise<string> {
  const { data, error } = await asRenderClient(supabase)
    .from('render_jobs')
    .insert({
      job_type: 'single_image',
      status: 'processing',
      template_id: templateId,
      input_data: {
        variables: request.variables,
        brandKit: request.brandKit,
        format: request.format,
        quality: request.quality,
        width: request.width,
        height: request.height,
      },
      webhook_url: request.webhookUrl,
      render_engine: 'satori',
    })
    .select('id')
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to create render job - no data returned')
  return data.id
}

async function updateJobStatus(
  supabase: RenderSupabaseClient,
  jobId: string,
  status: 'completed' | 'failed',
  result: { outputUrl?: string; error?: string; renderTimeMs?: number }
) {
  await asRenderClient(supabase)
    .from('render_jobs')
    .update({
      status,
      output_urls: result.outputUrl ? [result.outputUrl] : null,
      error_message: result.error,
      render_time_ms: result.renderTimeMs,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function uploadToStorage(
  supabase: RenderSupabaseClient,
  buffer: Buffer,
  format: string,
  jobId: string
): Promise<string> {
  const fileName = `renders/${jobId}.${format}`

  const { error } = await supabase.storage
    .from('render-outputs')
    .upload(fileName, buffer, {
      contentType: `image/${format}`,
      upsert: true,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from('render-outputs')
    .getPublicUrl(fileName)

  return data.publicUrl
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
    const rateLimit = await checkDistributedRateLimit(identifier, 'render')
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit)
    }

    // Parse and validate request
    const body = await request.json()
    const parsed = RenderImageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const input = parsed.data
    const supabase = createAdminClient()

    // Get template
    let template: TemplateDefinition | null = null

    if (input.template) {
      // Use inline template
      template = input.template as unknown as TemplateDefinition
    } else {
      // Fetch from database
      template = await getTemplate(supabase, input.templateId, input.templateSlug)

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      // Resolve inheritance
      template = await resolveTemplateInheritance(supabase, template)
    }

    // Create job record
    const jobId = input.jobId || await createRenderJob(supabase, input, template.id)

    // Render the image
    // Map 'jpeg' to 'jpg' for output format consistency
    const outputFormat = input.format === 'jpeg' ? 'jpg' : input.format
    const result = await renderWithSatori({
      template,
      variables: (input.variables || {}) as Record<string, string | number | boolean>,
      brandKit: input.brandKit as BrandKit | undefined,
      outputFormat: outputFormat as 'png' | 'jpg' | 'webp' | undefined,
      quality: input.quality,
    })

    // Upload to storage
    // Convert base64 to buffer for upload
    const imageBuffer = result.imageBase64
      ? Buffer.from(result.imageBase64, 'base64')
      : Buffer.from('') // Empty buffer if no image

    const outputUrl = await uploadToStorage(
      supabase,
      imageBuffer,
      input.format,
      jobId
    )

    const renderTimeMs = Date.now() - startTime

    // Update job status
    await updateJobStatus(supabase, jobId, 'completed', {
      outputUrl,
      renderTimeMs,
    })

    // Return response with rate limit headers
    return NextResponse.json(
      {
        success: true,
        jobId,
        outputUrl,
        metadata: {
          width: result.width,
          height: result.height,
          format: input.format,
          renderTimeMs,
          engine: 'satori',
        },
      },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    )

  } catch (error) {
    console.error('[Render API] Error:', error)

    return NextResponse.json(
      {
        error: 'Render failed',
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
  })
}
