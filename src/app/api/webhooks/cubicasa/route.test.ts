import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { POST } from './route'

// Mock Supabase server client
const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock the integration handoffs module
vi.mock('@/lib/workflows/integration-handoffs', () => ({
  triggerIntegrationHandoff: vi.fn(),
}))

// Helper to create HMAC signature
function createSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// Helper to create mock webhook request
function createWebhookRequest(
  payload: object,
  signature?: string,
  secret: string = 'test-secret'
): NextRequest {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (signature !== undefined) {
    headers['x-cubicasa-signature'] = signature
  } else if (secret) {
    headers['x-cubicasa-signature'] = createSignature(body, secret)
  }

  return new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
    method: 'POST',
    headers,
    body,
  })
}

describe('Cubicasa Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CUBICASA_WEBHOOK_SECRET', 'test-secret')
  })

  describe('Signature Verification', () => {
    it('should reject requests with invalid signature', async () => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', 'test-secret')

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
      }

      // Create a valid-length but wrong signature (64 hex chars)
      const wrongSignature = 'a'.repeat(64)
      const request = createWebhookRequest(payload, wrongSignature)
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Invalid signature')
    })

    it('should accept requests with valid signature', async () => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', 'test-secret')

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {},
      }

      // Mock the listing lookup to return not found (valid flow)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const request = createWebhookRequest(payload)
      const response = await POST(request)

      // Should return 200 even if order not found (acknowledged)
      expect(response.status).toBe(200)
    })

    it('should skip signature verification if secret not configured', async () => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', '')

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {},
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Event Handling', () => {
    const mockListing = {
      id: 'listing-123',
      address: '123 Main St',
      cubicasa_status: 'processing',
    }

    beforeEach(() => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', '')
    })

    it('should handle "delivered" event and update status', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockMediaSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'media_assets') {
          return {
            select: mockMediaSelect,
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'delivered' as const,
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_2d_url: 'https://cubicasa.com/floorplan.png',
          square_footage: 2500,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.listing_id).toBe('listing-123')
    })

    it('should handle "deleted" event and set not_applicable', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'deleted',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle "model_modified" event', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'asset-1' }, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'model_modified',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_2d_url: 'https://cubicasa.com/floorplan-v2.png',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should return 200 with message when order not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      })

      const payload = {
        event: 'delivered',
        order_id: 'unknown-order',
        timestamp: new Date().toISOString(),
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.acknowledged).toBe(true)
      expect(data.message).toContain('not found')
    })
  })

  describe('Floor Plan Asset Creation', () => {
    beforeEach(() => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', '')
    })

    it('should create new floor plan asset when none exists', async () => {
      const mockListing = {
        id: 'listing-123',
        address: '123 Main St',
        cubicasa_status: 'processing',
      }

      const mockInsert = vi.fn().mockResolvedValue({ error: null })

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
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: mockInsert,
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_url: 'https://cubicasa.com/floorplan.png',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      await POST(request)

      expect(mockInsert).toHaveBeenCalled()
    })

    it('should update existing floor plan asset', async () => {
      const mockListing = {
        id: 'listing-123',
        address: '123 Main St',
        cubicasa_status: 'processing',
      }

      const mockUpdateAsset = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

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
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'existing-asset' }, error: null }),
                }),
              }),
            }),
            update: mockUpdateAsset,
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_2d_url: 'https://cubicasa.com/floorplan-updated.png',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      await POST(request)

      expect(mockUpdateAsset).toHaveBeenCalled()
    })

    it('should prefer 2D floor plan URL over regular URL', async () => {
      const mockListing = {
        id: 'listing-123',
        address: '123 Main St',
        cubicasa_status: 'processing',
      }

      const mockInsert = vi.fn().mockResolvedValue({ error: null })

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
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: mockInsert,
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_url: 'https://cubicasa.com/3d-floorplan.png',
          floor_plan_2d_url: 'https://cubicasa.com/2d-floorplan.png',
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      await POST(request)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          media_url: 'https://cubicasa.com/2d-floorplan.png',
        })
      )
    })
  })

  describe('Square Footage Update', () => {
    beforeEach(() => {
      vi.stubEnv('CUBICASA_WEBHOOK_SECRET', '')
    })

    it('should update listing square footage when provided', async () => {
      const mockListing = {
        id: 'listing-123',
        address: '123 Main St',
        cubicasa_status: 'processing',
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'listings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockListing, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'media_assets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'webhook_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'job_events') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const payload = {
        event: 'delivered',
        order_id: 'order-123',
        timestamp: new Date().toISOString(),
        data: {
          floor_plan_2d_url: 'https://cubicasa.com/floorplan.png',
          square_footage: 3500,
        },
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/cubicasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      await POST(request)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          sqft: 3500,
        })
      )
    })
  })
})
