import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkTosAcceptance,
  acceptTos,
  getTosVersion,
  getUserTosHistory,
  requiresTosAcceptance,
  type TosAcceptance,
  type TosVersion,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Helper to create fully chainable mock
const createChain = (finalResult: unknown) => {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'is', 'in', 'contains',
      'gte', 'gt', 'lt', 'lte',
      'order', 'limit', 'range',
      'single', 'maybeSingle', 'rpc', 'returns'
    ]
    methods.forEach((method) => {
      chain[method] = () => createNestedChain()
    })
    // Terminal methods return a thenable with .returns()
    const terminalMethods = ['single', 'maybeSingle']
    terminalMethods.forEach((method) => {
      chain[method] = () => {
        const result = Promise.resolve(finalResult) as Promise<unknown> & { returns: () => Promise<unknown> }
        result.returns = () => result
        return result
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Terms of Service Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('getTosVersion', () => {
    it('should return current TOS version', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'tos-v1',
            version: '1.0',
            effective_date: '2025-01-01',
            content_hash: 'abc123',
          },
          error: null,
        })
      )

      const version = await getTosVersion()

      expect(version).not.toBeNull()
      expect(version?.version).toBe('1.0')
    })

    it('should return specific version if requested', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'tos-v2',
            version: '2.0',
            effective_date: '2025-06-01',
          },
          error: null,
        })
      )

      const version = await getTosVersion('2.0')

      expect(version?.version).toBe('2.0')
    })
  })

  describe('checkTosAcceptance', () => {
    it('should return true when user has accepted current TOS', async () => {
      // First call: get current TOS version
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { version: '1.0' },
          error: null,
        })
      )
      // Second call: check user acceptance
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'acceptance-1',
            user_email: 'agent@realty.com',
            tos_version: '1.0',
            accepted_at: '2025-01-05T10:00:00Z',
          },
          error: null,
        })
      )

      const hasAccepted = await checkTosAcceptance({
        user_email: 'agent@realty.com',
        listing_id: 'listing-123',
      })

      expect(hasAccepted).toBe(true)
    })

    it('should return false when user has not accepted TOS', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { version: '1.0' },
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const hasAccepted = await checkTosAcceptance({
        user_email: 'newuser@realty.com',
        listing_id: 'listing-123',
      })

      expect(hasAccepted).toBe(false)
    })

    it('should return false when user accepted old TOS version', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { version: '2.0' }, // Current version
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            tos_version: '1.0', // User accepted old version
          },
          error: null,
        })
      )

      const hasAccepted = await checkTosAcceptance({
        user_email: 'agent@realty.com',
        listing_id: 'listing-123',
      })

      expect(hasAccepted).toBe(false)
    })
  })

  describe('acceptTos', () => {
    it('should record TOS acceptance', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { version: '1.0' },
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'acceptance-1',
            user_email: 'agent@realty.com',
            listing_id: 'listing-123',
            tos_version: '1.0',
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            accepted_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await acceptTos({
        user_email: 'agent@realty.com',
        listing_id: 'listing-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      })

      expect(result.success).toBe(true)
      expect(result.acceptance?.tos_version).toBe('1.0')
    })

    it('should record acceptance with optional user name', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { version: '1.0' },
          error: null,
        })
      )
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'acceptance-1',
            user_email: 'agent@realty.com',
            user_name: 'John Agent',
            tos_version: '1.0',
          },
          error: null,
        })
      )

      const result = await acceptTos({
        user_email: 'agent@realty.com',
        user_name: 'John Agent',
        listing_id: 'listing-123',
      })

      expect(result.success).toBe(true)
    })

    it('should fail if no TOS version exists', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const result = await acceptTos({
        user_email: 'agent@realty.com',
        listing_id: 'listing-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('TOS')
    })
  })

  describe('requiresTosAcceptance', () => {
    it('should return true for download actions', async () => {
      const requires = requiresTosAcceptance('download')
      expect(requires).toBe(true)
    })

    it('should return true for bulk download actions', async () => {
      const requires = requiresTosAcceptance('bulk_download')
      expect(requires).toBe(true)
    })

    it('should return true for share actions', async () => {
      const requires = requiresTosAcceptance('share')
      expect(requires).toBe(true)
    })

    it('should return false for view actions', async () => {
      const requires = requiresTosAcceptance('view')
      expect(requires).toBe(false)
    })
  })

  describe('getUserTosHistory', () => {
    it('should return all TOS acceptances for a user', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'acceptance-1',
              tos_version: '1.0',
              accepted_at: '2025-01-01T10:00:00Z',
              listing_id: 'listing-1',
            },
            {
              id: 'acceptance-2',
              tos_version: '1.0',
              accepted_at: '2025-01-05T10:00:00Z',
              listing_id: 'listing-2',
            },
          ],
          error: null,
        })
      )

      const history = await getUserTosHistory('agent@realty.com')

      expect(history.length).toBe(2)
    })

    it('should return empty array for new user', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [],
          error: null,
        })
      )

      const history = await getUserTosHistory('newuser@realty.com')

      expect(history.length).toBe(0)
    })
  })
})

describe('TOS Acceptance Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  it('should handle multiple listings requiring separate acceptance', async () => {
    // Check listing-1: has acceptance
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: { version: '1.0' },
        error: null,
      })
    )
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: {
          listing_id: 'listing-1',
          tos_version: '1.0',
        },
        error: null,
      })
    )

    const hasAcceptedListing1 = await checkTosAcceptance({
      user_email: 'agent@realty.com',
      listing_id: 'listing-1',
    })

    expect(hasAcceptedListing1).toBe(true)

    // Check listing-2: no acceptance
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: { version: '1.0' },
        error: null,
      })
    )
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: null,
        error: { code: 'PGRST116' },
      })
    )

    const hasAcceptedListing2 = await checkTosAcceptance({
      user_email: 'agent@realty.com',
      listing_id: 'listing-2',
    })

    expect(hasAcceptedListing2).toBe(false)
  })

  it('should track consent for compliance purposes', async () => {
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: { version: '1.0' },
        error: null,
      })
    )
    mockSupabaseFrom.mockReturnValueOnce(
      createChain({
        data: {
          id: 'acceptance-1',
          user_email: 'agent@realty.com',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          accepted_at: '2025-01-06T10:00:00Z',
          tos_version: '1.0',
        },
        error: null,
      })
    )

    const result = await acceptTos({
      user_email: 'agent@realty.com',
      listing_id: 'listing-123',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    })

    expect(result.success).toBe(true)
    // IP and user agent should be stored for compliance
    expect(result.acceptance?.ip_address).toBe('192.168.1.1')
    expect(result.acceptance?.user_agent).toBe('Mozilla/5.0')
  })
})
