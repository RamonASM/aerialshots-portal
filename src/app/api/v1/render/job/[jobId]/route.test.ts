/**
 * Render Job Status API Tests
 *
 * Tests for GET /api/v1/render/job/[jobId]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock Supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}))

describe('GET /api/v1/render/job/[jobId]', () => {
  const originalEnv = process.env
  const validJobId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      RENDER_API_SECRET: 'test-secret-key',
      NODE_ENV: 'test',
    }

    // Setup mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
    })

    mockEq.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
    })

    mockOrder.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = originalEnv
  })

  // Helper to create a request
  function createRequest(
    jobId: string,
    headers: Record<string, string> = { 'X-ASM-Secret': 'test-secret-key' }
  ): NextRequest {
    return new NextRequest(`http://localhost/api/v1/render/job/${jobId}`, {
      method: 'GET',
      headers,
    })
  }

  // Helper to create params promise
  function createParams(jobId: string): Promise<{ jobId: string }> {
    return Promise.resolve({ jobId })
  }

  // =====================
  // AUTHENTICATION TESTS
  // =====================

  describe('Authentication', () => {
    it('should reject requests without X-ASM-Secret header', async () => {
      const request = createRequest(validJobId, {})
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Missing authentication header')
    })

    it('should reject requests with invalid secret', async () => {
      const request = createRequest(validJobId, { 'X-ASM-Secret': 'wrong-secret' })
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid authentication')
    })

    it('should accept lowercase x-asm-secret header', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'completed',
          output_urls: ['http://test.com/1.png'],
          created_at: new Date().toISOString(),
        },
        error: null,
      })

      const request = createRequest(validJobId, { 'x-asm-secret': 'test-secret-key' })
      const response = await GET(request, { params: createParams(validJobId) })

      expect(response.status).toBe(200)
    })

    it('should allow unauthenticated in development without secret', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('RENDER_API_SECRET', '')
      vi.stubEnv('AGENT_SHARED_SECRET', '')

      mockSingle.mockResolvedValue({
        data: { id: validJobId, job_type: 'single_image', status: 'pending', created_at: new Date().toISOString() },
        error: null,
      })

      const request = createRequest(validJobId, {})
      const response = await GET(request, { params: createParams(validJobId) })

      expect(response.status).toBe(200)
    })

    it('should use AGENT_SHARED_SECRET as fallback', async () => {
      delete process.env.RENDER_API_SECRET
      process.env.AGENT_SHARED_SECRET = 'agent-secret'

      mockSingle.mockResolvedValue({
        data: { id: validJobId, job_type: 'single_image', status: 'pending', created_at: new Date().toISOString() },
        error: null,
      })

      const request = createRequest(validJobId, { 'X-ASM-Secret': 'agent-secret' })
      const response = await GET(request, { params: createParams(validJobId) })

      expect(response.status).toBe(200)
    })
  })

  // =====================
  // JOB ID VALIDATION
  // =====================

  describe('Job ID Validation', () => {
    it('should reject non-UUID job IDs', async () => {
      const request = createRequest('not-a-uuid')
      const response = await GET(request, { params: createParams('not-a-uuid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid job ID format')
    })

    it('should reject malformed UUIDs', async () => {
      const request = createRequest('550e8400-e29b-41d4-a716')
      const response = await GET(request, { params: createParams('550e8400-e29b-41d4-a716') })

      expect(response.status).toBe(400)
    })

    it('should accept valid UUID format', async () => {
      mockSingle.mockResolvedValue({
        data: { id: validJobId, job_type: 'single_image', status: 'pending', created_at: new Date().toISOString() },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })

      expect(response.status).toBe(200)
    })

    it('should accept uppercase UUID', async () => {
      const uppercaseId = validJobId.toUpperCase()

      mockSingle.mockResolvedValue({
        data: { id: uppercaseId, job_type: 'single_image', status: 'pending', created_at: new Date().toISOString() },
        error: null,
      })

      const request = createRequest(uppercaseId)
      const response = await GET(request, { params: createParams(uppercaseId) })

      expect(response.status).toBe(200)
    })
  })

  // =====================
  // NOT FOUND
  // =====================

  describe('Job Not Found', () => {
    it('should return 404 for non-existent job', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Job not found')
    })
  })

  // =====================
  // SINGLE IMAGE JOBS
  // =====================

  describe('Single Image Jobs', () => {
    it('should return pending job status', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'pending',
          created_at: '2024-01-15T10:00:00Z',
          completed_at: null,
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(validJobId)
      expect(data.type).toBe('single_image')
      expect(data.status).toBe('pending')
      expect(data.success).toBeNull()
    })

    it('should return processing job status', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'processing',
          created_at: '2024-01-15T10:00:00Z',
          completed_at: null,
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.status).toBe('processing')
      expect(data.success).toBeNull()
    })

    it('should return completed job with output', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'completed',
          output_urls: ['https://storage.example.com/output.png'],
          render_engine: 'satori',
          render_time_ms: 350,
          credits_cost: 1,
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:01Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.outputUrls).toEqual(['https://storage.example.com/output.png'])
      expect(data.metadata.renderEngine).toBe('satori')
      expect(data.metadata.renderTimeMs).toBe(350)
      expect(data.metadata.creditsCost).toBe(1)
      expect(data.completedAt).toBe('2024-01-15T10:00:01Z')
    })

    it('should return failed job with error', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'failed',
          error_message: 'Template not found',
          render_engine: 'satori',
          render_time_ms: 50,
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:01Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Template not found')
      expect(data.metadata.renderEngine).toBe('satori')
    })

    it('should handle failed job without error message', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'failed',
          error_message: null,
          created_at: '2024-01-15T10:00:00Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBe('Unknown error')
    })
  })

  // =====================
  // CAROUSEL JOBS
  // =====================

  describe('Carousel Jobs', () => {
    it('should fetch and return slide statuses', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'carousel',
          status: 'completed',
          output_urls: ['http://test.com/0.png', 'http://test.com/1.png', 'http://test.com/2.png'],
          render_engine: 'satori',
          render_time_ms: 1200,
          credits_cost: 3,
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:05Z',
        },
        error: null,
      })

      mockOrder.mockResolvedValue({
        data: [
          { position: 0, status: 'completed', output_url: 'http://test.com/0.png', render_time_ms: 300 },
          { position: 1, status: 'completed', output_url: 'http://test.com/1.png', render_time_ms: 400 },
          { position: 2, status: 'completed', output_url: 'http://test.com/2.png', render_time_ms: 350 },
        ],
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.type).toBe('carousel')
      expect(data.slides).toHaveLength(3)
      expect(data.slides[0].position).toBe(0)
      expect(data.slides[0].status).toBe('completed')
      expect(data.slides[0].outputUrl).toBe('http://test.com/0.png')
      expect(data.metadata.slidesCompleted).toBe(3)
      expect(data.metadata.slidesTotal).toBe(3)
    })

    it('should handle partial slide failures', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'carousel',
          status: 'completed',
          output_urls: ['http://test.com/0.png', 'http://test.com/2.png'],
          render_engine: 'satori',
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:05Z',
        },
        error: null,
      })

      mockOrder.mockResolvedValue({
        data: [
          { position: 0, status: 'completed', output_url: 'http://test.com/0.png', render_time_ms: 300 },
          { position: 1, status: 'failed', output_url: null, render_time_ms: 50, error_message: 'Template error' },
          { position: 2, status: 'completed', output_url: 'http://test.com/2.png', render_time_ms: 350 },
        ],
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.slides).toHaveLength(3)
      expect(data.slides[1].status).toBe('failed')
      expect(data.slides[1].error).toBe('Template error')
      expect(data.metadata.slidesCompleted).toBe(2)
      expect(data.metadata.slidesTotal).toBe(3)
    })

    it('should handle carousel with no slides table data', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'carousel',
          status: 'completed',
          output_urls: ['http://test.com/0.png'],
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:05Z',
        },
        error: null,
      })

      mockOrder.mockResolvedValue({ data: [], error: null })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.slides).toBeUndefined()
    })

    it('should handle processing carousel with slide progress', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'carousel',
          status: 'processing',
          created_at: '2024-01-15T10:00:00Z',
        },
        error: null,
      })

      mockOrder.mockResolvedValue({
        data: [
          { position: 0, status: 'completed', output_url: 'http://test.com/0.png', render_time_ms: 300 },
          { position: 1, status: 'processing', output_url: null, render_time_ms: null },
          { position: 2, status: 'pending', output_url: null, render_time_ms: null },
        ],
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.status).toBe('processing')
      expect(data.success).toBeNull()
      expect(data.metadata.slidesCompleted).toBe(1)
      expect(data.metadata.slidesTotal).toBe(3)
    })
  })

  // =====================
  // ERROR HANDLING
  // =====================

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve job status')
    })

    it('should sanitize error details in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      mockSingle.mockRejectedValue(new Error('Internal database details'))

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('An error occurred')
      expect(data.message).not.toContain('database')
    })

    it('should show detailed errors in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      mockSingle.mockRejectedValue(new Error('Detailed error message'))

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.message).toBe('Detailed error message')
    })
  })

  // =====================
  // RESPONSE FORMAT
  // =====================

  describe('Response Format', () => {
    it('should include all required fields', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'completed',
          output_urls: ['http://test.com/1.png'],
          render_engine: 'satori',
          render_time_ms: 500,
          credits_cost: 1,
          created_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:01Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      // Required fields
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('type')
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('completedAt')
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('outputUrls')
      expect(data).toHaveProperty('metadata')
    })

    it('should not expose internal template_id field', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'completed',
          template_id: 'internal-template-id',
          output_urls: ['http://test.com/1.png'],
          created_at: '2024-01-15T10:00:00Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.template_id).toBeUndefined()
      expect(data.templateId).toBeUndefined()
    })

    it('should not expose webhook_url in response', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: validJobId,
          job_type: 'single_image',
          status: 'completed',
          webhook_url: 'https://example.com/webhook',
          output_urls: ['http://test.com/1.png'],
          created_at: '2024-01-15T10:00:00Z',
        },
        error: null,
      })

      const request = createRequest(validJobId)
      const response = await GET(request, { params: createParams(validJobId) })
      const data = await response.json()

      expect(data.webhook_url).toBeUndefined()
      expect(data.webhookUrl).toBeUndefined()
    })
  })
})
