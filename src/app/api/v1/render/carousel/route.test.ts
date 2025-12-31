/**
 * Carousel Render API Tests
 *
 * Tests for POST /api/v1/render/carousel and GET /api/v1/render/carousel
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { id: 'test-job-id-123' },
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })
  ),
}))

vi.mock('@/lib/skills/render', () => ({
  renderCarouselSkill: {
    execute: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() =>
    Promise.resolve({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000,
      isDistributed: false,
    })
  ),
  getRateLimitHeaders: vi.fn(() => ({
    'X-RateLimit-Limit': '20',
    'X-RateLimit-Remaining': '19',
    'X-RateLimit-Reset': String(Date.now() + 60000),
  })),
  createRateLimitResponse: vi.fn((result) => {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    })
  }),
  getIdentifier: vi.fn(() => 'test-identifier'),
}))

import { renderCarouselSkill } from '@/lib/skills/render'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'

describe('GET /api/v1/render/carousel', () => {
  it('should return health check status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      status: 'ok',
      engine: 'satori',
      version: '1.0.0',
      maxSlides: 10,
      maxConcurrent: 10,
    })
  })
})

describe('POST /api/v1/render/carousel', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      RENDER_API_SECRET: 'test-secret-key',
      NODE_ENV: 'test',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to create a request
  function createRequest(
    body: object,
    headers: Record<string, string> = { 'X-ASM-Secret': 'test-secret-key' }
  ): NextRequest {
    return new NextRequest('http://localhost/api/v1/render/carousel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  }

  // =====================
  // AUTHENTICATION TESTS
  // =====================

  describe('Authentication', () => {
    it('should reject requests without X-ASM-Secret header', async () => {
      const request = createRequest(
        { slides: [{ position: 0, templateSlug: 'test' }] },
        {}
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authentication header')
    })

    it('should reject requests with invalid secret', async () => {
      const request = createRequest(
        { slides: [{ position: 0, templateSlug: 'test' }] },
        { 'X-ASM-Secret': 'wrong-secret' }
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid authentication')
    })

    it('should accept lowercase x-asm-secret header', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest(
        {
          slides: [
            {
              position: 0,
              templateSlug: 'test-template',
              variables: { headline: 'Test' },
            },
          ],
        },
        { 'x-asm-secret': 'test-secret-key' }
      )

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should allow unauthenticated in development without secret configured', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.RENDER_API_SECRET
      delete process.env.AGENT_SHARED_SECRET

      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest(
        { slides: [{ position: 0, templateSlug: 'test' }] },
        {}
      )

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should use AGENT_SHARED_SECRET as fallback', async () => {
      delete process.env.RENDER_API_SECRET
      process.env.AGENT_SHARED_SECRET = 'agent-secret'

      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest(
        { slides: [{ position: 0, templateSlug: 'test' }] },
        { 'X-ASM-Secret': 'agent-secret' }
      )

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  // =====================
  // RATE LIMITING TESTS
  // =====================

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 60000,
        isDistributed: false,
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('should pass rate limit check for valid requests', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        success: true,
        limit: 20,
        remaining: 15,
        reset: Date.now() + 60000,
        isDistributed: false,
      })

      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(checkRateLimit).toHaveBeenCalled()
    })
  })

  // =====================
  // REQUEST VALIDATION TESTS
  // =====================

  describe('Request Validation', () => {
    it('should reject empty slides array', async () => {
      const request = createRequest({ slides: [] })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.details).toBeDefined()
    })

    it('should reject more than 10 slides', async () => {
      const slides = Array.from({ length: 11 }, (_, i) => ({
        position: i,
        templateSlug: 'test',
      }))

      const request = createRequest({ slides })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })

    it('should reject invalid position values', async () => {
      const request = createRequest({
        slides: [{ position: -1, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })

    it('should reject position greater than 9', async () => {
      const request = createRequest({
        slides: [{ position: 10, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject invalid template IDs', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateId: 'not-a-uuid' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should accept valid UUID template IDs', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [
          {
            position: 0,
            templateId: '550e8400-e29b-41d4-a716-446655440000',
          },
        ],
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should validate width and height bounds', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test', width: 50 }], // Below min 100
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject width above maximum', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test', width: 5000 }], // Above max 4096
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should validate format enum', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        format: 'gif', // Invalid
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should accept valid formats', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.webp', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'webp',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        format: 'webp',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should validate quality range', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        quality: 0, // Below min 1
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should reject quality above 100', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        quality: 101,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should validate maxConcurrent range', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        maxConcurrent: 0,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  // =====================
  // SUCCESSFUL RENDERING
  // =====================

  describe('Successful Rendering', () => {
    it('should render a single slide carousel', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [
            {
              position: 0,
              success: true,
              imageUrl: 'https://storage.example.com/slide-0.png',
              width: 1080,
              height: 1080,
              renderTimeMs: 250,
            },
          ],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [
          {
            position: 0,
            templateSlug: 'just-listed-hero',
            variables: { headline: 'Just Listed', price: '$425,000' },
          },
        ],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBe('test-job-id-123')
      expect(data.slides).toHaveLength(1)
      expect(data.slides[0].success).toBe(true)
      expect(data.slides[0].imageUrl).toBe('https://storage.example.com/slide-0.png')
      expect(data.metadata.slidesRendered).toBe(1)
      expect(data.metadata.slidesFailed).toBe(0)
    })

    it('should render multiple slides in parallel', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [
            { position: 0, success: true, imageUrl: 'https://storage.example.com/slide-0.png', width: 1080, height: 1080, renderTimeMs: 200 },
            { position: 1, success: true, imageUrl: 'https://storage.example.com/slide-1.png', width: 1080, height: 1080, renderTimeMs: 220 },
            { position: 2, success: true, imageUrl: 'https://storage.example.com/slide-2.png', width: 1080, height: 1080, renderTimeMs: 180 },
          ],
          slidesRendered: 3,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 600,
        },
        metadata: { executionTimeMs: 600 },
      })

      const request = createRequest({
        slides: [
          { position: 0, templateSlug: 'hero' },
          { position: 1, templateSlug: 'body' },
          { position: 2, templateSlug: 'cta' },
        ],
        parallel: true,
        maxConcurrent: 4,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.slides).toHaveLength(3)
      expect(data.metadata.slidesRendered).toBe(3)
    })

    it('should include brand kit data', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        brandKit: {
          id: 'brand-123',
          primaryColor: '#0077ff',
          secondaryColor: '#1c1c1e',
          fontFamily: 'Inter',
          agentName: 'John Agent',
          agentTitle: 'Realtor',
          agentPhone: '555-1234',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify skill was called with brand kit
      expect(renderCarouselSkill.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          brandKit: expect.objectContaining({
            id: 'brand-123',
            primaryColor: '#0077ff',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should include listing and life here data', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'neighborhood' }],
        listingData: {
          address: '123 Main St',
          city: 'Orlando',
          price: 425000,
        },
        lifeHereData: {
          walkScore: 72,
          diningCount: 45,
          schoolsNearby: 12,
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(renderCarouselSkill.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          listingData: expect.objectContaining({ address: '123 Main St' }),
          lifeHereData: expect.objectContaining({ walkScore: 72 }),
        }),
        expect.any(Object)
      )
    })

    it('should include metadata in response', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'jpeg',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        format: 'jpeg',
        quality: 85,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.metadata).toBeDefined()
      expect(data.metadata.format).toBe('jpeg')
      expect(data.metadata.engine).toBe('satori')
      expect(data.metadata.totalRenderTimeMs).toBeGreaterThanOrEqual(0)
    })
  })

  // =====================
  // PARTIAL FAILURE
  // =====================

  describe('Partial Failure Handling', () => {
    it('should handle partial slide failures', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [
            { position: 0, success: true, imageUrl: 'http://test.com/0.png', renderTimeMs: 100 },
            { position: 1, success: false, error: 'Template not found', renderTimeMs: 0 },
            { position: 2, success: true, imageUrl: 'http://test.com/2.png', renderTimeMs: 100 },
          ],
          slidesRendered: 2,
          slidesFailed: 1,
          format: 'png',
          totalRenderTimeMs: 200,
        },
        metadata: { executionTimeMs: 200 },
      })

      const request = createRequest({
        slides: [
          { position: 0, templateSlug: 'valid' },
          { position: 1, templateSlug: 'invalid' },
          { position: 2, templateSlug: 'valid' },
        ],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.slidesRendered).toBe(2)
      expect(data.metadata.slidesFailed).toBe(1)
      expect(data.slides[1].success).toBe(false)
      expect(data.slides[1].error).toBe('Template not found')
    })
  })

  // =====================
  // ERROR HANDLING
  // =====================

  describe('Error Handling', () => {
    it('should handle complete render failure', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: false,
        error: 'All slides failed to render',
        data: {
          slides: [
            { position: 0, success: false, error: 'Template error', renderTimeMs: 0 },
          ],
          slidesRendered: 0,
          slidesFailed: 1,
          format: 'png',
          totalRenderTimeMs: 0,
        },
        metadata: { executionTimeMs: 0 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'broken' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('All slides failed to render')
    })

    it('should handle skill execution exceptions', async () => {
      vi.mocked(renderCarouselSkill.execute).mockRejectedValueOnce(
        new Error('Render engine crashed')
      )

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Carousel render failed')
    })

    it('should sanitize error messages in production', async () => {
      process.env.NODE_ENV = 'production'

      vi.mocked(renderCarouselSkill.execute).mockRejectedValueOnce(
        new Error('Internal database connection failed at /etc/secrets')
      )

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('An error occurred while processing your request')
      expect(data.message).not.toContain('database')
      expect(data.message).not.toContain('/etc')
    })

    it('should allow safe error messages through', async () => {
      process.env.NODE_ENV = 'production'

      vi.mocked(renderCarouselSkill.execute).mockRejectedValueOnce(
        new Error('Template not found: xyz')
      )

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.message).toContain('Template not found')
    })

    it('should show detailed errors in development', async () => {
      process.env.NODE_ENV = 'development'

      vi.mocked(renderCarouselSkill.execute).mockRejectedValueOnce(
        new Error('Detailed internal error message')
      )

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.message).toBe('Detailed internal error message')
    })
  })

  // =====================
  // WEBHOOK SUPPORT
  // =====================

  describe('Webhook Support', () => {
    it('should accept webhook URL', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        webhookUrl: 'https://example.com/webhook',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should validate webhook URL format', async () => {
      const request = createRequest({
        slides: [{ position: 0, templateSlug: 'test' }],
        webhookUrl: 'not-a-valid-url',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  // =====================
  // TEMPLATE SET SUPPORT
  // =====================

  describe('Template Set Support', () => {
    it('should accept template set ID', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [
            { position: 0, success: true, imageUrl: 'http://test.com/0.png', renderTimeMs: 100 },
            { position: 1, success: true, imageUrl: 'http://test.com/1.png', renderTimeMs: 100 },
          ],
          slidesRendered: 2,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 200,
        },
        metadata: { executionTimeMs: 200 },
      })

      const request = createRequest({
        slides: [{ position: 0 }, { position: 1 }],
        templateSetId: '550e8400-e29b-41d4-a716-446655440000',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should accept template set slug', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/0.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [{ position: 0 }],
        templateSetSlug: 'just-listed-carousel',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  // =====================
  // INLINE TEMPLATE SUPPORT
  // =====================

  describe('Inline Template Support', () => {
    it('should accept inline template definitions', async () => {
      vi.mocked(renderCarouselSkill.execute).mockResolvedValueOnce({
        success: true,
        data: {
          slides: [{ position: 0, success: true, imageUrl: 'http://test.com/0.png', renderTimeMs: 100 }],
          slidesRendered: 1,
          slidesFailed: 0,
          format: 'png',
          totalRenderTimeMs: 100,
        },
        metadata: { executionTimeMs: 100 },
      })

      const request = createRequest({
        slides: [
          {
            position: 0,
            template: {
              canvas: { width: 1080, height: 1080, backgroundColor: '#000' },
              layers: [
                {
                  id: 'headline',
                  type: 'text',
                  content: { text: '{{headline}}' },
                  style: { fontSize: 48, color: '#fff' },
                  position: { x: 50, y: 50 },
                },
              ],
            },
            variables: { headline: 'Custom Template' },
          },
        ],
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
