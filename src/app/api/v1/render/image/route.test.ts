/**
 * Render Image API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Test API secret
const TEST_API_SECRET = 'test-secret-key-12345'

// Set environment for tests
vi.stubEnv('RENDER_API_SECRET', TEST_API_SECRET)

// Helper to create authenticated request
function createAuthRequest(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ASM-Secret': TEST_API_SECRET,
    },
    body: JSON.stringify(body),
  })
}

// Mock rate limit
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ success: true, remaining: 100 })),
  getRateLimitHeaders: vi.fn(() => ({})),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn(() => 'test-identifier'),
}))

// Mock Supabase admin client
const mockTemplateData = {
  id: 'template-123',
  slug: 'just-listed',
  version: '1.0.0',
  name: 'Just Listed',
  category: 'listing_marketing',
  canvas: { width: 1080, height: 1350 },
  layers: [],
  status: 'published',
}

const createChain = (data: unknown = null, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn(() => Promise.resolve({ data: data ? [data] : [], error })),
  single: vi.fn(() => Promise.resolve({ data, error })),
  maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'render_templates') {
        return createChain(mockTemplateData)
      }
      if (table === 'render_jobs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'job-123' },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      return createChain()
    }),
    rpc: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve({
        data: {
          canvas: { width: 1080, height: 1350 },
          layers: [],
        },
        error: null,
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://storage.example.com/renders/job-123.png' },
        })),
      })),
    },
  }),
}))

// Mock render engine
vi.mock('@/lib/render/engine', () => ({
  renderWithSatori: vi.fn(() => Promise.resolve({
    imageBase64: Buffer.from('mock-image').toString('base64'),
    width: 1080,
    height: 1350,
  })),
}))

// Import after mocks
import { POST, GET } from './route'

describe('POST /api/v1/render/image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render image with templateId', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateId: '550e8400-e29b-41d4-a716-446655440000',
      variables: {
        price: 450000,
        address: '123 Main St',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.jobId).toBeDefined()
    expect(data.outputUrl).toBeDefined()
    expect(data.metadata.engine).toBe('satori')
  })

  it('should render image with templateSlug', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateSlug: 'just-listed',
      variables: {
        price: 500000,
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should render image with inline template', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      template: {
        id: 'inline-template',
        slug: 'custom',
        version: '1.0.0',
        name: 'Custom Template',
        category: 'custom',
        canvas: { width: 1080, height: 1080 },
        layers: [
          {
            id: 'text-1',
            type: 'text',
            position: { x: 100, y: 100 },
            size: { width: 880, height: 100 },
            content: { text: 'Hello World' },
            style: { fontSize: 48, fontWeight: 700, color: '#ffffff' },
          },
        ],
      },
      variables: {},
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 400 for invalid request', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      // Missing templateId, templateSlug, and template
      variables: {},
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request')
  })

  it('should accept output format options', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateSlug: 'just-listed',
      format: 'jpeg',
      quality: 85,
      width: 540,
      height: 675,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.metadata.format).toBe('jpeg')
  })

  it('should accept brand kit override', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateSlug: 'just-listed',
      brandKit: {
        id: 'brand-123',
        primaryColor: '#ff6b00',
        fontFamily: 'Montserrat',
        agentName: 'Jane Agent',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should validate quality range', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateSlug: 'just-listed',
      quality: 150, // Invalid: > 100
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should validate size limits', async () => {
    const request = createAuthRequest('http://localhost/api/v1/render/image', {
      templateSlug: 'just-listed',
      width: 50, // Invalid: < 100
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 401 for missing auth header', async () => {
    const request = new NextRequest('http://localhost/api/v1/render/image', {
      method: 'POST',
      body: JSON.stringify({
        templateSlug: 'just-listed',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 401 for invalid auth header', async () => {
    const request = new NextRequest('http://localhost/api/v1/render/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ASM-Secret': 'wrong-secret',
      },
      body: JSON.stringify({
        templateSlug: 'just-listed',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})

describe('GET /api/v1/render/image', () => {
  it('should return health status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.status).toBe('ok')
    expect(data.engine).toBe('satori')
    expect(data.version).toBeDefined()
  })
})
