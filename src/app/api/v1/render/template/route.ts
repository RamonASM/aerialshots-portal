/**
 * Template Management API
 * POST /api/v1/render/template - Create template
 * GET /api/v1/render/template - List templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { TemplateCategory, LayerType } from '@/lib/render/types'

// Type assertion helper for render tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRenderClient = (client: unknown) => client as any

// =====================
// SECURITY CONFIG
// =====================

function getApiSecret(): string | undefined {
  return process.env.RENDER_API_SECRET || process.env.AGENT_SHARED_SECRET
}

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
    console.error('[Template API] RENDER_API_SECRET not configured')
    return { valid: false, error: 'Server configuration error' }
  }

  if (secret.length !== apiSecret.length) {
    return { valid: false, error: 'Invalid authentication' }
  }

  let valid = true
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] !== apiSecret[i]) {
      valid = false
    }
  }

  return valid ? { valid: true } : { valid: false, error: 'Invalid authentication' }
}

// =====================
// VALIDATION SCHEMAS
// =====================

const LayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.enum(['text', 'image', 'shape', 'gradient', 'container'] as const),
  visible: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  position: z.object({
    type: z.enum(['absolute', 'flex']).optional(),
    x: z.union([z.number(), z.string()]).optional(),
    y: z.union([z.number(), z.string()]).optional(),
    width: z.union([z.number(), z.string()]).optional(),
    height: z.union([z.number(), z.string()]).optional(),
    anchor: z.string().optional(),
    zIndex: z.number().optional(),
  }),
  content: z.record(z.string(), z.unknown()),
})

const TemplateVariableSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  type: z.enum(['string', 'number', 'color', 'image', 'boolean']),
  required: z.boolean().optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  source: z.enum(['user_input', 'brand_kit', 'listing', 'agent', 'life_here', 'system']).optional(),
  path: z.string().optional(),
})

const CreateTemplateSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  version: z.string().default('1.0.0'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum([
    'story_archetype',
    'listing_marketing',
    'carousel_slide',
    'social_post',
    'agent_branding',
    'market_update',
  ] as const),
  subcategory: z.string().optional(),
  extends: z.string().optional(),
  canvas: z.object({
    width: z.number().min(100).max(4096),
    height: z.number().min(100).max(4096),
    backgroundColor: z.string().optional(),
    backgroundImage: z.string().optional(),
  }),
  layers: z.array(LayerSchema),
  variables: z.array(TemplateVariableSchema).optional(),
  brandKitBindings: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    logoUrl: z.string().optional(),
    headshotUrl: z.string().optional(),
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isSystem: z.boolean().default(false),
})

const ListTemplatesSchema = z.object({
  category: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// =====================
// ROUTE HANDLERS
// =====================

/**
 * POST - Create new template
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid template data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const input = parsed.data
    const supabase = await createClient()

    // Check if slug already exists for this version
    const { data: existing, error: existingError } = await asRenderClient(supabase)
      .from('render_templates')
      .select('id')
      .eq('slug', input.slug)
      .eq('version', input.version)
      .maybeSingle()

    if (existingError) {
      console.error('[Template API] Slug check error:', existingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Template with this slug and version already exists' },
        { status: 409 }
      )
    }

    // Create template
    const { data, error } = await asRenderClient(supabase)
      .from('render_templates')
      .insert({
        slug: input.slug,
        version: input.version,
        name: input.name,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        extends_slug: input.extends,
        canvas: input.canvas,
        layers: input.layers,
        variables: input.variables || [],
        brand_kit_bindings: input.brandKitBindings || {},
        status: input.status,
        is_system: input.isSystem,
      })
      .select('id, slug, version, name, category, status, created_at')
      .single()

    if (error) {
      console.error('[Template API] Create error:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template: data,
    }, { status: 201 })

  } catch (error) {
    console.error('[Template API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET - List templates with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const url = new URL(request.url)
    const params = {
      category: url.searchParams.get('category') || undefined,
      status: url.searchParams.get('status') || undefined,
      limit: url.searchParams.get('limit') || '50',
      offset: url.searchParams.get('offset') || '0',
    }

    const parsed = ListTemplatesSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { category, status, limit, offset } = parsed.data
    const supabase = await createClient()

    let query = asRenderClient(supabase)
      .from('render_templates')
      .select('id, slug, version, name, description, category, subcategory, status, is_system, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Template API] List error:', error)
      return NextResponse.json(
        { error: 'Failed to list templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })

  } catch (error) {
    console.error('[Template API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
