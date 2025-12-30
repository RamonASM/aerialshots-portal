/**
 * Credits Service Tests
 *
 * Tests for the loyalty program credit system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  creditAmounts,
  LOW_BALANCE_THRESHOLDS,
  type CreditTransactionType,
} from './service'

// Mock Supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockIn = vi.fn()
const mockGte = vi.fn()

function createChainableMock(finalResult: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'single', 'insert', 'update', 'order', 'limit', 'gte', 'maybeSingle']

  methods.forEach(method => {
    chain[method] = vi.fn(() => chain)
  })

  chain.single = vi.fn(() => finalResult)
  chain.maybeSingle = vi.fn(() => finalResult)

  return chain
}

let mockFromResult: ReturnType<typeof createChainableMock> = createChainableMock({ data: null, error: null })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => mockFromResult),
  })),
}))

vi.mock('@/lib/notifications', () => ({
  notifyLowCreditBalance: vi.fn(async () => {}),
}))

describe('Credit Constants', () => {
  describe('creditAmounts', () => {
    it('should have positive amounts for earning types', () => {
      const earningTypes: CreditTransactionType[] = [
        'referral_photo',
        'referral_video',
        'referral_premium',
        'milestone_5',
        'milestone_10',
        'milestone_25',
        'milestone_50',
      ]

      for (const type of earningTypes) {
        expect(creditAmounts[type]).toBeGreaterThan(0)
      }
    })

    it('should have negative amounts for spending types', () => {
      const spendingTypes: CreditTransactionType[] = [
        'asm_ai_tool',
        'asm_discount',
        'asm_free_service',
        'storywork_basic_story',
        'storywork_voice_story',
        'storywork_carousel',
      ]

      for (const type of spendingTypes) {
        expect(creditAmounts[type]).toBeLessThan(0)
      }
    })

    it('should have correct referral rewards', () => {
      expect(creditAmounts.referral_photo).toBe(100)
      expect(creditAmounts.referral_video).toBe(200)
      expect(creditAmounts.referral_premium).toBe(300)
    })

    it('should have correct milestone bonuses', () => {
      expect(creditAmounts.milestone_5).toBe(250)
      expect(creditAmounts.milestone_10).toBe(500)
      expect(creditAmounts.milestone_25).toBe(750)
      expect(creditAmounts.milestone_50).toBe(1000)
    })

    it('should have correct storywork costs', () => {
      expect(creditAmounts.storywork_basic_story).toBe(-50)
      expect(creditAmounts.storywork_voice_story).toBe(-60)
      expect(creditAmounts.storywork_carousel).toBe(-75)
    })
  })

  describe('LOW_BALANCE_THRESHOLDS', () => {
    it('should have thresholds in descending order', () => {
      expect(LOW_BALANCE_THRESHOLDS).toEqual([50, 25, 10])
    })

    it('should have 3 threshold levels', () => {
      expect(LOW_BALANCE_THRESHOLDS).toHaveLength(3)
    })
  })
})

describe('Tier Calculation', () => {
  // Test the tier logic that's used in the rewards page
  const getTier = (lifetimeCredits: number) => {
    if (lifetimeCredits >= 2000) return { name: 'Platinum', required: 2000 }
    if (lifetimeCredits >= 1000) return { name: 'Gold', required: 2000 }
    if (lifetimeCredits >= 500) return { name: 'Silver', required: 1000 }
    return { name: 'Bronze', required: 500 }
  }

  it('should return Bronze for < 500 credits', () => {
    expect(getTier(0).name).toBe('Bronze')
    expect(getTier(499).name).toBe('Bronze')
  })

  it('should return Silver for 500-999 credits', () => {
    expect(getTier(500).name).toBe('Silver')
    expect(getTier(999).name).toBe('Silver')
  })

  it('should return Gold for 1000-1999 credits', () => {
    expect(getTier(1000).name).toBe('Gold')
    expect(getTier(1999).name).toBe('Gold')
  })

  it('should return Platinum for >= 2000 credits', () => {
    expect(getTier(2000).name).toBe('Platinum')
    expect(getTier(5000).name).toBe('Platinum')
  })
})

describe('Reward Redemption Calculations', () => {
  const CREDIT_PACKAGES = [
    { id: 'starter', credits: 100, price: 25 },
    { id: 'standard', credits: 250, price: 50, savings: '20%' },
    { id: 'professional', credits: 500, price: 85, savings: '32%' },
    { id: 'enterprise', credits: 1000, price: 150, savings: '40%' },
  ]

  it('should calculate correct price per credit for starter', () => {
    const starter = CREDIT_PACKAGES[0]
    const pricePerCredit = starter.price / starter.credits
    expect(pricePerCredit).toBe(0.25) // $0.25 per credit
  })

  it('should calculate correct savings for standard package', () => {
    const starter = CREDIT_PACKAGES[0]
    const standard = CREDIT_PACKAGES[1]

    const starterRate = starter.price / starter.credits // $0.25
    const standardRate = standard.price / standard.credits // $0.20

    const savings = ((starterRate - standardRate) / starterRate) * 100
    expect(savings).toBeCloseTo(20, 2)
  })

  it('should have best value for enterprise package', () => {
    const enterprise = CREDIT_PACKAGES[3]
    const pricePerCredit = enterprise.price / enterprise.credits
    expect(pricePerCredit).toBe(0.15) // $0.15 per credit - best value
  })
})

describe('Reward Availability', () => {
  const rewards = [
    { id: 'listing_description', credits: 25, tier: 'ai' },
    { id: 'discount_10_percent', credits: 150, tier: 'discount' },
    { id: 'free_basic_shoot', credits: 750, tier: 'premium' },
  ]

  it('should allow redemption when balance >= cost', () => {
    const balance = 200
    const aiReward = rewards.find(r => r.id === 'listing_description')!
    const discountReward = rewards.find(r => r.id === 'discount_10_percent')!
    const premiumReward = rewards.find(r => r.id === 'free_basic_shoot')!

    expect(balance >= aiReward.credits).toBe(true)
    expect(balance >= discountReward.credits).toBe(true)
    expect(balance >= premiumReward.credits).toBe(false)
  })

  it('should categorize rewards correctly', () => {
    const aiRewards = rewards.filter(r => r.tier === 'ai')
    const discountRewards = rewards.filter(r => r.tier === 'discount')
    const premiumRewards = rewards.filter(r => r.tier === 'premium')

    expect(aiRewards).toHaveLength(1)
    expect(discountRewards).toHaveLength(1)
    expect(premiumRewards).toHaveLength(1)
  })
})

describe('Milestone Calculation', () => {
  const getMilestoneBonus = (referralCount: number, awardedMilestones: string[]) => {
    if (referralCount >= 50 && !awardedMilestones.includes('milestone_50')) {
      return { milestone: 'milestone_50', bonus: creditAmounts.milestone_50 }
    }
    if (referralCount >= 25 && !awardedMilestones.includes('milestone_25')) {
      return { milestone: 'milestone_25', bonus: creditAmounts.milestone_25 }
    }
    if (referralCount >= 10 && !awardedMilestones.includes('milestone_10')) {
      return { milestone: 'milestone_10', bonus: creditAmounts.milestone_10 }
    }
    if (referralCount >= 5 && !awardedMilestones.includes('milestone_5')) {
      return { milestone: 'milestone_5', bonus: creditAmounts.milestone_5 }
    }
    return null
  }

  it('should award 5 referral milestone at 5 referrals', () => {
    const result = getMilestoneBonus(5, [])
    expect(result?.milestone).toBe('milestone_5')
    expect(result?.bonus).toBe(250)
  })

  it('should award 10 referral milestone at 10 referrals', () => {
    const result = getMilestoneBonus(10, ['milestone_5'])
    expect(result?.milestone).toBe('milestone_10')
    expect(result?.bonus).toBe(500)
  })

  it('should not award milestone if already claimed', () => {
    const result = getMilestoneBonus(10, ['milestone_5', 'milestone_10'])
    expect(result).toBe(null)
  })

  it('should award highest unclaimed milestone', () => {
    const result = getMilestoneBonus(30, ['milestone_5', 'milestone_10'])
    expect(result?.milestone).toBe('milestone_25')
    expect(result?.bonus).toBe(750)
  })
})

describe('Low Balance Detection', () => {
  const shouldNotify = (previousBalance: number, newBalance: number) => {
    for (const threshold of LOW_BALANCE_THRESHOLDS) {
      if (previousBalance > threshold && newBalance <= threshold) {
        return threshold
      }
    }
    return null
  }

  it('should trigger notification when crossing 50 threshold', () => {
    expect(shouldNotify(60, 45)).toBe(50)
    expect(shouldNotify(100, 50)).toBe(50)
  })

  it('should trigger notification when crossing 25 threshold', () => {
    expect(shouldNotify(30, 20)).toBe(25)
    expect(shouldNotify(50, 25)).toBe(25)
  })

  it('should trigger notification when crossing 10 threshold', () => {
    expect(shouldNotify(15, 8)).toBe(10)
    expect(shouldNotify(25, 10)).toBe(10)
  })

  it('should not trigger if staying above threshold', () => {
    expect(shouldNotify(100, 60)).toBe(null)
    expect(shouldNotify(50, 51)).toBe(null)
  })

  it('should not trigger if already below threshold', () => {
    expect(shouldNotify(40, 35)).toBe(null)
    expect(shouldNotify(20, 15)).toBe(null)
  })
})
