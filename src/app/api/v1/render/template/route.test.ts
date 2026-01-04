/**
 * Template Management API Tests
 *
 * Tests for POST /api/v1/render/template and GET /api/v1/render/template
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock Supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}))

describe('Template API', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      RENDER_API_SECRET: 'test-secret-key',
      NODE_ENV: 'test',
    }

    // Setup default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    })

    mockInsert.mockReturnValue({
      select: mockSelect,
    })

    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
    })

    mockOrder.mockReturnValue({
      range: mockRange,
    })

    mockRange.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })

    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = originalEnv
  })

  // Helper to create a request
  function createRequest(
    method: 'GET' | 'POST',
    options: {
      body?: object
      headers?: Record<string, string>
      searchParams?: Record<string, string>
    } = {}
  ): NextRequest {
    const { body, headers = { 'X-ASM-Secret': 'test-secret-key' }, searchParams } = options

    let url = 'http://localhost/api/v1/render/template'
    if (searchParams) {
      const params = new URLSearchParams(searchParams)
      url += `?${params.toString()}`
    }

    return new NextRequest(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  // Valid template for testing
  const validTemplate = {
    slug: 'test-template',
    name: 'Test Template',
    category: 'listing_marketing',
    canvas: {
      width: 1080,
      height: 1080,
      backgroundColor: '#000000',
    },
    layers: [
      {
        id: 'headline',
        type: 'text',
        position: { x: 50, y: 50 },
        content: { text: 'Hello World' },
      },
    ],
  }

  // =====================
  // AUTHENTICATION TESTS
  // =====================

  describe('Authentication', () => {
    it('should reject POST without authentication', async () => {
      const request = createRequest('POST', {
        body: validTemplate,
        headers: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authentication header')
    })

    it('should reject GET without authentication', async () => {
      const request = createRequest('GET', { headers: {} })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authentication header')
    })

    it('should reject invalid authentication', async () => {
      const request = createRequest('POST', {
        body: validTemplate,
        headers: { 'X-ASM-Secret': 'wrong-secret' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid authentication')
    })

    it('should accept lowercase x-asm-secret', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'new-id', slug: 'test-template', version: '1.0.0', name: 'Test', category: 'listing_marketing', status: 'draft', created_at: new Date().toISOString() },
        error: null,
      })

      const request = createRequest('POST', {
        body: validTemplate,
        headers: { 'x-asm-secret': 'test-secret-key' },
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should allow unauthenticated in development without secret', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('RENDER_API_SECRET', '')
      vi.stubEnv('AGENT_SHARED_SECRET', '')

      mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

      const request = createRequest('GET', { headers: {} })
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  // =====================
  // POST - CREATE TEMPLATE
  // =====================

  describe('POST /api/v1/render/template', () => {
    describe('Validation', () => {
      it('should reject empty slug', async () => {
        const request = createRequest('POST', {
          body: { ...validTemplate, slug: '' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid template data')
      })

      it('should reject invalid slug format', async () => {
        const request = createRequest('POST', {
          body: { ...validTemplate, slug: 'Invalid_Slug!' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details.slug).toBeDefined()
      })

      it('should reject missing name', async () => {
        const { name, ...noName } = validTemplate
        const request = createRequest('POST', { body: noName })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject invalid category', async () => {
        const request = createRequest('POST', {
          body: { ...validTemplate, category: 'invalid_category' },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject canvas width below minimum', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            canvas: { width: 50, height: 1080 },
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject canvas width above maximum', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            canvas: { width: 5000, height: 1080 },
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject layer without id', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            layers: [{ type: 'text', position: { x: 0, y: 0 }, content: {} }],
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject invalid layer type', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            layers: [{ id: 'test', type: 'invalid', position: { x: 0, y: 0 }, content: {} }],
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject opacity outside 0-1 range', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            layers: [{ id: 'test', type: 'text', opacity: 1.5, position: { x: 0, y: 0 }, content: {} }],
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject invalid variable type', async () => {
        const request = createRequest('POST', {
          body: {
            ...validTemplate,
            variables: [{ name: 'test', type: 'invalid' }],
          },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })

      it('should reject invalid status', async () => {
        const request = createRequest('POST', {
          body: { ...validTemplate, status: 'invalid' },
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      })
    })

    describe('Duplicate Prevention', () => {
      it('should reject duplicate slug+version', async () => {
        mockSingle.mockResolvedValueOnce({
          data: { id: 'existing-id' },
          error: null,
        })

        const request = createRequest('POST', { body: validTemplate })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.error).toContain('already exists')
      })

      it('should allow same slug with different version', async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: null })
        mockSingle.mockResolvedValueOnce({
          data: { id: 'new-id', slug: 'test-template', version: '2.0.0', name: 'Test', category: 'listing_marketing', status: 'draft', created_at: new Date().toISOString() },
          error: null,
        })

        const request = createRequest('POST', {
          body: { ...validTemplate, version: '2.0.0' },
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
      })
    })

    describe('Successful Creation', () => {
      it('should create template with minimal fields', async () => {
        const createdTemplate = {
          id: 'new-template-id',
          slug: 'test-template',
          version: '1.0.0',
          name: 'Test Template',
          category: 'listing_marketing',
          status: 'draft',
          created_at: new Date().toISOString(),
        }

        mockSingle.mockResolvedValueOnce({ data: null, error: null })
        mockSingle.mockResolvedValueOnce({ data: createdTemplate, error: null })

        const request = createRequest('POST', { body: validTemplate })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.template.id).toBe('new-template-id')
        expect(data.template.slug).toBe('test-template')
      })

      it('should create template with all fields', async () => {
        const fullTemplate = {
          ...validTemplate,
          version: '1.2.0',
          description: 'A full test template',
          subcategory: 'just_listed',
          extends: 'base-template',
          canvas: {
            width: 1080,
            height: 1350,
            backgroundColor: '#1c1c1e',
            backgroundImage: 'https://example.com/bg.jpg',
          },
          layers: [
            {
              id: 'headline',
              name: 'Main Headline',
              type: 'text',
              visible: true,
              opacity: 0.9,
              position: { type: 'absolute', x: 50, y: 100, width: 980, height: 200, anchor: 'top-left', zIndex: 10 },
              content: { text: '{{headline}}', fontSize: 48, fontWeight: 'bold' },
            },
            {
              id: 'logo',
              type: 'image',
              position: { x: 50, y: 1200 },
              content: { url: '{{logoUrl}}' },
            },
          ],
          variables: [
            { name: 'headline', displayName: 'Headline', type: 'string', required: true, source: 'user_input' },
            { name: 'logoUrl', type: 'image', required: false, source: 'brand_kit', path: 'logo' },
            { name: 'primaryColor', type: 'color', default: '#0077ff', source: 'brand_kit' },
          ],
          brandKitBindings: {
            primaryColor: 'primaryColor',
            logoUrl: 'logo',
            fontFamily: 'font',
          },
          status: 'published',
          isSystem: true,
        }

        mockSingle.mockResolvedValueOnce({ data: null, error: null })
        mockSingle.mockResolvedValueOnce({
          data: {
            id: 'full-template-id',
            ...fullTemplate,
            created_at: new Date().toISOString(),
          },
          error: null,
        })

        const request = createRequest('POST', { body: fullTemplate })

        const response = await POST(request)
        expect(response.status).toBe(201)
      })

      it('should accept all valid layer types', async () => {
        const layerTypes = ['text', 'image', 'shape', 'gradient', 'container']

        for (const type of layerTypes) {
          vi.clearAllMocks()

          mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })
          mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, single: mockSingle })
          mockInsert.mockReturnValue({ select: mockSelect })
          mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })

          mockSingle.mockResolvedValueOnce({ data: null, error: null })
          mockSingle.mockResolvedValueOnce({
            data: { id: 'id', slug: 'test', version: '1.0.0', name: 'Test', category: 'listing_marketing', status: 'draft', created_at: new Date().toISOString() },
            error: null,
          })

          const request = createRequest('POST', {
            body: {
              ...validTemplate,
              slug: `test-${type}`,
              layers: [{ id: type, type, position: { x: 0, y: 0 }, content: {} }],
            },
          })

          const response = await POST(request)
          expect(response.status).toBe(201)
        }
      })

      it.each([
        ['story_archetype', 'test-story-archetype'],
        ['listing_marketing', 'test-listing-marketing'],
        ['carousel_slide', 'test-carousel-slide'],
        ['social_post', 'test-social-post'],
        ['agent_branding', 'test-agent-branding'],
        ['market_update', 'test-market-update'],
      ])('should accept category %s', async (category, slug) => {
        // Reset mocks for this test
        mockSingle.mockReset()
        mockSingle.mockResolvedValueOnce({ data: null, error: null })
        mockSingle.mockResolvedValueOnce({
          data: { id: 'id', slug, version: '1.0.0', name: 'Test', category, status: 'draft', created_at: new Date().toISOString() },
          error: null,
        })

        const request = createRequest('POST', {
          body: { ...validTemplate, slug, category },
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
      })
    })

    describe('Database Errors', () => {
      it('should handle database insert error', async () => {
        // Reset and configure mocks
        mockSingle.mockReset()
        // First call: check for existing (no duplicate)
        mockSingle.mockResolvedValueOnce({ data: null, error: null })
        // Second call: insert fails
        mockSingle.mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        })

        const request = createRequest('POST', { body: validTemplate })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to create template')
      })
    })
  })

  // =====================
  // GET - LIST TEMPLATES
  // =====================

  describe('GET /api/v1/render/template', () => {
    describe('Query Parameters', () => {
      it('should use default pagination', async () => {
        mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

        const request = createRequest('GET')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.pagination.limit).toBe(50)
        expect(data.pagination.offset).toBe(0)
      })

      it('should accept custom limit and offset', async () => {
        mockRange.mockResolvedValue({ data: [], error: null, count: 100 })

        const request = createRequest('GET', {
          searchParams: { limit: '10', offset: '20' },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(data.pagination.limit).toBe(10)
        expect(data.pagination.offset).toBe(20)
      })

      it('should reject limit above 100', async () => {
        const request = createRequest('GET', {
          searchParams: { limit: '200' },
        })

        const response = await GET(request)
        expect(response.status).toBe(400)
      })

      it('should reject negative offset', async () => {
        const request = createRequest('GET', {
          searchParams: { offset: '-5' },
        })

        const response = await GET(request)
        expect(response.status).toBe(400)
      })

      it('should filter by category', async () => {
        // The route calls select().order().range(), then optionally .eq()
        // So range() needs to return an object with eq() method
        const filteredTemplates = [
          { id: '1', slug: 'listing-1', name: 'Listing Template', category: 'listing_marketing', status: 'published' },
        ]

        // Create a chainable mock that resolves with filtered data
        const eqMock = vi.fn().mockResolvedValue({ data: filteredTemplates, error: null, count: 1 })
        mockRange.mockReturnValue({
          eq: eqMock,
          then: (resolve: (val: { data: unknown[], error: null, count: number }) => void) =>
            Promise.resolve({ data: filteredTemplates, error: null, count: 1 }).then(resolve),
        })

        const request = createRequest('GET', {
          searchParams: { category: 'listing_marketing' },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.templates).toHaveLength(1)
        expect(data.templates[0].category).toBe('listing_marketing')
      })

      it('should filter by status', async () => {
        const publishedTemplates = [
          { id: '1', slug: 'published-1', name: 'Published Template', category: 'social_post', status: 'published' },
        ]

        const eqMock = vi.fn().mockResolvedValue({ data: publishedTemplates, error: null, count: 1 })
        mockRange.mockReturnValue({
          eq: eqMock,
          then: (resolve: (val: { data: unknown[], error: null, count: number }) => void) =>
            Promise.resolve({ data: publishedTemplates, error: null, count: 1 }).then(resolve),
        })

        const request = createRequest('GET', {
          searchParams: { status: 'published' },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.templates).toHaveLength(1)
        expect(data.templates[0].status).toBe('published')
      })

      it('should reject invalid status filter', async () => {
        const request = createRequest('GET', {
          searchParams: { status: 'invalid' },
        })

        const response = await GET(request)
        expect(response.status).toBe(400)
      })
    })

    describe('Response Format', () => {
      it('should return empty array when no templates', async () => {
        mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

        const request = createRequest('GET')
        const response = await GET(request)
        const data = await response.json()

        expect(data.templates).toEqual([])
        expect(data.pagination.total).toBe(0)
        expect(data.pagination.hasMore).toBe(false)
      })

      it('should return templates list', async () => {
        const templates = [
          { id: '1', slug: 'template-1', name: 'Template 1', category: 'listing_marketing', status: 'published' },
          { id: '2', slug: 'template-2', name: 'Template 2', category: 'social_post', status: 'draft' },
        ]

        mockRange.mockResolvedValue({ data: templates, error: null, count: 2 })

        const request = createRequest('GET')
        const response = await GET(request)
        const data = await response.json()

        expect(data.templates).toHaveLength(2)
        expect(data.templates[0].slug).toBe('template-1')
        expect(data.pagination.total).toBe(2)
      })

      it('should indicate hasMore when more results exist', async () => {
        mockRange.mockResolvedValue({
          data: Array(50).fill({ id: '1', slug: 'test' }),
          error: null,
          count: 150,
        })

        const request = createRequest('GET', {
          searchParams: { limit: '50' },
        })

        const response = await GET(request)
        const data = await response.json()

        expect(data.pagination.hasMore).toBe(true)
        expect(data.pagination.total).toBe(150)
      })
    })

    describe('Database Errors', () => {
      it('should handle database query error', async () => {
        mockRange.mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        })

        const request = createRequest('GET')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to list templates')
      })
    })
  })
})
