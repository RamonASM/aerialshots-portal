import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Use vi.hoisted to define mocks before they're used
const { mockVerifyConnectWebhook, mockSyncAccountStatus } = vi.hoisted(() => ({
  mockVerifyConnectWebhook: vi.fn(),
  mockSyncAccountStatus: vi.fn(),
}))

vi.mock('@/lib/payments/stripe-connect', () => ({
  verifyConnectWebhook: mockVerifyConnectWebhook,
  syncAccountStatus: mockSyncAccountStatus,
}))

// Mock Supabase admin with full table support
const mockFrom = vi.fn((table: string) => {
  if (table === 'processed_events') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    }
  }
  if (table === 'staff') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'staff-123' }, error: null })),
      update: vi.fn().mockReturnThis(),
    }
  }
  if (table === 'partners') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn().mockReturnThis(),
    }
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn().mockReturnThis(),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  webhookLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import after mocks
import { POST } from './route'

function createMockRequest(body: string, signature: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/stripe-connect', {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'content-type': 'application/json',
    },
    body,
  })
}

describe('Stripe Connect Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Signature Verification', () => {
    it('returns 400 if signature is missing', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/stripe-connect', {
        method: 'POST',
        body: '{}',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toMatch(/signature/i)
    })

    it('returns 400 if signature verification fails', async () => {
      mockVerifyConnectWebhook.mockReturnValue(null)

      const request = createMockRequest('{}', 'invalid_signature')
      const response = await POST(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toMatch(/verification failed/i)
    })
  })

  describe('account.updated event', () => {
    it('updates database when charges_enabled changes', async () => {
      mockVerifyConnectWebhook.mockReturnValue({
        id: 'evt_123',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_123',
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
            metadata: {
              entity_type: 'staff',
              entity_id: 'staff-123',
            },
          },
        },
      })
      mockSyncAccountStatus.mockResolvedValue(true)

      const request = createMockRequest('{}', 'valid_signature')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSyncAccountStatus).toHaveBeenCalledWith({
        type: 'staff',
        entityId: 'staff-123',
        accountId: 'acct_123',
      })
    })

    it('updates database when payouts_enabled changes', async () => {
      mockVerifyConnectWebhook.mockReturnValue({
        id: 'evt_456',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_456',
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true,
            metadata: {
              entity_type: 'partner',
              entity_id: 'partner-123',
            },
          },
        },
      })
      mockSyncAccountStatus.mockResolvedValue(true)

      const request = createMockRequest('{}', 'valid_signature')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSyncAccountStatus).toHaveBeenCalledWith({
        type: 'partner',
        entityId: 'partner-123',
        accountId: 'acct_456',
      })
    })
  })

  describe('account.application.deauthorized event', () => {
    it('marks account as disconnected', async () => {
      mockVerifyConnectWebhook.mockReturnValue({
        id: 'evt_789',
        type: 'account.application.deauthorized',
        data: {
          object: {
            id: 'acct_789',
          },
        },
        account: 'acct_789',
      })

      const request = createMockRequest('{}', 'valid_signature')
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Unhandled events', () => {
    it('returns 200 for unhandled event types', async () => {
      mockVerifyConnectWebhook.mockReturnValue({
        id: 'evt_999',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      })

      const request = createMockRequest('{}', 'valid_signature')
      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.received).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('returns 500 on sync error', async () => {
      mockVerifyConnectWebhook.mockReturnValue({
        id: 'evt_error',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_error',
            charges_enabled: true,
            payouts_enabled: true,
            metadata: {
              entity_type: 'staff',
              entity_id: 'staff-error',
            },
          },
        },
      })
      mockSyncAccountStatus.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('{}', 'valid_signature')
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
