/**
 * Template Detail API
 * GET /api/v1/render/template/[templateId] - Get template by ID or slug
 * PUT /api/v1/render/template/[templateId] - Update template
 * DELETE /api/v1/render/template/[templateId] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

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

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.enum([
    'story_archetype',
    'listing_marketing',
    'carousel_slide',
    'social_post',
    'agent_branding',
    'market_update',
  ]).optional(),
  subcategory: z.string().optional(),
  canvas: z.object({
    width: z.number().min(100).max(4096),
    height: z.number().min(100).max(4096),
    backgroundColor: z.string().optional(),
    backgroundImage: z.string().optional(),
  }).optional(),
  layers: z.array(z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    type: z.enum(['text', 'image', 'shape', 'gradient', 'container']),
    visible: z.boolean().optional(),
    opacity: z.number().min(0).max(1).optional(),
    position: z.record(z.string(), z.unknown()),
    content: z.record(z.string(), z.unknown()),
  })).optional(),
  variables: z.array(z.object({
    name: z.string().min(1),
    displayName: z.string().optional(),
    type: z.enum(['string', 'number', 'color', 'image', 'boolean']),
    required: z.boolean().optional(),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
    source: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
  brandKitBindings: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    logoUrl: z.string().optional(),
    headshotUrl: z.string().optional(),
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

// =====================
// HELPER FUNCTIONS
// =====================

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// =====================
// ROUTE HANDLERS
// =====================

/**
 * GET - Get template by ID or slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { templateId } = await params
    const supabase = createAdminClient()

    // Check query params for version
    const url = new URL(request.url)
    const version = url.searchParams.get('version')
    const resolved = url.searchParams.get('resolved') === 'true'

    let query = asRenderClient(supabase)
      .from('render_templates')
      .select('*')

    // Query by UUID or slug
    if (isUUID(templateId)) {
      query = query.eq('id', templateId)
    } else {
      query = query.eq('slug', templateId)
      if (version) {
        query = query.eq('version', version)
      } else {
        // Get latest version
        query = query.order('version', { ascending: false }).limit(1)
      }
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // If resolved=true and template extends another, resolve inheritance
    let template = data
    if (resolved && data.extends_slug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: resolvedData, error: rpcError } = await (asRenderClient(supabase) as any)
        .rpc('get_resolved_template', { template_slug: data.slug })
        .maybeSingle()

      if (rpcError) {
        console.error('[Template API] RPC resolution error:', rpcError)
      }

      if (resolvedData) {
        template = {
          ...data,
          canvas: resolvedData.canvas,
          layers: resolvedData.layers,
        }
      }
    }

    return NextResponse.json({
      template: {
        id: template.id,
        slug: template.slug,
        version: template.version,
        name: template.name,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        extends: template.extends_slug,
        canvas: template.canvas,
        layers: template.layers,
        variables: template.variables,
        brandKitBindings: template.brand_kit_bindings,
        status: template.status,
        isSystem: template.is_system,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
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

/**
 * PUT - Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { templateId } = await params

    if (!isUUID(templateId)) {
      return NextResponse.json(
        { error: 'Template ID must be a UUID for updates' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = UpdateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updates = parsed.data
    const supabase = createAdminClient()

    // Check if template exists
    const { data: existing, error: existingError } = await asRenderClient(supabase)
      .from('render_templates')
      .select('id, is_system')
      .eq('id', templateId)
      .maybeSingle()

    if (existingError) {
      console.error('[Template API] Template lookup error:', existingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Prevent updating system templates unless explicitly allowed
    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify system templates' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory
    if (updates.canvas !== undefined) updateData.canvas = updates.canvas
    if (updates.layers !== undefined) updateData.layers = updates.layers
    if (updates.variables !== undefined) updateData.variables = updates.variables
    if (updates.brandKitBindings !== undefined) updateData.brand_kit_bindings = updates.brandKitBindings
    if (updates.status !== undefined) updateData.status = updates.status

    const { data, error } = await asRenderClient(supabase)
      .from('render_templates')
      .update(updateData)
      .eq('id', templateId)
      .select('id, slug, version, name, category, status, updated_at')
      .single()

    if (error) {
      console.error('[Template API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template: data,
    })

  } catch (error) {
    console.error('[Template API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const auth = validateAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { templateId } = await params

    if (!isUUID(templateId)) {
      return NextResponse.json(
        { error: 'Template ID must be a UUID for deletion' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if template exists and is not a system template
    const { data: existing, error: existingError } = await asRenderClient(supabase)
      .from('render_templates')
      .select('id, is_system, slug')
      .eq('id', templateId)
      .maybeSingle()

    if (existingError) {
      console.error('[Template API] Template lookup error:', existingError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    if (existing.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      )
    }

    // Check if any templates extend this one
    const { data: dependents } = await asRenderClient(supabase)
      .from('render_templates')
      .select('id, slug')
      .eq('extends_slug', existing.slug)
      .limit(1)

    if (dependents && dependents.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is extended by other templates' },
        { status: 409 }
      )
    }

    const { error } = await asRenderClient(supabase)
      .from('render_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('[Template API] Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedId: templateId,
    })

  } catch (error) {
    console.error('[Template API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
