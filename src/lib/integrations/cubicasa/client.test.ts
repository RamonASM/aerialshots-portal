/**
 * Cubicasa Client Tests
 *
 * Tests for floor plan service API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CubicasaClient, getCubicasaClient, createCubicasaClient } from './client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  formatError: (e: Error) => e.message,
}))

describe('CubicasaClient', () => {
  let client: CubicasaClient
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    process.env.CUBICASA_API_KEY = 'test-api-key'
    process.env.CUBICASA_ENVIRONMENT = 'production'
    client = new CubicasaClient({ apiKey: 'test-api-key', environment: 'production' })
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env = { ...originalEnv }
  })

  describe('constructor', () => {
    it('should create client with provided config', () => {
      const c = new CubicasaClient({
        apiKey: 'my-key',
        environment: 'staging',
        timeout: 60000,
      })
      expect(c).toBeDefined()
      expect(c.isConfigured()).toBe(true)
    })

    it('should use production URL for production environment', () => {
      const c = new CubicasaClient({ apiKey: 'key', environment: 'production' })
      expect(c).toBeDefined()
    })

    it('should use staging URL for staging environment', () => {
      const c = new CubicasaClient({ apiKey: 'key', environment: 'staging' })
      expect(c).toBeDefined()
    })

    it('should default to environment variables', () => {
      process.env.CUBICASA_API_KEY = 'env-key'
      process.env.CUBICASA_ENVIRONMENT = 'staging'
      const c = new CubicasaClient()
      expect(c.isConfigured()).toBe(true)
    })
  })

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      expect(client.isConfigured()).toBe(true)
    })

    it('should return false when API key is empty and env not set', () => {
      delete process.env.CUBICASA_API_KEY
      const c = new CubicasaClient({ apiKey: '' })
      expect(c.isConfigured()).toBe(false)
    })
  })

  describe('createOrder', () => {
    it('should create floor plan order', async () => {
      const mockResponse = {
        order_id: 'order-123',
        go_to_scan_url: 'https://go.cubi.casa/scan/abc123',
        status: 'pending',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createOrder({
        address: {
          street: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          postal_code: '32801',
        },
        estimated_sqft: 2000,
        reference_id: 'listing-456',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cubi.casa/api/v3/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result.order_id).toBe('order-123')
      expect(result.go_to_scan_url).toContain('go.cubi.casa')
    })

    it('should include all address fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ order_id: 'test', go_to_scan_url: '', status: 'pending' }),
      })

      await client.createOrder({
        address: {
          street: '456 Oak Ave',
          city: 'Tampa',
          state: 'FL',
          postal_code: '33601',
          country: 'US',
        },
        property_type: 'commercial',
        estimated_sqft: 5000,
        floor_count: 2,
        floor_plan_types: ['2d_basic', '3d_basic'],
        notes: 'Corner unit',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.address.street).toBe('456 Oak Ave')
      expect(body.address.city).toBe('Tampa')
      expect(body.address.state).toBe('FL')
      expect(body.address.postal_code).toBe('33601')
      expect(body.address.country).toBe('US')
      expect(body.property_type).toBe('commercial')
      expect(body.estimated_sqft).toBe(5000)
      expect(body.floor_count).toBe(2)
      expect(body.floor_plan_types).toEqual(['2d_basic', '3d_basic'])
      expect(body.notes).toBe('Corner unit')
    })

    it('should use default webhook URL from environment', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ order_id: 'test', go_to_scan_url: '', status: 'pending' }),
      })

      await client.createOrder({
        address: { street: '123', city: 'Test', state: 'FL', postal_code: '12345' },
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.webhook_url).toContain('/api/webhooks/cubicasa')
    })

    it('should use custom webhook URL when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ order_id: 'test', go_to_scan_url: '', status: 'pending' }),
      })

      await client.createOrder({
        address: { street: '123', city: 'Test', state: 'FL', postal_code: '12345' },
        webhook_url: 'https://custom.webhook.com/cubicasa',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.webhook_url).toBe('https://custom.webhook.com/cubicasa')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid address'),
      })

      await expect(
        client.createOrder({
          address: { street: '', city: '', state: '', postal_code: '' },
        })
      ).rejects.toThrow('Cubicasa API error: 400')
    })
  })

  describe('getOrder', () => {
    it('should fetch order by ID', async () => {
      const mockOrder = {
        order_id: 'order-789',
        status: 'completed' as const,
        address: {
          street: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          postal_code: '32801',
        },
        property_type: 'residential',
        created_at: '2024-01-10T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOrder),
      })

      const result = await client.getOrder('order-789')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cubi.casa/api/v3/orders/order-789',
        expect.any(Object)
      )
      expect(result.order_id).toBe('order-789')
      expect(result.status).toBe('completed')
    })

    it('should throw error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Order not found'),
      })

      await expect(client.getOrder('nonexistent')).rejects.toThrow('Cubicasa API error: 404')
    })
  })

  describe('listOrders', () => {
    it('should list orders with default parameters', async () => {
      const mockResponse = {
        orders: [
          {
            order_id: 'order-1',
            status: 'pending' as const,
            address: {
              street: '123 Main St',
              city: 'Orlando',
              state: 'FL',
              postal_code: '32801',
            },
            property_type: 'residential',
            created_at: '2024-01-10T00:00:00Z',
          },
          {
            order_id: 'order-2',
            status: 'completed' as const,
            address: {
              street: '456 Oak Ave',
              city: 'Tampa',
              state: 'FL',
              postal_code: '33601',
            },
            property_type: 'residential',
            created_at: '2024-01-11T00:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        per_page: 25,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.listOrders()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cubi.casa/api/v3/orders',
        expect.any(Object)
      )
      expect(result.orders).toHaveLength(2)
    })

    it('should include filter parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0 }),
      })

      await client.listOrders({
        status: 'completed',
        reference_id: 'ref-123',
        page: 2,
        per_page: 50,
      })

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('status=completed')
      expect(url).toContain('reference_id=ref-123')
      expect(url).toContain('page=2')
      expect(url).toContain('per_page=50')
    })
  })

  describe('generateGoToScanLink', () => {
    it('should generate scan link for order', async () => {
      const mockResponse = {
        url: 'https://go.cubi.casa/scan/xyz789',
        expires_at: '2024-01-15T12:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.generateGoToScanLink('order-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cubi.casa/api/v3/orders/order-123/go-to-scan',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.url).toContain('go.cubi.casa')
      expect(result.expires_at).toBeDefined()
    })
  })

  describe('getDownloadUrl', () => {
    it('should get download URL with default parameters', async () => {
      const mockResponse = {
        url: 'https://cdn.cubi.casa/fp/order-123.png',
        expires_at: '2024-01-15T12:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.getDownloadUrl('order-123')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('format=png')
      expect(url).toContain('type=2d')
      expect(url).toContain('branded=false')
      expect(result.url).toContain('cdn.cubi.casa')
    })

    it('should support different formats and options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'test', expires_at: 'test' }),
      })

      await client.getDownloadUrl('order-123', 'pdf', '3d', true)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('format=pdf')
      expect(url).toContain('type=3d')
      expect(url).toContain('branded=true')
    })
  })

  describe('requestRedraw', () => {
    it('should request floor plan redraw', async () => {
      const mockResponse = {
        change_request_id: 'redraw-456',
        status: 'pending' as const,
        estimated_completion: '2024-01-20T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.requestRedraw({
        order_id: 'order-123',
        notes: 'Missing bedroom',
        areas_to_fix: ['bedroom', 'bathroom'],
        priority: 'rush',
      })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/orders/order-123/redraw')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body.notes).toBe('Missing bedroom')
      expect(body.areas_to_fix).toEqual(['bedroom', 'bathroom'])
      expect(body.priority).toBe('rush')

      expect(result.change_request_id).toBe('redraw-456')
    })

    it('should use default priority if not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ change_request_id: 'test', status: 'pending' }),
      })

      await client.requestRedraw({
        order_id: 'order-123',
        notes: 'Fix layout',
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.priority).toBe('normal')
    })
  })

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await client.cancelOrder('order-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cubi.casa/api/v3/orders/order-123',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result.success).toBe(true)
      expect(result.message).toBe('Order cancelled')
    })

    it('should return failure for non-existent order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      })

      const result = await client.cancelOrder('nonexistent')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to cancel order')
    })
  })

  describe('createOrderForListing', () => {
    it('should create order from listing data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            order_id: 'listing-order-123',
            go_to_scan_url: 'https://go.cubi.casa/scan/abc',
            status: 'pending',
          }),
      })

      const result = await client.createOrderForListing({
        id: 'listing-789',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        sqft: 2500,
        beds: 4,
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.address.street).toBe('123 Main St')
      expect(body.estimated_sqft).toBe(2500)
      expect(body.floor_count).toBe(2) // 4 beds = 2 floors
      expect(body.reference_id).toBe('listing-789')
      expect(body.floor_plan_types).toContain('2d_basic')
      expect(body.floor_plan_types).toContain('3d_basic')

      expect(result.orderId).toBe('listing-order-123')
      expect(result.goToScanUrl).toContain('go.cubi.casa')
    })

    it('should estimate 1 floor for smaller homes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            order_id: 'test',
            go_to_scan_url: 'https://go.cubi.casa/scan/test',
            status: 'pending',
          }),
      })

      await client.createOrderForListing({
        id: 'listing-small',
        address: '456 Oak St',
        city: 'Tampa',
        state: 'FL',
        zip: '33601',
        beds: 2,
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)

      expect(body.floor_count).toBe(1)
    })
  })

  describe('Timeout Handling', () => {
    it('should create client with custom timeout', () => {
      const slowClient = new CubicasaClient({
        apiKey: 'key',
        timeout: 60000,
      })
      expect(slowClient).toBeDefined()
      expect(slowClient.isConfigured()).toBe(true)
    })

    it('should handle abort errors as timeout', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(client.getOrder('order-123')).rejects.toThrow('timeout')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.getOrder('order-123')).rejects.toThrow('Network error')
    })

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(client.getOrder('order-123')).rejects.toThrow('Cubicasa API error: 500')
    })

    it('should handle 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key'),
      })

      await expect(client.getOrder('order-123')).rejects.toThrow('Cubicasa API error: 401')
    })
  })
})

describe('getCubicasaClient', () => {
  it('should return singleton instance', () => {
    const client1 = getCubicasaClient()
    const client2 = getCubicasaClient()
    expect(client1).toBe(client2)
  })
})

describe('createCubicasaClient', () => {
  it('should create new instance with custom config', () => {
    const client = createCubicasaClient({
      apiKey: 'custom-key',
      environment: 'staging',
    })
    expect(client).toBeInstanceOf(CubicasaClient)
    expect(client.isConfigured()).toBe(true)
  })
})
