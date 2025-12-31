/**
 * Render Template Skill
 *
 * Renders a single image from a template definition using Satori + Sharp.
 * Supports variable substitution, brand kit application, and Life Here data.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import type { RenderTemplateInput, RenderTemplateOutput } from './types'
import type { TemplateDefinition } from '@/lib/render/types'
import { renderWithSatori } from '@/lib/render/engine'
import { createClient } from '@/lib/supabase/server'

// Type assertion helper for render tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRenderClient = (client: unknown) => client as any

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Fetch template from database by ID or slug
 */
async function fetchTemplate(
  templateId?: string,
  templateSlug?: string
): Promise<TemplateDefinition | null> {
  const supabase = await createClient()

  if (templateId) {
    const { data } = await asRenderClient(supabase)
      .from('render_templates')
      .select('*')
      .eq('id', templateId)
      .eq('status', 'published')
      .single()

    if (data) return mapDbToTemplate(data)
  }

  if (templateSlug) {
    const { data } = await asRenderClient(supabase)
      .from('render_templates')
      .select('*')
      .eq('slug', templateSlug)
      .eq('status', 'published')
      .single()

    if (data) return mapDbToTemplate(data)
  }

  return null
}

/**
 * Map database record to template definition
 */
function mapDbToTemplate(data: Record<string, unknown>): TemplateDefinition {
  return {
    id: data.id as string,
    slug: data.slug as string,
    version: data.version as string,
    name: data.name as string,
    category: data.category as TemplateDefinition['category'],
    subcategory: data.subcategory as string | undefined,
    extends: data.extends_slug as string | undefined,
    canvas: data.canvas as TemplateDefinition['canvas'],
    layers: data.layers as TemplateDefinition['layers'],
    variables: data.variables as TemplateDefinition['variables'],
    brandKitBindings: data.brand_kit_bindings as TemplateDefinition['brandKitBindings'],
    metadata: {
      isSystem: data.is_system as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    },
  }
}

/**
 * Upload rendered image to storage
 */
async function uploadToStorage(
  buffer: Buffer,
  format: string,
  executionId: string
): Promise<string> {
  const supabase = await createClient()
  const fileName = `renders/${executionId}.${format}`

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
// SKILL DEFINITION
// =====================

/**
 * Render Template Skill
 */
export const renderTemplateSkill: SkillDefinition<RenderTemplateInput, RenderTemplateOutput> = {
  id: 'render-template',
  name: 'Render Template',
  description: 'Render a single image from a template with variable substitution and brand kit',
  category: 'integrate',
  version: '1.0.0',

  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string', description: 'Template ID (UUID)' },
      templateSlug: { type: 'string', description: 'Template slug' },
      template: { type: 'object', description: 'Inline template definition' },
      variables: { type: 'object', description: 'Variable values for substitution' },
      brandKit: { type: 'object', description: 'Brand kit configuration' },
      lifeHereData: { type: 'object', description: 'Life Here API data for location content' },
      listingData: { type: 'object', description: 'Property listing data' },
      agentData: { type: 'object', description: 'Agent information' },
      format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
      quality: { type: 'number', description: 'Output quality (1-100)' },
      width: { type: 'number', description: 'Override output width' },
      height: { type: 'number', description: 'Override output height' },
    },
  },

  outputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string' },
      imageBuffer: { type: 'object' },
      width: { type: 'number' },
      height: { type: 'number' },
      format: { type: 'string' },
      renderEngine: { type: 'string' },
      renderTimeMs: { type: 'number' },
      templateId: { type: 'string' },
      templateSlug: { type: 'string' },
    },
    required: ['imageUrl', 'width', 'height', 'format', 'renderEngine', 'renderTimeMs'],
  },

  defaultConfig: {
    timeout: 30000,
    retries: 2,
  },

  validate: (input: RenderTemplateInput): ValidationError[] => {
    const errors: ValidationError[] = []

    // Must provide at least one template source
    if (!input.templateId && !input.templateSlug && !input.template) {
      errors.push({
        field: 'template',
        message: 'Must provide templateId, templateSlug, or inline template',
        code: 'REQUIRED',
      })
    }

    // Validate quality range
    if (input.quality !== undefined && (input.quality < 1 || input.quality > 100)) {
      errors.push({
        field: 'quality',
        message: 'Quality must be between 1 and 100',
        code: 'INVALID_RANGE',
      })
    }

    // Validate dimensions
    if (input.width !== undefined && (input.width < 100 || input.width > 4096)) {
      errors.push({
        field: 'width',
        message: 'Width must be between 100 and 4096',
        code: 'INVALID_RANGE',
      })
    }

    if (input.height !== undefined && (input.height < 100 || input.height > 4096)) {
      errors.push({
        field: 'height',
        message: 'Height must be between 100 and 4096',
        code: 'INVALID_RANGE',
      })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<RenderTemplateOutput>> => {
    const startTime = Date.now()

    try {
      // Get template
      let template: TemplateDefinition | null = null

      if (input.template) {
        template = input.template
      } else {
        template = await fetchTemplate(input.templateId, input.templateSlug)
        if (!template) {
          return {
            success: false,
            error: 'Template not found',
            errorCode: 'TEMPLATE_NOT_FOUND',
            metadata: {
              executionTimeMs: Date.now() - startTime,
            },
          }
        }
      }

      // Build render variables
      const variables = (input.variables || {}) as Record<string, string | number | boolean>

      // Render the image
      const format = input.format || 'png'
      const outputFormat = format === 'jpeg' ? 'jpg' : format
      const result = await renderWithSatori({
        template,
        variables,
        brandKit: input.brandKit,
        outputFormat: outputFormat as 'png' | 'jpg' | 'webp',
        quality: input.quality,
      })

      // Convert base64 to buffer for upload
      const imageBuffer = result.imageBase64
        ? Buffer.from(result.imageBase64, 'base64')
        : Buffer.from('')

      // Upload to storage
      const imageUrl = await uploadToStorage(
        imageBuffer,
        format,
        context.executionId
      )

      const renderTimeMs = Date.now() - startTime

      return {
        success: true,
        data: {
          imageUrl,
          imageBuffer,
          width: result.width,
          height: result.height,
          format,
          renderEngine: 'satori',
          renderTimeMs,
          templateId: template.id,
          templateSlug: template.slug,
        },
        metadata: {
          executionTimeMs: renderTimeMs,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      let errorCode = 'RENDER_ERROR'
      if (message.includes('template')) {
        errorCode = 'TEMPLATE_ERROR'
      } else if (message.includes('font')) {
        errorCode = 'FONT_ERROR'
      } else if (message.includes('storage') || message.includes('upload')) {
        errorCode = 'STORAGE_ERROR'
      }

      return {
        success: false,
        error: message,
        errorCode,
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      }
    }
  },

  estimateCost: async (input: RenderTemplateInput): Promise<number> => {
    // Cost estimation based on render complexity
    // Base cost for Satori rendering (compute only, no external API)
    const baseCost = 0.001

    // Slightly higher cost for larger images
    const sizeFactor = input.width && input.height
      ? (input.width * input.height) / (1080 * 1350)
      : 1

    // PNG is more compute intensive than JPEG
    const formatFactor = input.format === 'png' ? 1.2 : 1

    return baseCost * sizeFactor * formatFactor
  },
}

export default renderTemplateSkill
