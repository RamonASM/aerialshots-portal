import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createStagingOrder,
  getStagingOrder,
  addStagingItem,
  removeStagingItem,
  updateStagingItemStyle,
  calculateStagingPrice,
  submitStagingOrder,
  getStagingStyles,
  getRoomTypes,
  type StagingOrder,
  type StagingItem,
  type RoomType,
  type FurnitureStyle,
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
      'single', 'maybeSingle', 'rpc'
    ]
    methods.forEach((method) => {
      chain[method] = () => {
        if (method === 'single' || method === 'maybeSingle') {
          return Promise.resolve(finalResult)
        }
        return createNestedChain()
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Virtual Staging Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('Room Types', () => {
    it('should return available room types', () => {
      const rooms = getRoomTypes()

      expect(rooms.length).toBeGreaterThan(0)
      expect(rooms).toContainEqual(
        expect.objectContaining({ id: 'living_room', name: 'Living Room' })
      )
      expect(rooms).toContainEqual(
        expect.objectContaining({ id: 'bedroom', name: 'Bedroom' })
      )
      expect(rooms).toContainEqual(
        expect.objectContaining({ id: 'kitchen', name: 'Kitchen' })
      )
    })
  })

  describe('Furniture Styles', () => {
    it('should return available furniture styles', () => {
      const styles = getStagingStyles()

      expect(styles.length).toBeGreaterThan(0)
      expect(styles).toContainEqual(
        expect.objectContaining({ id: 'modern', name: 'Modern' })
      )
      expect(styles).toContainEqual(
        expect.objectContaining({ id: 'contemporary', name: 'Contemporary' })
      )
      expect(styles).toContainEqual(
        expect.objectContaining({ id: 'traditional', name: 'Traditional' })
      )
    })
  })

  describe('calculateStagingPrice', () => {
    it('should calculate price for single standard photo', () => {
      const result = calculateStagingPrice({
        items: [{ photo_id: 'photo-1', room_type: 'living_room', style: 'modern' }],
      })

      expect(result.per_photo_price).toBe(25)
      expect(result.subtotal).toBe(25)
      expect(result.total).toBe(25)
    })

    it('should calculate price for multiple photos', () => {
      const result = calculateStagingPrice({
        items: [
          { photo_id: 'photo-1', room_type: 'living_room', style: 'modern' },
          { photo_id: 'photo-2', room_type: 'bedroom', style: 'modern' },
          { photo_id: 'photo-3', room_type: 'kitchen', style: 'contemporary' },
        ],
      })

      expect(result.photo_count).toBe(3)
      expect(result.subtotal).toBe(75) // 25 * 3
    })

    it('should apply rush pricing', () => {
      const result = calculateStagingPrice({
        items: [{ photo_id: 'photo-1', room_type: 'living_room', style: 'modern' }],
        is_rush: true,
      })

      expect(result.per_photo_price).toBe(50) // Rush price
      expect(result.total).toBe(50)
    })

    it('should apply bulk discount for 5+ photos', () => {
      const result = calculateStagingPrice({
        items: Array(5).fill({ photo_id: 'photo-1', room_type: 'living_room', style: 'modern' }).map((item, i) => ({ ...item, photo_id: `photo-${i}` })),
      })

      expect(result.photo_count).toBe(5)
      expect(result.discount_percent).toBe(10) // 10% discount
      expect(result.subtotal).toBe(125) // 25 * 5
      expect(result.discount_amount).toBe(12.5) // 10% of 125
      expect(result.total).toBe(112.5) // 125 - 12.5
    })

    it('should apply 15% discount for 10+ photos', () => {
      const result = calculateStagingPrice({
        items: Array(10).fill(null).map((_, i) => ({
          photo_id: `photo-${i}`,
          room_type: 'living_room' as RoomType,
          style: 'modern' as FurnitureStyle,
        })),
      })

      expect(result.discount_percent).toBe(15)
    })
  })

  describe('createStagingOrder', () => {
    it('should create a new staging order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-1',
            listing_id: 'listing-123',
            agent_id: 'agent-1',
            status: 'draft',
            created_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await createStagingOrder({
        listing_id: 'listing-123',
        agent_id: 'agent-1',
      })

      expect(result.success).toBe(true)
      expect(result.order?.status).toBe('draft')
    })

    it('should fail with invalid listing', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { message: 'Listing not found' },
        })
      )

      const result = await createStagingOrder({
        listing_id: 'invalid',
        agent_id: 'agent-1',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('addStagingItem', () => {
    it('should add photo to staging order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'item-1',
            order_id: 'order-1',
            photo_id: 'photo-1',
            room_type: 'living_room',
            furniture_style: 'modern',
            status: 'pending',
          },
          error: null,
        })
      )

      const result = await addStagingItem({
        order_id: 'order-1',
        photo_id: 'photo-1',
        room_type: 'living_room',
        furniture_style: 'modern',
      })

      expect(result.success).toBe(true)
      expect(result.item?.room_type).toBe('living_room')
    })

    it('should prevent duplicate photos in same order', async () => {
      // First mock: check for existing
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: [{ id: 'existing-1', photo_id: 'photo-1' }],
          error: null,
        })
      )

      const result = await addStagingItem({
        order_id: 'order-1',
        photo_id: 'photo-1',
        room_type: 'living_room',
        furniture_style: 'modern',
        check_duplicate: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already')
    })
  })

  describe('removeStagingItem', () => {
    it('should remove photo from staging order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({ error: null })
      )

      const result = await removeStagingItem('order-1', 'item-1')

      expect(result.success).toBe(true)
    })
  })

  describe('updateStagingItemStyle', () => {
    it('should update room type and style', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'item-1',
            room_type: 'bedroom',
            furniture_style: 'traditional',
          },
          error: null,
        })
      )

      const result = await updateStagingItemStyle('item-1', {
        room_type: 'bedroom',
        furniture_style: 'traditional',
      })

      expect(result.success).toBe(true)
      expect(result.item?.room_type).toBe('bedroom')
    })
  })

  describe('getStagingOrder', () => {
    it('should retrieve staging order with items', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-1',
            listing_id: 'listing-123',
            status: 'draft',
            items: [
              { id: 'item-1', photo_id: 'photo-1', room_type: 'living_room' },
              { id: 'item-2', photo_id: 'photo-2', room_type: 'bedroom' },
            ],
          },
          error: null,
        })
      )

      const order = await getStagingOrder('order-1')

      expect(order).not.toBeNull()
      expect(order?.items?.length).toBe(2)
    })

    it('should return null for invalid order', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const order = await getStagingOrder('invalid-id')

      expect(order).toBeNull()
    })
  })

  describe('submitStagingOrder', () => {
    it('should submit order for processing', async () => {
      // First call: get order with items
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'order-1',
            status: 'draft',
            items: [{ id: 'item-1' }],
          },
          error: null,
        })
      )
      // Second call: update status
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'order-1',
            status: 'submitted',
            submitted_at: '2025-01-06T10:00:00Z',
          },
          error: null,
        })
      )

      const result = await submitStagingOrder('order-1')

      expect(result.success).toBe(true)
      expect(result.order?.status).toBe('submitted')
    })

    it('should require at least one item to submit', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'order-1',
            status: 'draft',
            items: [],
          },
          error: null,
        })
      )

      const result = await submitStagingOrder('order-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('item')
    })

    it('should prevent submitting already submitted order', async () => {
      mockSupabaseFrom.mockReturnValueOnce(
        createChain({
          data: {
            id: 'order-1',
            status: 'submitted',
            items: [{ id: 'item-1' }],
          },
          error: null,
        })
      )

      const result = await submitStagingOrder('order-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('already')
    })
  })
})

describe('Staging Turnaround', () => {
  it('should have standard 24h turnaround', () => {
    const result = calculateStagingPrice({
      items: [{ photo_id: 'photo-1', room_type: 'living_room', style: 'modern' }],
    })

    expect(result.turnaround_hours).toBe(24)
  })

  it('should have rush 4h turnaround', () => {
    const result = calculateStagingPrice({
      items: [{ photo_id: 'photo-1', room_type: 'living_room', style: 'modern' }],
      is_rush: true,
    })

    expect(result.turnaround_hours).toBe(4)
  })
})
