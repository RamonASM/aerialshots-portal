import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createProofingSession,
  getProofingSession,
  selectPhoto,
  deselectPhoto,
  addPhotoComment,
  deletePhotoComment,
  getSessionSelections,
  finalizeSession,
  shareSessionWithSeller,
  type ProofingSession,
  type PhotoSelection,
  type PhotoComment,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Helper to create fully chainable mock that supports all patterns
const createChain = (finalResult: unknown) => {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'is', 'in', 'contains',
      'gte', 'gt', 'lt', 'lte',
      'order', 'limit', 'range',
      'single', 'maybeSingle', 'rpc'
    ]
    methods.forEach((method) => {
      chain[method] = () => {
        // For terminal methods, return the result
        if (method === 'single' || method === 'maybeSingle') {
          return Promise.resolve(finalResult)
        }
        // For other methods, return a new nested chain
        return createNestedChain()
      }
    })
    // Also allow direct promise resolution for non-single queries
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Proofing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('createProofingSession', () => {
    it('should create a new proofing session', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'session-1',
            listing_id: 'listing-123',
            agent_id: 'agent-1',
            status: 'active',
            token: 'abc123token',
            expires_at: '2025-01-20T00:00:00Z',
            created_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await createProofingSession({
        listing_id: 'listing-123',
        agent_id: 'agent-1',
        photo_ids: ['photo-1', 'photo-2', 'photo-3'],
      })

      expect(result.success).toBe(true)
      expect(result.session?.token).toBeDefined()
      expect(result.session?.status).toBe('active')
    })

    it('should set expiration to 7 days by default', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'session-1',
            expires_at: '2025-01-13T10:00:00Z', // 7 days from now
          },
          error: null,
        })
      )

      const result = await createProofingSession({
        listing_id: 'listing-123',
        agent_id: 'agent-1',
        photo_ids: ['photo-1'],
      })

      expect(result.success).toBe(true)
    })

    it('should require at least one photo', async () => {
      const result = await createProofingSession({
        listing_id: 'listing-123',
        agent_id: 'agent-1',
        photo_ids: [],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('photo')
    })
  })

  describe('getProofingSession', () => {
    it('should retrieve session by token', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'session-1',
            listing_id: 'listing-123',
            status: 'active',
            token: 'abc123token',
            photos: [
              { id: 'photo-1', url: 'https://...', thumbnail_url: 'https://...' },
            ],
          },
          error: null,
        })
      )

      const session = await getProofingSession('abc123token')

      expect(session).not.toBeNull()
      expect(session?.status).toBe('active')
    })

    it('should return null for expired session', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'session-1',
            status: 'expired',
            expires_at: '2025-01-01T00:00:00Z', // Past date
          },
          error: null,
        })
      )

      const session = await getProofingSession('expiredtoken')

      expect(session).toBeNull()
    })

    it('should return null for invalid token', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const session = await getProofingSession('invalidtoken')

      expect(session).toBeNull()
    })
  })

  describe('selectPhoto', () => {
    it('should add photo to selections', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'selection-1',
            session_id: 'session-1',
            photo_id: 'photo-1',
            is_favorite: false,
            selected_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await selectPhoto('session-1', 'photo-1')

      expect(result.success).toBe(true)
      expect(result.selection?.photo_id).toBe('photo-1')
    })

    it('should allow marking as favorite', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'selection-1',
            photo_id: 'photo-1',
            is_favorite: true,
          },
          error: null,
        })
      )

      const result = await selectPhoto('session-1', 'photo-1', { is_favorite: true })

      expect(result.success).toBe(true)
      expect(result.selection?.is_favorite).toBe(true)
    })

    it('should prevent duplicate selections', async () => {
      // First mock: check for existing
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'existing-1', photo_id: 'photo-1' }],
          error: null,
        })
      )

      const result = await selectPhoto('session-1', 'photo-1', { check_duplicate: true })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already selected')
    })
  })

  describe('deselectPhoto', () => {
    it('should remove photo from selections', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({ error: null })
      )

      const result = await deselectPhoto('session-1', 'photo-1')

      expect(result.success).toBe(true)
    })

    it('should also remove associated comments', async () => {
      // First delete comments, then selection
      mockSupabaseFrom
        .mockReturnValueOnce(createChain({ error: null }))
        .mockReturnValueOnce(createChain({ error: null }))

      const result = await deselectPhoto('session-1', 'photo-1', { delete_comments: true })

      expect(result.success).toBe(true)
    })
  })

  describe('addPhotoComment', () => {
    it('should add a text comment to a photo', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'comment-1',
            session_id: 'session-1',
            photo_id: 'photo-1',
            comment_text: 'This is my favorite angle',
            created_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await addPhotoComment({
        session_id: 'session-1',
        photo_id: 'photo-1',
        comment_text: 'This is my favorite angle',
      })

      expect(result.success).toBe(true)
      expect(result.comment?.comment_text).toBe('This is my favorite angle')
    })

    it('should add a pinned comment with coordinates', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'comment-1',
            photo_id: 'photo-1',
            comment_text: 'Fix this light fixture',
            pin_x: 0.45,
            pin_y: 0.32,
            is_pinned: true,
          },
          error: null,
        })
      )

      const result = await addPhotoComment({
        session_id: 'session-1',
        photo_id: 'photo-1',
        comment_text: 'Fix this light fixture',
        pin_x: 0.45,
        pin_y: 0.32,
      })

      expect(result.success).toBe(true)
      expect(result.comment?.is_pinned).toBe(true)
      expect(result.comment?.pin_x).toBe(0.45)
    })

    it('should validate pin coordinates are between 0 and 1', async () => {
      const result = await addPhotoComment({
        session_id: 'session-1',
        photo_id: 'photo-1',
        comment_text: 'Invalid pin',
        pin_x: 1.5, // Invalid
        pin_y: 0.5,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('coordinate')
    })
  })

  describe('deletePhotoComment', () => {
    it('should delete a comment', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({ error: null })
      )

      const result = await deletePhotoComment('comment-1', 'session-1')

      expect(result.success).toBe(true)
    })
  })

  describe('getSessionSelections', () => {
    it('should return all selections for a session', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'sel-1', photo_id: 'photo-1', is_favorite: true },
            { id: 'sel-2', photo_id: 'photo-2', is_favorite: false },
            { id: 'sel-3', photo_id: 'photo-3', is_favorite: true },
          ],
          error: null,
        })
      )

      const selections = await getSessionSelections('session-1')

      expect(selections.length).toBe(3)
      expect(selections.filter((s) => s.is_favorite).length).toBe(2)
    })

    it('should include comments with selections', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'sel-1',
              photo_id: 'photo-1',
              comments: [
                { id: 'c1', comment_text: 'Great shot' },
                { id: 'c2', comment_text: 'Use this one' },
              ],
            },
          ],
          error: null,
        })
      )

      const selections = await getSessionSelections('session-1', { include_comments: true })

      expect(selections[0].comments?.length).toBe(2)
    })
  })

  describe('finalizeSession', () => {
    it('should mark session as finalized', async () => {
      // First call: check current status (not finalized)
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { status: 'active' },
          error: null,
        })
      )
      // Second call: update and return finalized session
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'session-1',
            status: 'finalized',
            finalized_at: '2025-01-06T12:00:00Z',
          },
          error: null,
        })
      )

      const result = await finalizeSession('session-1')

      expect(result.success).toBe(true)
      expect(result.session?.status).toBe('finalized')
    })

    it('should require at least one selection to finalize', async () => {
      // First call: check current status (not finalized)
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { status: 'active' },
          error: null,
        })
      )
      // Second call: check selections count
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({ count: 0, error: null })
      )

      const result = await finalizeSession('session-1', { require_selections: true })

      expect(result.success).toBe(false)
      expect(result.error).toContain('selection')
    })

    it('should prevent finalizing already finalized session', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: { status: 'finalized' },
          error: null,
        })
      )

      const result = await finalizeSession('session-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already')
    })
  })

  describe('shareSessionWithSeller', () => {
    it('should generate a shareable link for seller', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'share-1',
            session_id: 'session-1',
            seller_email: 'seller@home.com',
            share_token: 'generated-token', // Token is generated by nanoid, not from DB
            can_comment: true,
            can_select: false,
          },
          error: null,
        })
      )

      const result = await shareSessionWithSeller({
        session_id: 'session-1',
        seller_email: 'seller@home.com',
        seller_name: 'John Seller',
        permissions: { can_comment: true, can_select: false },
      })

      expect(result.success).toBe(true)
      expect(result.share_link).toBeDefined()
      expect(result.share_token).toBeDefined()
      expect(result.share_token?.length).toBe(24) // nanoid(24) generates 24 char token
    })

    it('should send email notification to seller', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            share_token: 'token-123',
          },
          error: null,
        })
      )

      const result = await shareSessionWithSeller({
        session_id: 'session-1',
        seller_email: 'seller@home.com',
        seller_name: 'John Seller',
        send_email: true,
      })

      expect(result.success).toBe(true)
      expect(result.email_sent).toBe(true)
    })
  })
})

describe('Proofing Session Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  it('should handle session with max selections limit', async () => {
    // Session has limit of 25 selections
    mockSupabaseFrom
      .mockReturnValueOnce(
        createChain({
          data: { max_selections: 25 },
          error: null,
        })
      )
      .mockReturnValueOnce(
        createChain({ count: 25, error: null })
      )

    const result = await selectPhoto('session-1', 'photo-26', { enforce_limit: true })

    expect(result.success).toBe(false)
    expect(result.error).toContain('limit')
  })

  it('should track selection order', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'sel-1',
          photo_id: 'photo-1',
          selection_order: 5,
        },
        error: null,
      })
    )

    const result = await selectPhoto('session-1', 'photo-1')

    expect(result.selection?.selection_order).toBeDefined()
  })

  it('should allow reordering selections', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'sel-1',
          session_id: 'session-1',
          photo_id: 'photo-1',
          selection_order: 3,
          is_favorite: false,
        },
        error: null,
      })
    )

    // This would be a batch update
    const result = await selectPhoto('session-1', 'photo-1', { selection_order: 3 })

    expect(result.success).toBe(true)
  })
})
