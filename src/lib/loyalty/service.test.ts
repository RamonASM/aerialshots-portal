/**
 * Loyalty Service Tests
 *
 * TDD tests for points, punch cards, and tier rewards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockLt = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Import after mocking
import {
  getLoyaltyTiers,
  getAgentLoyaltySummary,
  awardPointsForOrder,
  awardBonusPoints,
  redeemPoints,
  addPunch,
  usePunchCardReward,
  getPointsHistory,
  getTierDiscount,
  type LoyaltyTier,
  type LoyaltyPoints,
  type PunchCard,
} from './service'

// Sample data
const mockTiers: LoyaltyTier[] = [
  {
    id: 'tier-bronze',
    name: 'Bronze',
    slug: 'bronze',
    min_points: 0,
    discount_percent: 0,
    perks: ['Priority support'],
    badge_color: '#CD7F32',
    badge_icon: 'star',
  },
  {
    id: 'tier-silver',
    name: 'Silver',
    slug: 'silver',
    min_points: 1000,
    discount_percent: 5,
    perks: ['Priority support', '5% discount'],
    badge_color: '#C0C0C0',
    badge_icon: 'star',
  },
  {
    id: 'tier-gold',
    name: 'Gold',
    slug: 'gold',
    min_points: 5000,
    discount_percent: 10,
    perks: ['Priority support', '10% discount', 'Free twilight'],
    badge_color: '#FFD700',
    badge_icon: 'crown',
  },
  {
    id: 'tier-platinum',
    name: 'Platinum',
    slug: 'platinum',
    min_points: 10000,
    discount_percent: 15,
    perks: ['VIP support', '15% discount', 'Free services'],
    badge_color: '#E5E4E2',
    badge_icon: 'gem',
  },
]

const mockPoints: LoyaltyPoints[] = [
  {
    id: 'points-1',
    agent_id: 'agent-123',
    points: 500,
    type: 'earned',
    source: 'order',
    source_id: 'order-1',
    description: 'Points from order',
    is_expired: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'points-2',
    agent_id: 'agent-123',
    points: 200,
    type: 'earned',
    source: 'order',
    source_id: 'order-2',
    description: 'Points from order',
    is_expired: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'points-3',
    agent_id: 'agent-123',
    points: 100,
    type: 'redeemed',
    source: 'redemption',
    description: 'Redeemed for discount',
    is_expired: false,
    created_at: new Date().toISOString(),
  },
]

const mockPunchCard: PunchCard = {
  id: 'card-1',
  agent_id: 'agent-123',
  card_type: 'drone',
  punches_required: 10,
  punches_earned: 5,
  reward_type: 'free_service',
  reward_value: 'drone',
  reward_used: false,
  is_complete: false,
  is_expired: false,
  created_at: new Date().toISOString(),
}

// Helper to set up chain mocks
function setupChainMock(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }

  // Make terminal methods resolve
  chain.select.mockImplementation(() => ({
    ...chain,
    then: (resolve: (value: unknown) => void) => resolve(finalResult),
  }))

  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Loyalty Service', () => {
  describe('getLoyaltyTiers', () => {
    it('should return all active tiers sorted by min_points', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const tiers = await getLoyaltyTiers()

      expect(mockFrom).toHaveBeenCalledWith('loyalty_tiers')
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(chain.order).toHaveBeenCalledWith('min_points', { ascending: true })
      expect(tiers).toHaveLength(4)
      expect(tiers[0].name).toBe('Bronze')
    })

    it('should return empty array on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(chain)

      const tiers = await getLoyaltyTiers()

      expect(tiers).toEqual([])
    })

    it('should parse JSON perks if stored as string', async () => {
      const tiersWithStringPerks = [
        { ...mockTiers[0], perks: '["Perk 1", "Perk 2"]' },
      ]
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: tiersWithStringPerks, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const tiers = await getLoyaltyTiers()

      expect(tiers[0].perks).toEqual(['Perk 1', 'Perk 2'])
    })
  })

  describe('getAgentLoyaltySummary', () => {
    it('should calculate current points correctly', async () => {
      // Mock tiers query
      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      // Mock points query
      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPoints, error: null }),
      }

      // Mock punch cards query
      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockPunchCard], error: null }),
      }

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const summary = await getAgentLoyaltySummary('agent-123')

      expect(summary).not.toBeNull()
      // 500 + 200 earned - 100 redeemed = 600
      expect(summary?.current_points).toBe(600)
      // 500 + 200 lifetime earned
      expect(summary?.lifetime_points).toBe(700)
    })

    it('should determine correct tier based on lifetime points', async () => {
      const highPoints = [
        { ...mockPoints[0], points: 3000 },
        { ...mockPoints[1], points: 2500 },
      ]

      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: highPoints, error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const summary = await getAgentLoyaltySummary('agent-123')

      // 5500 lifetime points = Gold tier (5000+)
      expect(summary?.current_tier?.name).toBe('Gold')
      expect(summary?.next_tier?.name).toBe('Platinum')
      expect(summary?.points_to_next_tier).toBe(4500) // 10000 - 5500
    })

    it('should return discount percent from current tier', async () => {
      const goldPoints = [
        { ...mockPoints[0], points: 5000, type: 'earned' as const },
      ]

      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: goldPoints, error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const summary = await getAgentLoyaltySummary('agent-123')

      expect(summary?.discount_percent).toBe(10) // Gold tier discount
    })

    it('should count available rewards from completed punch cards', async () => {
      const completedCard: PunchCard = {
        ...mockPunchCard,
        punches_earned: 10,
        is_complete: true,
        reward_used: false,
      }

      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [completedCard], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const summary = await getAgentLoyaltySummary('agent-123')

      expect(summary?.available_rewards).toBe(1)
    })
  })

  describe('awardPointsForOrder', () => {
    it('should award 1 point per dollar spent', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(insertChain)

      const points = await awardPointsForOrder('agent-123', 'order-456', 350)

      expect(points).toBe(350)
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 'agent-123',
          points: 350,
          type: 'earned',
          source: 'order',
          source_id: 'order-456',
        })
      )
    })

    it('should return 0 for zero or negative order total', async () => {
      const points = await awardPointsForOrder('agent-123', 'order-456', 0)

      expect(points).toBe(0)
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('should floor fractional points', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(insertChain)

      const points = await awardPointsForOrder('agent-123', 'order-456', 99.99)

      expect(points).toBe(99)
    })

    it('should return 0 on database error', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(insertChain)

      const points = await awardPointsForOrder('agent-123', 'order-456', 100)

      expect(points).toBe(0)
    })

    it('should set expiration date 365 days in future', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(insertChain)

      await awardPointsForOrder('agent-123', 'order-456', 100)

      const call = insertChain.insert.mock.calls[0][0]
      const expiresAt = new Date(call.expires_at)
      const now = new Date()
      const daysDiff = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(daysDiff).toBeGreaterThanOrEqual(364)
      expect(daysDiff).toBeLessThanOrEqual(366)
    })
  })

  describe('awardBonusPoints', () => {
    it('should award bonus points with description', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(insertChain)

      const result = await awardBonusPoints('agent-123', 500, 'Welcome bonus', 'signup')

      expect(result).toBe(true)
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 'agent-123',
          points: 500,
          type: 'bonus',
          source: 'signup',
          description: 'Welcome bonus',
        })
      )
    })

    it('should use default source if not provided', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(insertChain)

      await awardBonusPoints('agent-123', 100, 'Birthday bonus')

      const call = insertChain.insert.mock.calls[0][0]
      expect(call.source).toBe('bonus')
    })

    it('should return false on error', async () => {
      const insertChain = {
        insert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(insertChain)

      const result = await awardBonusPoints('agent-123', 100, 'Test')

      expect(result).toBe(false)
    })
  })

  describe('redeemPoints', () => {
    it('should redeem points when balance is sufficient', async () => {
      // Mock for getAgentLoyaltySummary
      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPoints, error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const insertChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') {
          // Return insert chain for redemption insert, points chain for select
          return { ...pointsChain, insert: insertChain.insert }
        }
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const result = await redeemPoints('agent-123', 100, 'Discount redemption')

      expect(result).toBe(true)
    })

    it('should reject redemption when balance is insufficient', async () => {
      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      // Only 100 points available
      const lowPointsData = [
        { ...mockPoints[0], points: 100, type: 'earned' as const },
      ]

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: lowPointsData, error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const result = await redeemPoints('agent-123', 500, 'Too many points')

      expect(result).toBe(false)
    })
  })

  describe('addPunch', () => {
    it('should add punch to existing card', async () => {
      // Create chainable mock that returns updated card
      const updatedCard = { ...mockPunchCard, punches_earned: 6 }

      const createChainableMock = (finalResult: { data: unknown; error: unknown }) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.insert = vi.fn().mockReturnValue(chain)
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.lt = vi.fn().mockReturnValue(chain)
        chain.order = vi.fn().mockReturnValue(chain)
        chain.limit = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue(finalResult)
        return chain
      }

      const selectChain = createChainableMock({ data: mockPunchCard, error: null })
      const insertChain = createChainableMock({ data: null, error: null })
      const updateChain = createChainableMock({ data: updatedCard, error: null })

      let punchCardsCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'punch_cards') {
          punchCardsCallCount++
          if (punchCardsCallCount === 1) return selectChain
          return updateChain
        }
        if (table === 'punch_card_punches') return insertChain
        return selectChain
      })

      const card = await addPunch('agent-123', 'drone', 'order-789')

      expect(card?.punches_earned).toBe(6)
    })

    it('should create new card if none exists', async () => {
      const newCard = { ...mockPunchCard, id: 'new-card', punches_earned: 1 }

      const createChainableMock = (finalResult: { data: unknown; error: unknown }) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.insert = vi.fn().mockReturnValue(chain)
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.lt = vi.fn().mockReturnValue(chain)
        chain.order = vi.fn().mockReturnValue(chain)
        chain.limit = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue(finalResult)
        return chain
      }

      const selectEmptyChain = createChainableMock({ data: null, error: null })
      const insertCardChain = createChainableMock({ data: { ...mockPunchCard, punches_earned: 0 }, error: null })
      const insertPunchChain = createChainableMock({ data: null, error: null })
      const updateChain = createChainableMock({ data: newCard, error: null })

      let punchCardsCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'punch_cards') {
          punchCardsCallCount++
          if (punchCardsCallCount === 1) return selectEmptyChain
          if (punchCardsCallCount === 2) return insertCardChain
          return updateChain
        }
        if (table === 'punch_card_punches') return insertPunchChain
        return selectEmptyChain
      })

      const card = await addPunch('agent-123', 'video', 'order-789')

      expect(card).not.toBeNull()
      expect(card?.punches_earned).toBe(1)
    })

    it('should mark card complete when reaching required punches', async () => {
      const almostCompleteCard = {
        ...mockPunchCard,
        punches_earned: 9,
        punches_required: 10,
      }

      const completedCard = {
        ...almostCompleteCard,
        punches_earned: 10,
        is_complete: true,
        completed_at: new Date().toISOString(),
      }

      const createChainableMock = (finalResult: { data: unknown; error: unknown }) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.insert = vi.fn().mockReturnValue(chain)
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.lt = vi.fn().mockReturnValue(chain)
        chain.order = vi.fn().mockReturnValue(chain)
        chain.limit = vi.fn().mockReturnValue(chain)
        chain.single = vi.fn().mockResolvedValue(finalResult)
        return chain
      }

      const selectChain = createChainableMock({ data: almostCompleteCard, error: null })
      const insertChain = createChainableMock({ data: null, error: null })
      const updateChain = createChainableMock({ data: completedCard, error: null })

      let punchCardsCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'punch_cards') {
          punchCardsCallCount++
          if (punchCardsCallCount === 1) return selectChain
          return updateChain
        }
        if (table === 'punch_card_punches') return insertChain
        return selectChain
      })

      const card = await addPunch('agent-123', 'drone', 'order-789')

      expect(card?.punches_earned).toBe(10)
      expect(card?.is_complete).toBe(true)
    })
  })

  describe('usePunchCardReward', () => {
    it('should mark reward as used', async () => {
      const createChainableMock = (finalResult: { data: unknown; error: unknown }) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.update = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        // Last eq returns the promise result
        let eqCallCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          eqCallCount++
          if (eqCallCount >= 3) {
            return Promise.resolve(finalResult)
          }
          return chain
        })
        return chain
      }

      const updateChain = createChainableMock({ data: null, error: null })
      mockFrom.mockReturnValue(updateChain)

      const result = await usePunchCardReward('card-1', 'order-789')

      expect(result).toBe(true)
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          reward_used: true,
        })
      )
    })

    it('should return false on error', async () => {
      const createChainableMock = (finalResult: { data: unknown; error: unknown }) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.update = vi.fn().mockReturnValue(chain)
        let eqCallCount = 0
        chain.eq = vi.fn().mockImplementation(() => {
          eqCallCount++
          if (eqCallCount >= 3) {
            return Promise.resolve(finalResult)
          }
          return chain
        })
        return chain
      }

      const updateChain = createChainableMock({ data: null, error: new Error('Not found') })
      mockFrom.mockReturnValue(updateChain)

      const result = await usePunchCardReward('card-invalid', 'order-789')

      expect(result).toBe(false)
    })
  })

  describe('getPointsHistory', () => {
    it('should return points history sorted by date descending', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockPoints, error: null }),
      }
      mockFrom.mockReturnValue(selectChain)

      const history = await getPointsHistory('agent-123')

      expect(mockFrom).toHaveBeenCalledWith('loyalty_points')
      expect(selectChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(history).toHaveLength(3)
    })

    it('should respect limit parameter', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockPoints.slice(0, 2), error: null }),
      }
      mockFrom.mockReturnValue(selectChain)

      await getPointsHistory('agent-123', 2)

      expect(selectChain.limit).toHaveBeenCalledWith(2)
    })

    it('should return empty array on error', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }
      mockFrom.mockReturnValue(selectChain)

      const history = await getPointsHistory('agent-123')

      expect(history).toEqual([])
    })
  })

  describe('getTierDiscount', () => {
    it('should return discount percent for agent tier', async () => {
      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
      }

      const goldPoints = [
        { ...mockPoints[0], points: 5000, type: 'earned' as const },
      ]

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: goldPoints, error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const discount = await getTierDiscount('agent-123')

      expect(discount).toBe(10) // Gold tier
    })

    it('should return 0 for agents with no tier', async () => {
      const tiersChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const pointsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      const punchCardsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'loyalty_tiers') return tiersChain
        if (table === 'loyalty_points') return pointsChain
        if (table === 'punch_cards') return punchCardsChain
        return tiersChain
      })

      const discount = await getTierDiscount('agent-new')

      expect(discount).toBe(0)
    })
  })
})
