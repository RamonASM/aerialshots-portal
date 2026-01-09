import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  generateStagedImage,
  getStagingStyles,
  getRoomTypes,
  getStagingStatus,
  getStagingHistory,
  retryStaging,
  estimateStagingCost,
  type StagingRequest,
  type StagingResult,
  type StagingStyle,
  type RoomType,
  type StagingProvider,
} from './client'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
    storage: {
      from: () => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'staged/image.png' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/staged/image.png' } })),
      }),
    },
  }),
}))

// Mock AI provider (generic interface)
vi.mock('./providers/gemini', () => ({
  generateWithGemini: vi.fn(() =>
    Promise.resolve({
      success: true,
      imageBase64: 'dGVzdC1pbWFnZS1kYXRh', // base64 encoded test data
      imageUrl: 'https://ai.example.com/staged/result.png',
      processingTime: 12500,
      provider: 'gemini',
      status: 'success',
    })
  ),
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

describe('Virtual Staging AI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('generateStagedImage', () => {
    it('should generate a staged image from empty room', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            original_url: 'https://example.com/empty-room.jpg',
            staged_url: 'https://example.com/staged-room.jpg',
            status: 'completed',
            room_type: 'living_room',
            style: 'modern',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/empty-room.jpg',
        room_type: 'living_room',
        style: 'modern',
      })

      expect(result.success).toBe(true)
      expect(result.staged_url).toBeDefined()
    })

    it('should support different room types', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            room_type: 'bedroom',
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/empty-bedroom.jpg',
        room_type: 'bedroom',
        style: 'contemporary',
      })

      expect(result.success).toBe(true)
    })

    it('should support different furniture styles', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            style: 'scandinavian',
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/room.jpg',
        room_type: 'living_room',
        style: 'scandinavian',
      })

      expect(result.success).toBe(true)
    })

    it('should handle rush processing', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            is_rush: true,
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/room.jpg',
        room_type: 'living_room',
        style: 'modern',
        rush: true,
      })

      expect(result.success).toBe(true)
    })

    it('should support custom furniture placement hints', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            status: 'completed',
            placement_hints: ['sofa against wall', 'coffee table center'],
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/room.jpg',
        room_type: 'living_room',
        style: 'modern',
        placement_hints: ['sofa against wall', 'coffee table center'],
      })

      expect(result.success).toBe(true)
    })

    it('should allow selecting specific furniture items', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            furniture_items: ['sofa', 'coffee_table', 'floor_lamp', 'rug'],
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/room.jpg',
        room_type: 'living_room',
        style: 'modern',
        furniture_items: ['sofa', 'coffee_table', 'floor_lamp', 'rug'],
      })

      expect(result.success).toBe(true)
    })

    it('should support multiple AI providers', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            provider: 'gemini',
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/room.jpg',
        room_type: 'living_room',
        style: 'modern',
        provider: 'gemini',
      })

      expect(result.success).toBe(true)
    })

    it('should handle object removal before staging', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            remove_existing: true,
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await generateStagedImage({
        image_url: 'https://example.com/cluttered-room.jpg',
        room_type: 'living_room',
        style: 'modern',
        remove_existing_furniture: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getStagingStyles', () => {
    it('should return available staging styles', async () => {
      const styles = await getStagingStyles()

      expect(styles.length).toBeGreaterThan(0)
      expect(styles.some((s) => s.id === 'modern')).toBe(true)
      expect(styles.some((s) => s.id === 'contemporary')).toBe(true)
    })

    it('should include style previews', async () => {
      const styles = await getStagingStyles()

      expect(styles[0].preview_url).toBeDefined()
      expect(styles[0].name).toBeDefined()
    })

    it('should filter by room type compatibility', async () => {
      const styles = await getStagingStyles({ room_type: 'bedroom' })

      expect(styles.every((s) => s.compatible_rooms?.includes('bedroom'))).toBe(true)
    })
  })

  describe('getRoomTypes', () => {
    it('should return available room types', async () => {
      const rooms = await getRoomTypes()

      expect(rooms.length).toBeGreaterThan(0)
      expect(rooms.some((r) => r.id === 'living_room')).toBe(true)
      expect(rooms.some((r) => r.id === 'bedroom')).toBe(true)
      expect(rooms.some((r) => r.id === 'kitchen')).toBe(true)
    })

    it('should include furniture options per room', async () => {
      const rooms = await getRoomTypes()

      const livingRoom = rooms.find((r) => r.id === 'living_room')
      expect(livingRoom?.furniture_options).toBeDefined()
      expect(livingRoom?.furniture_options?.length).toBeGreaterThan(0)
    })
  })

  describe('getStagingStatus', () => {
    it('should return staging job status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            status: 'processing',
            progress: 65,
            estimated_completion: '2025-01-15T10:05:00',
          },
          error: null,
        })
      )

      const result = await getStagingStatus('staging-1')

      expect(result).not.toBeNull()
      expect(result?.status).toBe('processing')
      expect(result?.progress).toBe(65)
    })

    it('should return completed status with result URL', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            status: 'completed',
            staged_url: 'https://example.com/staged-result.jpg',
          },
          error: null,
        })
      )

      const result = await getStagingStatus('staging-1')

      expect(result?.status).toBe('completed')
      expect(result?.staged_url).toBeDefined()
    })

    it('should return failed status with error', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            status: 'failed',
            error_message: 'Could not detect room boundaries',
          },
          error: null,
        })
      )

      const result = await getStagingStatus('staging-1')

      expect(result?.status).toBe('failed')
      expect(result?.error_message).toBeDefined()
    })
  })

  describe('getStagingHistory', () => {
    it('should return staging history for a listing', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'staging-1', room_type: 'living_room', created_at: '2025-01-15' },
            { id: 'staging-2', room_type: 'bedroom', created_at: '2025-01-14' },
          ],
          error: null,
        })
      )

      const result = await getStagingHistory('listing-1')

      expect(result.length).toBe(2)
    })

    it('should filter by status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'staging-1', status: 'completed' },
          ],
          error: null,
        })
      )

      const result = await getStagingHistory('listing-1', { status: 'completed' })

      expect(result.every((s) => s.status === 'completed')).toBe(true)
    })
  })

  describe('retryStaging', () => {
    it('should retry a failed staging job', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: {
              id: 'staging-1',
              status: 'failed',
              original_url: 'https://example.com/room.jpg',
              room_type: 'living_room',
              style: 'modern',
            },
            error: null,
          })
        )
        .mockReturnValue(
          createChain({
            data: {
              id: 'staging-2',
              status: 'processing',
            },
            error: null,
          })
        )

      const result = await retryStaging('staging-1')

      expect(result.success).toBe(true)
      expect(result.new_staging_id).toBeDefined()
    })

    it('should not retry non-failed jobs', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'staging-1',
            status: 'completed',
          },
          error: null,
        })
      )

      const result = await retryStaging('staging-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('only retry')
    })
  })

  describe('estimateStagingCost', () => {
    it('should estimate cost for standard staging', () => {
      const cost = estimateStagingCost({
        room_type: 'living_room',
        style: 'modern',
        rush: false,
      })

      expect(cost.base_price).toBe(25)
      expect(cost.total).toBe(25)
    })

    it('should add rush fee for expedited processing', () => {
      const cost = estimateStagingCost({
        room_type: 'living_room',
        style: 'modern',
        rush: true,
      })

      expect(cost.rush_fee).toBe(25)
      expect(cost.total).toBe(50)
    })

    it('should apply bulk discount for multiple rooms', () => {
      const cost = estimateStagingCost({
        room_type: 'living_room',
        style: 'modern',
        quantity: 5,
      })

      expect(cost.discount).toBeGreaterThan(0)
      expect(cost.total).toBeLessThan(25 * 5)
    })

    it('should include object removal fee if requested', () => {
      const cost = estimateStagingCost({
        room_type: 'living_room',
        style: 'modern',
        remove_existing: true,
      })

      expect(cost.removal_fee).toBe(10)
      expect(cost.total).toBe(35)
    })
  })
})

describe('Virtual Staging Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle invalid image URL', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Invalid image URL' },
      })
    )

    const result = await generateStagedImage({
      image_url: 'invalid-url',
      room_type: 'living_room',
      style: 'modern',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle AI provider timeout', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'AI provider timed out' },
      })
    )

    const result = await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'living_room',
      style: 'modern',
    })

    expect(result.success).toBe(false)
  })

  it('should handle unsupported room detection', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: null,
        error: { message: 'Could not identify room type' },
      })
    )

    const result = await generateStagedImage({
      image_url: 'https://example.com/outdoor.jpg',
      room_type: 'living_room',
      style: 'modern',
    })

    expect(result.success).toBe(false)
  })
})
