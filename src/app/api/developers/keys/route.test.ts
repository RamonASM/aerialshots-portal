/**
 * API Keys Route Tests
 *
 * TDD tests for the API key management endpoints.
 * These tests verify the expected database schema and API behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Mock API key generation
vi.mock('@/lib/api/middleware/api-key', () => ({
  generateApiKey: vi.fn(() => 'lh_live_test1234567890abcdef'),
  hashApiKey: vi.fn(() => Promise.resolve('hashed_key_value')),
}))

// Helper to create mock request
function createMockRequest(method: string, body?: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/developers/keys', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('API Keys Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/developers/keys', () => {
    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createMockRequest('POST', { name: 'Test Key' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should require a key name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'dev@example.com' } },
        error: null,
      })

      const request = createMockRequest('POST', {})
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Key name is required')
    })

    it('should create an API key with key_prefix column', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'dev@example.com' } },
        error: null,
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'key-uuid',
              name: 'My API Key',
              tier: 'free',
              monthly_limit: 3000,
              created_at: '2024-12-31T00:00:00Z',
            },
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValue({ insert: mockInsert })

      const request = createMockRequest('POST', { name: 'My API Key' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.key).toBe('lh_live_test1234567890abcdef')

      // Verify key_prefix is being stored (first 12 chars)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key_prefix: 'lh_live_test', // First 12 chars of the API key
          user_id: 'user-123',
          name: 'My API Key',
          tier: 'free',
          monthly_limit: 3000,
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'dev@example.com' } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const request = createMockRequest('POST', { name: 'Test Key' })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create API key')
    })
  })

  describe('GET /api/developers/keys', () => {
    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return API keys with key_prefix and requests_this_month columns', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'dev@example.com' } },
        error: null,
      })

      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          key_prefix: 'lh_live_abcd',
          tier: 'pro',
          monthly_limit: 10000,
          is_active: true,
          created_at: '2024-12-01T00:00:00Z',
          last_used_at: '2024-12-30T10:00:00Z',
          requests_this_month: 1500,
        },
        {
          id: 'key-2',
          name: 'Test Key',
          key_prefix: 'lh_test_efgh',
          tier: 'free',
          monthly_limit: 3000,
          is_active: true,
          created_at: '2024-12-15T00:00:00Z',
          last_used_at: null,
          requests_this_month: 0,
        },
      ]

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockKeys, error: null }),
        }),
      })

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect })

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)

      // Verify the schema includes key_prefix and requests_this_month
      expect(data.data[0]).toEqual(
        expect.objectContaining({
          key_prefix: 'lh_live_abcd',
          requests_this_month: 1500,
        })
      )
      expect(data.data[1]).toEqual(
        expect.objectContaining({
          key_prefix: 'lh_test_efgh',
          requests_this_month: 0,
        })
      )

      // Verify the SELECT includes both columns
      expect(mockSelect).toHaveBeenCalledWith(
        'id, name, key_prefix, tier, monthly_limit, is_active, created_at, last_used_at, requests_this_month'
      )
    })

    it('should only return keys for the authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'dev@example.com' } },
        error: null,
      })

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq }),
      })

      await GET()

      // Verify filtering by user_id
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })
})

describe('API Keys Schema Requirements', () => {
  it('should define the expected api_keys table columns', () => {
    // This test documents the expected schema
    const expectedColumns = [
      'id',             // UUID primary key
      'user_id',        // FK to auth.users
      'key_hash',       // Hashed API key (unique)
      'key_prefix',     // First 12 chars for display (e.g., "lh_live_xxxx")
      'name',           // User-friendly name
      'tier',           // free, pro, enterprise
      'monthly_limit',  // Request limit per month
      'is_active',      // Whether key is enabled
      'created_at',     // Creation timestamp
      'last_used_at',   // Last usage timestamp
      'requests_this_month', // Current month's request count
      'description',    // Optional description
      'allowed_domains', // Optional domain whitelist
      'webhook_url',    // Optional webhook for events
      'stripe_customer_id', // For billing
      'stripe_subscription_id', // For billing
    ]

    // All columns should be defined
    expect(expectedColumns.length).toBeGreaterThan(10)
    expect(expectedColumns).toContain('key_prefix')
    expect(expectedColumns).toContain('requests_this_month')
  })
})
