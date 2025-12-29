import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, POST } from './route'

// Mock Supabase server client
const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock auth middleware
vi.mock('@/lib/middleware/auth', () => ({
  requireStaff: vi.fn(() => Promise.resolve({
    user: { id: 'test-user-id', email: 'staff@aerialshots.media' },
    staff: { id: 'test-staff-id', email: 'staff@aerialshots.media', role: 'admin' },
  })),
}))

// Mock rate limiting
vi.mock('@/lib/utils/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 29, resetTime: Date.now() + 60000, current: 1 })),
  getRateLimitHeaders: vi.fn(() => ({})),
}))

// Helper to create mock request
function createMockRequest(
  method: string,
  body?: object,
  url = 'http://localhost:3000/api/admin/listings/test-id/integration'
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request
}

// Helper to create mock params
function createMockParams(id: string = 'test-listing-id') {
  return Promise.resolve({ id })
}

describe('Integration Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/listings/[id]/integration', () => {
    it('should return integration statuses for a listing', async () => {
      const mockListing = {
        id: 'test-listing-id',
        fotello_status: 'processing',
        fotello_job_id: 'fotello-123',
        cubicasa_status: 'delivered',
        cubicasa_order_id: 'cubicasa-456',
        zillow_3d_status: 'pending',
        zillow_3d_id: null,
        integration_error_message: null,
        last_integration_check: '2024-12-27T10:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: createMockParams() })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integrations).toBeDefined()
      expect(data.integrations.fotello.status).toBe('processing')
      expect(data.integrations.cubicasa.status).toBe('delivered')
      expect(data.integrations.zillow_3d.status).toBe('pending')
    })

    it('should return 404 if listing not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const request = createMockRequest('GET')
      const response = await GET(request, { params: createMockParams('non-existent') })

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/admin/listings/[id]/integration', () => {
    it('should update fotello status successfully', async () => {
      const mockListing = {
        id: 'test-listing-id',
        fotello_status: 'pending',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { ...mockListing, fotello_status: 'processing' }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const request = createMockRequest('PATCH', {
        integration: 'fotello',
        status: 'processing',
      })
      const response = await PATCH(request, { params: createMockParams() })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject invalid integration type', async () => {
      const request = createMockRequest('PATCH', {
        integration: 'invalid_type',
        status: 'processing',
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid integration type')
    })

    it('should reject invalid status for integration', async () => {
      const request = createMockRequest('PATCH', {
        integration: 'fotello',
        status: 'invalid_status',
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid status')
    })

    it('should accept zillow_3d specific statuses', async () => {
      const mockListing = {
        id: 'test-listing-id',
        zillow_3d_status: 'pending',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { ...mockListing, zillow_3d_status: 'scheduled' }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const request = createMockRequest('PATCH', {
        integration: 'zillow_3d',
        status: 'scheduled', // Zillow-specific status
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(200)
    })

    it('should update external_id when provided', async () => {
      const mockListing = {
        id: 'test-listing-id',
        cubicasa_status: 'pending',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { ...mockListing, cubicasa_status: 'ordered', cubicasa_order_id: 'cubicasa-order-789' }, error: null }),
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const request = createMockRequest('PATCH', {
        integration: 'cubicasa',
        status: 'ordered',
        external_id: 'cubicasa-order-789',
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/admin/listings/[id]/integration', () => {
    it('should handle cubicasa order request successfully', async () => {
      const mockListing = {
        id: 'test-listing-id',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        lat: 28.5383,
        lng: -81.3792,
        sqft: 2500,
        cubicasa_status: 'pending',
      }

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const request = createMockRequest('POST', {
        integration: 'cubicasa',
      })
      const response = await POST(request, { params: createMockParams() })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.status).toBe('ordered')
    })

    it('should reject unknown integration for ordering', async () => {
      const request = createMockRequest('POST', {
        integration: 'unknown_service',
      })
      const response = await POST(request, { params: createMockParams() })

      expect(response.status).toBe(400)
    })

    it('should return manual action for fotello', async () => {
      const mockListing = {
        id: 'test-listing-id',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        lat: 28.5383,
        lng: -81.3792,
        sqft: 2500,
        fotello_status: 'pending',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      })

      const request = createMockRequest('POST', {
        integration: 'fotello',
      })
      const response = await POST(request, { params: createMockParams() })
      const data = await response.json()

      // Fotello returns 400 with action: manual since no API is available
      expect(response.status).toBe(400)
      expect(data.action).toBe('manual')
    })
  })
})

// Helper to create proper mock for status updates
function createStatusUpdateMock(mockListing: object) {
  return (table: string) => {
    if (table === 'listings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
            }),
          }),
        }),
      }
    }
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
  }
}

describe('Integration Status Validation', () => {
  describe('Fotello statuses', () => {
    const validFotelloStatuses = [
      'pending',
      'ordered',
      'processing',
      'delivered',
      'needs_manual',
      'failed',
      'not_applicable',
    ]

    it.each(validFotelloStatuses)('should accept "%s" as valid fotello status', async (status) => {
      const mockListing = { id: 'test-id', fotello_status: 'pending' }
      mockSupabaseClient.from.mockImplementation(createStatusUpdateMock(mockListing))

      const request = createMockRequest('PATCH', {
        integration: 'fotello',
        status,
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(200)
    })
  })

  describe('Cubicasa statuses', () => {
    const validCubicasaStatuses = [
      'pending',
      'ordered',
      'processing',
      'delivered',
      'failed',
      'not_applicable',
    ]

    it.each(validCubicasaStatuses)('should accept "%s" as valid cubicasa status', async (status) => {
      const mockListing = { id: 'test-id', cubicasa_status: 'pending' }
      mockSupabaseClient.from.mockImplementation(createStatusUpdateMock(mockListing))

      const request = createMockRequest('PATCH', {
        integration: 'cubicasa',
        status,
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(200)
    })
  })

  describe('Zillow 3D statuses', () => {
    const validZillow3DStatuses = [
      'pending',
      'scheduled',
      'scanned',
      'processing',
      'live',
      'failed',
      'not_applicable',
    ]

    it.each(validZillow3DStatuses)('should accept "%s" as valid zillow_3d status', async (status) => {
      const mockListing = { id: 'test-id', zillow_3d_status: 'pending' }
      mockSupabaseClient.from.mockImplementation(createStatusUpdateMock(mockListing))

      const request = createMockRequest('PATCH', {
        integration: 'zillow_3d',
        status,
      })
      const response = await PATCH(request, { params: createMockParams() })

      expect(response.status).toBe(200)
    })
  })
})
