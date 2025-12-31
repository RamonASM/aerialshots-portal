/**
 * Render Carousel Skill
 *
 * Renders multiple slides in parallel for Instagram carousels.
 * Supports template sets, shared brand kit, and Life Here data.
 */

import type { SkillDefinition, SkillResult, ValidationError } from '../types'
import type {
  RenderCarouselInput,
  RenderCarouselOutput,
  CarouselSlideOutput,
  CarouselSlideInput,
} from './types'
import type { TemplateDefinition, RenderContext } from '@/lib/render/types'
import { renderWithSatori } from '@/lib/render/engine'
import { createClient } from '@/lib/supabase/server'

// Type assertion helper for render tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asRenderClient = (client: unknown) => client as any

// =====================
// CONSTANTS
// =====================

const DEFAULT_MAX_CONCURRENT = 4
const MAX_SLIDES = 10
const SLIDE_TIMEOUT_MS = 15000 // 15 seconds per slide

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Fetch template from database
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
 * Fetch templates from a template set
 */
async function fetchTemplateSet(
  setId?: string,
  setSlug?: string
): Promise<TemplateDefinition[]> {
  const supabase = await createClient()

  let setData: { id: string } | null = null

  if (setId) {
    const { data } = await asRenderClient(supabase)
      .from('render_template_sets')
      .select('id')
      .eq('id', setId)
      .single()
    setData = data
  } else if (setSlug) {
    const { data } = await asRenderClient(supabase)
      .from('render_template_sets')
      .select('id')
      .eq('slug', setSlug)
      .single()
    setData = data
  }

  if (!setData) return []

  const { data: items } = await asRenderClient(supabase)
    .from('render_template_set_items')
    .select('template_id, position')
    .eq('set_id', setData.id)
    .order('position', { ascending: true })

  if (!items || items.length === 0) return []

  const typedItems = items as Array<{ template_id: string; position: number }>
  const templateIds = typedItems.map((i) => i.template_id)
  const { data: templates } = await asRenderClient(supabase)
    .from('render_templates')
    .select('*')
    .in('id', templateIds)
    .eq('status', 'published')

  if (!templates) return []

  // Sort by position from set items
  const positionMap = new Map(typedItems.map((i) => [i.template_id, i.position]))
  const typedTemplates = templates as Array<Record<string, unknown>>
  return typedTemplates
    .sort((a, b) => (positionMap.get(a.id as string) || 0) - (positionMap.get(b.id as string) || 0))
    .map(mapDbToTemplate)
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
 * Upload rendered slide to storage
 */
async function uploadSlide(
  buffer: Buffer,
  format: string,
  executionId: string,
  position: number
): Promise<string> {
  const supabase = await createClient()
  const fileName = `renders/${executionId}/slide-${position}.${format}`

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

/**
 * Promise with timeout wrapper for slide-level resilience
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, slidePosition: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Slide ${slidePosition} render timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Render a single slide with timeout protection
 */
async function renderSlide(
  slide: CarouselSlideInput,
  template: TemplateDefinition,
  sharedContext: RenderContext,
  format: string,
  quality: number,
  executionId: string,
  timeoutMs: number = SLIDE_TIMEOUT_MS
): Promise<CarouselSlideOutput> {
  const startTime = Date.now()

  try {
    // Merge slide variables with shared context
    const mergedVariables: Record<string, string | number | boolean> = {
      ...(sharedContext.variables as Record<string, string | number | boolean>),
      ...(slide.variables as Record<string, string | number | boolean>),
      slidePosition: slide.position,
      slideNumber: slide.position + 1,
    }

    // Render the slide with timeout
    const renderPromise = renderWithSatori({
      template,
      variables: mergedVariables,
      brandKit: sharedContext.brandKit,
      outputFormat: format as 'png' | 'jpg' | 'webp',
      quality,
    })

    const result = await withTimeout(renderPromise, timeoutMs, slide.position)

    // Convert base64 to buffer for upload
    const imageBuffer = result.imageBase64
      ? Buffer.from(result.imageBase64, 'base64')
      : Buffer.from('')

    // Upload to storage
    const imageUrl = await uploadSlide(
      imageBuffer,
      format,
      executionId,
      slide.position
    )

    return {
      position: slide.position,
      success: true,
      imageUrl,
      imageBuffer,
      width: result.width,
      height: result.height,
      renderTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`[CarouselRender] Slide ${slide.position} failed:`, message)
    return {
      position: slide.position,
      success: false,
      renderTimeMs: Date.now() - startTime,
      error: message,
    }
  }
}

/**
 * Render slides with controlled concurrency
 */
async function renderSlidesWithConcurrency<T>(
  items: T[],
  maxConcurrent: number,
  renderFn: (item: T) => Promise<CarouselSlideOutput>
): Promise<CarouselSlideOutput[]> {
  const results: CarouselSlideOutput[] = []

  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent)
    const batchResults = await Promise.all(batch.map(renderFn))
    results.push(...batchResults)
  }

  return results
}

// =====================
// SKILL DEFINITION
// =====================

/**
 * Render Carousel Skill
 */
export const renderCarouselSkill: SkillDefinition<RenderCarouselInput, RenderCarouselOutput> = {
  id: 'render-carousel',
  name: 'Render Carousel',
  description: 'Render multi-slide carousels with parallel processing',
  category: 'integrate',
  version: '1.0.0',

  inputSchema: {
    type: 'object',
    properties: {
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            position: { type: 'number' },
            templateId: { type: 'string' },
            templateSlug: { type: 'string' },
            template: { type: 'object' },
            variables: { type: 'object' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
          required: ['position'],
        },
      },
      templateSetId: { type: 'string' },
      templateSetSlug: { type: 'string' },
      brandKit: { type: 'object' },
      lifeHereData: { type: 'object' },
      listingData: { type: 'object' },
      agentData: { type: 'object' },
      format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
      quality: { type: 'number' },
      parallel: { type: 'boolean' },
      maxConcurrent: { type: 'number' },
    },
    required: ['slides'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      slides: { type: 'array' },
      totalRenderTimeMs: { type: 'number' },
      slidesRendered: { type: 'number' },
      slidesFailed: { type: 'number' },
      format: { type: 'string' },
    },
    required: ['slides', 'totalRenderTimeMs', 'slidesRendered', 'slidesFailed', 'format'],
  },

  defaultConfig: {
    timeout: 120000, // 2 minutes for full carousel
    retries: 1,
  },

  validate: (input: RenderCarouselInput): ValidationError[] => {
    const errors: ValidationError[] = []

    // Must have slides
    if (!input.slides || input.slides.length === 0) {
      errors.push({
        field: 'slides',
        message: 'At least one slide is required',
        code: 'REQUIRED',
      })
    }

    // Max slides limit
    if (input.slides && input.slides.length > MAX_SLIDES) {
      errors.push({
        field: 'slides',
        message: `Maximum ${MAX_SLIDES} slides allowed`,
        code: 'MAX_EXCEEDED',
      })
    }

    // Validate each slide has a template source
    input.slides?.forEach((slide, index) => {
      if (!slide.templateId && !slide.templateSlug && !slide.template) {
        // Check if template set is provided (templates will come from there)
        if (!input.templateSetId && !input.templateSetSlug) {
          errors.push({
            field: `slides[${index}]`,
            message: 'Slide must have templateId, templateSlug, template, or use a template set',
            code: 'REQUIRED',
          })
        }
      }
    })

    // Validate quality
    if (input.quality !== undefined && (input.quality < 1 || input.quality > 100)) {
      errors.push({
        field: 'quality',
        message: 'Quality must be between 1 and 100',
        code: 'INVALID_RANGE',
      })
    }

    // Validate maxConcurrent
    if (input.maxConcurrent !== undefined && (input.maxConcurrent < 1 || input.maxConcurrent > 10)) {
      errors.push({
        field: 'maxConcurrent',
        message: 'maxConcurrent must be between 1 and 10',
        code: 'INVALID_RANGE',
      })
    }

    return errors
  },

  execute: async (input, context): Promise<SkillResult<RenderCarouselOutput>> => {
    const startTime = Date.now()

    try {
      const format = input.format || 'png'
      const quality = input.quality || 90
      const maxConcurrent = input.maxConcurrent || DEFAULT_MAX_CONCURRENT

      // Build shared context
      const sharedContext: RenderContext = {
        variables: {},
        brandKit: input.brandKit,
        lifeHereData: input.lifeHereData,
        listingData: input.listingData,
        agentData: input.agentData,
      }

      // Get templates from set if provided
      let setTemplates: TemplateDefinition[] = []
      if (input.templateSetId || input.templateSetSlug) {
        setTemplates = await fetchTemplateSet(input.templateSetId, input.templateSetSlug)
      }

      // Prepare slides with templates
      const slidesToRender: Array<{ slide: CarouselSlideInput; template: TemplateDefinition }> = []

      for (const slide of input.slides) {
        let template: TemplateDefinition | null = null

        if (slide.template) {
          template = slide.template
        } else if (slide.templateId || slide.templateSlug) {
          template = await fetchTemplate(slide.templateId, slide.templateSlug)
        } else if (setTemplates.length > slide.position) {
          template = setTemplates[slide.position]
        }

        if (!template) {
          // Will be marked as failed
          slidesToRender.push({
            slide,
            template: null as unknown as TemplateDefinition,
          })
        } else {
          slidesToRender.push({ slide, template })
        }
      }

      // Render all slides
      let results: CarouselSlideOutput[]

      if (input.parallel !== false) {
        // Parallel rendering with concurrency control
        results = await renderSlidesWithConcurrency(
          slidesToRender,
          maxConcurrent,
          async ({ slide, template }) => {
            if (!template) {
              return {
                position: slide.position,
                success: false,
                renderTimeMs: 0,
                error: 'Template not found',
              }
            }
            return renderSlide(
              slide,
              template,
              sharedContext,
              format,
              quality,
              context.executionId
            )
          }
        )
      } else {
        // Sequential rendering
        results = []
        for (const { slide, template } of slidesToRender) {
          if (!template) {
            results.push({
              position: slide.position,
              success: false,
              renderTimeMs: 0,
              error: 'Template not found',
            })
          } else {
            const result = await renderSlide(
              slide,
              template,
              sharedContext,
              format,
              quality,
              context.executionId
            )
            results.push(result)
          }
        }
      }

      // Sort by position
      results.sort((a, b) => a.position - b.position)

      const slidesRendered = results.filter(r => r.success).length
      const slidesFailed = results.filter(r => !r.success).length
      const totalRenderTimeMs = Date.now() - startTime

      return {
        success: slidesFailed === 0,
        data: {
          slides: results,
          totalRenderTimeMs,
          slidesRendered,
          slidesFailed,
          format,
        },
        metadata: {
          executionTimeMs: totalRenderTimeMs,
          warnings: slidesFailed > 0
            ? [`${slidesFailed} slide(s) failed to render`]
            : undefined,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      return {
        success: false,
        error: message,
        errorCode: 'CAROUSEL_RENDER_ERROR',
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      }
    }
  },

  estimateCost: async (input: RenderCarouselInput): Promise<number> => {
    // Base cost per slide
    const baseCostPerSlide = 0.001

    // Format factor
    const formatFactor = input.format === 'png' ? 1.2 : 1

    // Parallel processing is slightly more expensive
    const parallelFactor = input.parallel !== false ? 1.1 : 1

    const slideCount = input.slides?.length || 0

    return baseCostPerSlide * slideCount * formatFactor * parallelFactor
  },
}

export default renderCarouselSkill
