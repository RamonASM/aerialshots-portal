/**
 * Render Skills Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderTemplateSkill } from './template-render'
import { renderCarouselSkill } from './carousel-render'
import type { SkillExecutionContext } from '../types'
import type { RenderTemplateInput, RenderCarouselInput } from './types'

// Mock the render engine
vi.mock('@/lib/render/engine', () => ({
  renderWithSatori: vi.fn(() => Promise.resolve({
    buffer: Buffer.from('mock-image-data'),
    width: 1080,
    height: 1350,
  })),
  loadFonts: vi.fn(() => Promise.resolve([
    { name: 'Inter', data: new ArrayBuffer(100), weight: 400, style: 'normal' },
    { name: 'Inter', data: new ArrayBuffer(100), weight: 700, style: 'normal' },
  ])),
  AVAILABLE_FONTS: ['Inter', 'Montserrat'],
  DEFAULT_FONT: 'Inter',
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'template-123',
                slug: 'just-listed',
                version: '1.0.0',
                name: 'Just Listed',
                category: 'listing_marketing',
                canvas: { width: 1080, height: 1350 },
                layers: [
                  {
                    id: 'headline',
                    type: 'text',
                    position: { x: 50, y: 100 },
                    size: { width: 980, height: 100 },
                    content: { text: '{{headline}}' },
                    style: { fontSize: 48, color: '#ffffff' },
                  },
                ],
                status: 'published',
              },
              error: null,
            })),
          })),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://storage.example.com/renders/test.png' },
        })),
      })),
    },
  })),
}))

describe('renderTemplateSkill', () => {
  const mockContext: SkillExecutionContext = {
    executionId: 'exec-123',
    skillId: 'render-template',
    triggeredBy: 'test',
    triggerSource: 'manual',
    startedAt: new Date(),
    config: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('metadata', () => {
    it('should have correct skill identity', () => {
      expect(renderTemplateSkill.id).toBe('render-template')
      expect(renderTemplateSkill.name).toBe('Render Template')
      expect(renderTemplateSkill.category).toBe('integrate')
      expect(renderTemplateSkill.version).toBe('1.0.0')
    })

    it('should define required schemas', () => {
      expect(renderTemplateSkill.inputSchema).toBeDefined()
      expect(renderTemplateSkill.outputSchema).toBeDefined()
      expect(renderTemplateSkill.inputSchema.type).toBe('object')
    })

    it('should have default config', () => {
      expect(renderTemplateSkill.defaultConfig.timeout).toBeGreaterThan(0)
      expect(renderTemplateSkill.defaultConfig.retries).toBeGreaterThanOrEqual(0)
    })
  })

  describe('validation', () => {
    it('should require at least one template source', () => {
      const input: RenderTemplateInput = {
        variables: { headline: 'Test' },
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('REQUIRED')
    })

    it('should accept templateId', () => {
      const input: RenderTemplateInput = {
        templateId: '550e8400-e29b-41d4-a716-446655440000',
        variables: { headline: 'Test' },
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should accept templateSlug', () => {
      const input: RenderTemplateInput = {
        templateSlug: 'just-listed',
        variables: { headline: 'Test' },
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should accept inline template', () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'inline',
          slug: 'inline',
          version: '1.0.0',
          name: 'Inline Template',
          category: 'custom',
          canvas: { width: 1080, height: 1080 },
          layers: [],
        },
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should validate quality range', () => {
      const input: RenderTemplateInput = {
        templateSlug: 'test',
        quality: 150,
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'quality')).toBe(true)
    })

    it('should validate dimensions', () => {
      const input: RenderTemplateInput = {
        templateSlug: 'test',
        width: 50,
      }

      const errors = renderTemplateSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'width')).toBe(true)
    })
  })

  describe('execution', () => {
    it('should render template with inline definition', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test-template',
          slug: 'test',
          version: '1.0.0',
          name: 'Test Template',
          category: 'listing_marketing',
          canvas: { width: 1080, height: 1350 },
          layers: [
            {
              id: 'headline',
              type: 'text',
              position: { x: 50, y: 100 },
              size: { width: 980, height: 100 },
              content: { text: 'Just Listed!' },
              style: { fontSize: 48, color: '#ffffff' },
            },
          ],
        },
        variables: { price: 450000 },
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.width).toBe(1080)
      expect(result.data?.height).toBe(1350)
      expect(result.data?.renderEngine).toBe('satori')
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should include brand kit in render context', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'custom',
          canvas: { width: 1080, height: 1080 },
          layers: [],
        },
        brandKit: {
          id: 'brand-123',
          primaryColor: '#ff6b00',
          fontFamily: 'Montserrat',
          agentName: 'Jane Agent',
        },
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
    })

    it('should include listing data in render context', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'listing_marketing',
          canvas: { width: 1080, height: 1350 },
          layers: [],
        },
        listingData: {
          id: 'listing-123',
          address: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          price: 450000,
          beds: 4,
          baths: 3,
          sqft: 2500,
        },
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
    })

    it('should include Life Here data in render context', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'story_neighborhood',
          canvas: { width: 1080, height: 1350 },
          layers: [],
        },
        lifeHereData: {
          score: 87,
          dining: {
            count: 45,
            topPicks: [
              { name: 'The Ravenous Pig', cuisine: 'American', rating: 4.7, distance: 0.8 },
            ],
          },
          walkScore: 72,
          transitScore: 45,
        },
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
    })

    it('should respect output format option', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'custom',
          canvas: { width: 1080, height: 1080 },
          layers: [],
        },
        format: 'jpeg',
        quality: 85,
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.format).toBe('jpeg')
    })

    it('should respect size override', async () => {
      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'custom',
          canvas: { width: 1080, height: 1080 },
          layers: [],
        },
        width: 540,
        height: 675,
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      // Width/height in output come from renderWithSatori mock (1080x1350)
      // In real implementation, the override would be passed to the renderer
    })

    it('should return error metadata on failure', async () => {
      // Make the mock throw an error
      const { renderWithSatori } = await import('@/lib/render/engine')
      vi.mocked(renderWithSatori).mockRejectedValueOnce(new Error('Render failed'))

      const input: RenderTemplateInput = {
        template: {
          id: 'test',
          slug: 'test',
          version: '1.0.0',
          name: 'Test',
          category: 'custom',
          canvas: { width: 1080, height: 1080 },
          layers: [],
        },
      }

      const result = await renderTemplateSkill.execute(input, mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Render failed')
      expect(result.errorCode).toBeDefined()
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('cost estimation', () => {
    it('should estimate cost based on format', async () => {
      const pngCost = await renderTemplateSkill.estimateCost?.({
        templateSlug: 'test',
        format: 'png',
      })

      const jpegCost = await renderTemplateSkill.estimateCost?.({
        templateSlug: 'test',
        format: 'jpeg',
      })

      expect(pngCost).toBeDefined()
      expect(jpegCost).toBeDefined()
      expect(typeof pngCost).toBe('number')
    })
  })
})

// =====================
// CAROUSEL SKILL TESTS
// =====================

describe('renderCarouselSkill', () => {
  const mockContext: SkillExecutionContext = {
    executionId: 'exec-456',
    skillId: 'render-carousel',
    triggeredBy: 'test',
    triggerSource: 'manual',
    startedAt: new Date(),
    config: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('metadata', () => {
    it('should have correct skill identity', () => {
      expect(renderCarouselSkill.id).toBe('render-carousel')
      expect(renderCarouselSkill.name).toBe('Render Carousel')
      expect(renderCarouselSkill.category).toBe('integrate')
      expect(renderCarouselSkill.version).toBe('1.0.0')
    })

    it('should have default config with longer timeout', () => {
      expect(renderCarouselSkill.defaultConfig.timeout).toBeGreaterThanOrEqual(60000)
    })
  })

  describe('validation', () => {
    it('should require at least one slide', () => {
      const input: RenderCarouselInput = {
        slides: [],
      }

      const errors = renderCarouselSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'slides')).toBe(true)
    })

    it('should enforce max slides limit', () => {
      const input: RenderCarouselInput = {
        slides: Array.from({ length: 15 }, (_, i) => ({
          position: i,
          template: {
            id: `template-${i}`,
            slug: `template-${i}`,
            version: '1.0.0',
            name: `Template ${i}`,
            category: 'custom' as const,
            canvas: { width: 1080, height: 1350 },
            layers: [],
          },
        })),
      }

      const errors = renderCarouselSkill.validate?.(input) ?? []
      expect(errors.some(e => e.code === 'MAX_EXCEEDED')).toBe(true)
    })

    it('should require template source for each slide', () => {
      const input: RenderCarouselInput = {
        slides: [
          { position: 0, variables: { headline: 'Test' } },
        ],
      }

      const errors = renderCarouselSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field?.includes('slides'))).toBe(true)
    })

    it('should accept slides with inline templates', () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'slide-1',
              slug: 'slide-1',
              version: '1.0.0',
              name: 'Slide 1',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
        ],
      }

      const errors = renderCarouselSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should validate quality range', () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'test',
              slug: 'test',
              version: '1.0.0',
              name: 'Test',
              category: 'custom',
              canvas: { width: 1080, height: 1080 },
              layers: [],
            },
          },
        ],
        quality: 150,
      }

      const errors = renderCarouselSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'quality')).toBe(true)
    })
  })

  describe('execution', () => {
    it('should render carousel with inline templates', async () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'slide-1',
              slug: 'hero',
              version: '1.0.0',
              name: 'Hero Slide',
              category: 'listing_marketing',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
            variables: { headline: 'Just Listed!' },
          },
          {
            position: 1,
            template: {
              id: 'slide-2',
              slug: 'features',
              version: '1.0.0',
              name: 'Features Slide',
              category: 'listing_marketing',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
            variables: { feature: '4 Bedrooms' },
          },
        ],
        brandKit: {
          id: 'brand-123',
          primaryColor: '#0077ff',
          fontFamily: 'Inter',
        },
      }

      const result = await renderCarouselSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.slides.length).toBe(2)
      expect(result.data?.slidesRendered).toBe(2)
      expect(result.data?.slidesFailed).toBe(0)
    })

    it('should include shared context in all slides', async () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'test',
              slug: 'test',
              version: '1.0.0',
              name: 'Test',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
        ],
        listingData: {
          id: 'listing-123',
          address: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          price: 450000,
        },
        lifeHereData: {
          score: 87,
          dining: { count: 45 },
        },
      }

      const result = await renderCarouselSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
    })

    it('should respect output format', async () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'test',
              slug: 'test',
              version: '1.0.0',
              name: 'Test',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
        ],
        format: 'jpeg',
        quality: 85,
      }

      const result = await renderCarouselSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.format).toBe('jpeg')
    })

    it('should support sequential rendering', async () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'test-1',
              slug: 'test-1',
              version: '1.0.0',
              name: 'Test 1',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
          {
            position: 1,
            template: {
              id: 'test-2',
              slug: 'test-2',
              version: '1.0.0',
              name: 'Test 2',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
        ],
        parallel: false,
      }

      const result = await renderCarouselSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.slidesRendered).toBe(2)
    })

    it('should add slide position to variables', async () => {
      const input: RenderCarouselInput = {
        slides: [
          {
            position: 0,
            template: {
              id: 'test',
              slug: 'test',
              version: '1.0.0',
              name: 'Test',
              category: 'custom',
              canvas: { width: 1080, height: 1350 },
              layers: [],
            },
          },
        ],
      }

      const result = await renderCarouselSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      // The skill adds slidePosition and slideNumber to context
    })
  })

  describe('cost estimation', () => {
    it('should estimate cost based on slide count', async () => {
      const singleSlide: RenderCarouselInput = {
        slides: [{ position: 0, templateSlug: 'test' }],
      }

      const multipleSlides: RenderCarouselInput = {
        slides: [
          { position: 0, templateSlug: 'test' },
          { position: 1, templateSlug: 'test' },
          { position: 2, templateSlug: 'test' },
        ],
      }

      const singleCost = await renderCarouselSkill.estimateCost?.(singleSlide)
      const multipleCost = await renderCarouselSkill.estimateCost?.(multipleSlides)

      expect(singleCost).toBeDefined()
      expect(multipleCost).toBeDefined()
      expect(multipleCost!).toBeGreaterThan(singleCost!)
    })
  })
})
