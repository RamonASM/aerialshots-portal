import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateEditPrice,
  getEditTypePrice,
  getRevisionAllowance,
  trackRevisionUsage,
  isWithinFreeRevisions,
  getBulkEditDiscount,
  getEstimatedTurnaround,
  type EditType,
  type EditPriceResult,
  type RevisionAllowance,
} from './pricing'

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

describe('Edit Request Pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('getEditTypePrice', () => {
    it('should return base price for sky replacement', () => {
      const price = getEditTypePrice('sky_replacement')
      expect(price).toBe(15)
    })

    it('should return base price for object removal', () => {
      const price = getEditTypePrice('object_removal')
      expect(price).toBe(20)
    })

    it('should return base price for virtual twilight', () => {
      const price = getEditTypePrice('virtual_twilight')
      expect(price).toBe(25)
    })

    it('should return base price for color correction', () => {
      const price = getEditTypePrice('color_correction')
      expect(price).toBe(15)
    })

    it('should return base price for grass green enhancement', () => {
      const price = getEditTypePrice('grass_green')
      expect(price).toBe(10)
    })

    it('should return base price for fire replacement', () => {
      const price = getEditTypePrice('fire_replacement')
      expect(price).toBe(20)
    })

    it('should return base price for TV screen replacement', () => {
      const price = getEditTypePrice('tv_screen')
      expect(price).toBe(15)
    })

    it('should return base price for advanced retouching', () => {
      const price = getEditTypePrice('advanced_retouch')
      expect(price).toBe(50)
    })
  })

  describe('calculateEditPrice', () => {
    it('should calculate price for single edit on single photo', () => {
      const result = calculateEditPrice({
        edits: [{ photo_id: 'photo-1', edit_type: 'sky_replacement' }],
      })

      expect(result.subtotal).toBe(15)
      expect(result.total).toBe(15)
      expect(result.items.length).toBe(1)
    })

    it('should calculate price for multiple edits on single photo', () => {
      const result = calculateEditPrice({
        edits: [
          { photo_id: 'photo-1', edit_type: 'sky_replacement' },
          { photo_id: 'photo-1', edit_type: 'object_removal' },
        ],
      })

      expect(result.subtotal).toBe(35) // 15 + 20
      expect(result.total).toBe(35)
    })

    it('should calculate price for edits on multiple photos', () => {
      const result = calculateEditPrice({
        edits: [
          { photo_id: 'photo-1', edit_type: 'sky_replacement' },
          { photo_id: 'photo-2', edit_type: 'sky_replacement' },
          { photo_id: 'photo-3', edit_type: 'sky_replacement' },
        ],
      })

      expect(result.subtotal).toBe(45) // 15 * 3
      expect(result.photo_count).toBe(3)
    })

    it('should apply rush fee for urgent requests', () => {
      const result = calculateEditPrice({
        edits: [{ photo_id: 'photo-1', edit_type: 'sky_replacement' }],
        is_rush: true,
      })

      expect(result.rush_fee).toBe(7.5) // 50% of subtotal
      expect(result.total).toBe(22.5) // 15 + 7.5
    })

    it('should include itemized breakdown', () => {
      const result = calculateEditPrice({
        edits: [
          { photo_id: 'photo-1', edit_type: 'sky_replacement' },
          { photo_id: 'photo-1', edit_type: 'grass_green' },
        ],
      })

      expect(result.items).toEqual([
        { photo_id: 'photo-1', edit_type: 'sky_replacement', price: 15 },
        { photo_id: 'photo-1', edit_type: 'grass_green', price: 10 },
      ])
    })
  })

  describe('getBulkEditDiscount', () => {
    it('should apply no discount for less than 5 photos', () => {
      const discount = getBulkEditDiscount(4)
      expect(discount).toBe(0)
    })

    it('should apply 10% discount for 5-9 photos', () => {
      const discount = getBulkEditDiscount(5)
      expect(discount).toBe(0.10)
    })

    it('should apply 15% discount for 10-19 photos', () => {
      const discount = getBulkEditDiscount(10)
      expect(discount).toBe(0.15)
    })

    it('should apply 20% discount for 20+ photos', () => {
      const discount = getBulkEditDiscount(20)
      expect(discount).toBe(0.20)
    })
  })

  describe('calculateEditPrice with bulk discount', () => {
    it('should apply bulk discount for 5+ photos with same edit', () => {
      const result = calculateEditPrice({
        edits: [
          { photo_id: 'photo-1', edit_type: 'sky_replacement' },
          { photo_id: 'photo-2', edit_type: 'sky_replacement' },
          { photo_id: 'photo-3', edit_type: 'sky_replacement' },
          { photo_id: 'photo-4', edit_type: 'sky_replacement' },
          { photo_id: 'photo-5', edit_type: 'sky_replacement' },
        ],
        apply_bulk_discount: true,
      })

      expect(result.subtotal).toBe(75) // 15 * 5
      expect(result.discount_amount).toBe(7.5) // 10% of 75
      expect(result.total).toBe(67.5) // 75 - 7.5
    })
  })
})

describe('Revision Allowance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('getRevisionAllowance', () => {
    it('should return default allowance of 2 free revisions', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-1',
            revision_count: 0,
            max_free_revisions: 2,
          },
          error: null,
        })
      )

      const allowance = await getRevisionAllowance('order-1')

      expect(allowance.free_revisions).toBe(2)
      expect(allowance.used_revisions).toBe(0)
      expect(allowance.remaining_free).toBe(2)
    })

    it('should calculate remaining free revisions correctly', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-1',
            revision_count: 1,
            max_free_revisions: 2,
          },
          error: null,
        })
      )

      const allowance = await getRevisionAllowance('order-1')

      expect(allowance.remaining_free).toBe(1)
    })

    it('should show zero remaining when all free revisions used', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'order-1',
            revision_count: 2,
            max_free_revisions: 2,
          },
          error: null,
        })
      )

      const allowance = await getRevisionAllowance('order-1')

      expect(allowance.remaining_free).toBe(0)
    })
  })

  describe('isWithinFreeRevisions', () => {
    it('should return true when revisions are available', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            revision_count: 1,
            max_free_revisions: 2,
          },
          error: null,
        })
      )

      const isFree = await isWithinFreeRevisions('order-1')
      expect(isFree).toBe(true)
    })

    it('should return false when all free revisions used', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            revision_count: 2,
            max_free_revisions: 2,
          },
          error: null,
        })
      )

      const isFree = await isWithinFreeRevisions('order-1')
      expect(isFree).toBe(false)
    })
  })

  describe('trackRevisionUsage', () => {
    it('should increment revision count', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: { revision_count: 0 },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { revision_count: 1 },
            error: null,
          })
        )

      const result = await trackRevisionUsage('order-1')

      expect(result.success).toBe(true)
      expect(result.new_count).toBe(1)
    })

    it('should indicate when transitioning to paid revisions', async () => {
      mockSupabaseFrom
        .mockReturnValueOnce(
          createChain({
            data: { revision_count: 1, max_free_revisions: 2 },
            error: null,
          })
        )
        .mockReturnValueOnce(
          createChain({
            data: { revision_count: 2 },
            error: null,
          })
        )

      const result = await trackRevisionUsage('order-1')

      expect(result.success).toBe(true)
      expect(result.now_requires_payment).toBe(true)
    })
  })
})

describe('Estimated Turnaround', () => {
  it('should return standard turnaround for basic edits', () => {
    const turnaround = getEstimatedTurnaround({
      edits: [{ photo_id: 'photo-1', edit_type: 'sky_replacement' }],
    })

    expect(turnaround.hours).toBe(24)
    expect(turnaround.business_days).toBe(1)
  })

  it('should return rush turnaround when rush requested', () => {
    const turnaround = getEstimatedTurnaround({
      edits: [{ photo_id: 'photo-1', edit_type: 'sky_replacement' }],
      is_rush: true,
    })

    expect(turnaround.hours).toBe(4)
  })

  it('should increase turnaround for complex edits', () => {
    const turnaround = getEstimatedTurnaround({
      edits: [{ photo_id: 'photo-1', edit_type: 'advanced_retouch' }],
    })

    expect(turnaround.hours).toBe(48)
    expect(turnaround.business_days).toBe(2)
  })

  it('should increase turnaround for bulk orders', () => {
    const turnaround = getEstimatedTurnaround({
      edits: Array(10).fill({ photo_id: 'photo-1', edit_type: 'sky_replacement' }),
    })

    expect(turnaround.hours).toBeGreaterThanOrEqual(48)
  })
})

describe('Edit Type Validation', () => {
  it('should validate edit types', () => {
    const validTypes: EditType[] = [
      'sky_replacement',
      'object_removal',
      'virtual_twilight',
      'color_correction',
      'grass_green',
      'fire_replacement',
      'tv_screen',
      'advanced_retouch',
    ]

    validTypes.forEach((type) => {
      const price = getEditTypePrice(type)
      expect(price).toBeGreaterThan(0)
    })
  })
})
