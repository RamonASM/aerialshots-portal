/**
 * Loyalty Program Service
 *
 * Manages points, punch cards, and tier rewards
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Types
export interface LoyaltyTier {
  id: string
  name: string
  slug: string
  min_points: number
  discount_percent: number
  perks: string[]
  badge_color: string
  badge_icon: string
}

export interface LoyaltyPoints {
  id: string
  agent_id: string
  points: number
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment'
  source: string
  source_id?: string
  description?: string
  expires_at?: string
  is_expired: boolean
  created_at: string
}

export interface PunchCard {
  id: string
  agent_id: string
  card_type: string
  punches_required: number
  punches_earned: number
  reward_type: string
  reward_value?: string
  reward_used: boolean
  is_complete: boolean
  completed_at?: string
  expires_at?: string
  is_expired: boolean
  created_at: string
}

export interface LoyaltySummary {
  agent_id: string
  current_points: number
  lifetime_points: number
  current_tier: LoyaltyTier | null
  next_tier: LoyaltyTier | null
  points_to_next_tier: number
  available_rewards: number
  active_punch_cards: PunchCard[]
  discount_percent: number
}

// Constants
const POINTS_PER_DOLLAR = 1
const POINTS_EXPIRY_DAYS = 365

/**
 * Get all loyalty tiers
 */
export async function getLoyaltyTiers(): Promise<LoyaltyTier[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('loyalty_tiers')
    .select('*')
    .eq('is_active', true)
    .order('min_points', { ascending: true })

  if (error) {
    console.error('Error fetching loyalty tiers:', error)
    return []
  }

  return (data || []).map((tier: LoyaltyTier & { perks: string[] | string }) => ({
    ...tier,
    perks: Array.isArray(tier.perks) ? tier.perks : JSON.parse(tier.perks || '[]'),
  }))
}

/**
 * Get agent's loyalty summary
 */
export async function getAgentLoyaltySummary(agentId: string): Promise<LoyaltySummary | null> {
  const supabase = createAdminClient()

  // Get all tiers
  const tiers = await getLoyaltyTiers()

  // Get points balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pointsData } = await (supabase as any)
    .from('loyalty_points')
    .select('points, type, is_expired')
    .eq('agent_id', agentId)

  const earnedPoints = (pointsData || [])
    .filter((p: LoyaltyPoints) => p.type === 'earned' && !p.is_expired)
    .reduce((sum: number, p: LoyaltyPoints) => sum + p.points, 0)

  const redeemedPoints = (pointsData || [])
    .filter((p: LoyaltyPoints) => p.type === 'redeemed')
    .reduce((sum: number, p: LoyaltyPoints) => sum + p.points, 0)

  const expiredPoints = (pointsData || [])
    .filter((p: LoyaltyPoints) => p.type === 'expired')
    .reduce((sum: number, p: LoyaltyPoints) => sum + p.points, 0)

  const currentPoints = earnedPoints - redeemedPoints - expiredPoints
  const lifetimePoints = (pointsData || [])
    .filter((p: LoyaltyPoints) => p.type === 'earned')
    .reduce((sum: number, p: LoyaltyPoints) => sum + p.points, 0)

  // Determine current tier based on lifetime points
  const currentTier = tiers
    .filter(t => t.min_points <= lifetimePoints)
    .sort((a, b) => b.min_points - a.min_points)[0] || null

  // Determine next tier
  const nextTier = tiers
    .filter(t => t.min_points > lifetimePoints)
    .sort((a, b) => a.min_points - b.min_points)[0] || null

  const pointsToNextTier = nextTier ? nextTier.min_points - lifetimePoints : 0

  // Get punch cards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: punchCardsData } = await (supabase as any)
    .from('punch_cards')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_expired', false)
    .order('created_at', { ascending: false })

  const activePunchCards = (punchCardsData || []).filter((pc: PunchCard) => !pc.is_complete)
  const availableRewards = (punchCardsData || []).filter(
    (pc: PunchCard) => pc.is_complete && !pc.reward_used
  ).length

  return {
    agent_id: agentId,
    current_points: currentPoints,
    lifetime_points: lifetimePoints,
    current_tier: currentTier,
    next_tier: nextTier,
    points_to_next_tier: pointsToNextTier,
    available_rewards: availableRewards,
    active_punch_cards: activePunchCards,
    discount_percent: currentTier?.discount_percent || 0,
  }
}

/**
 * Award points for an order
 */
export async function awardPointsForOrder(
  agentId: string,
  orderId: string,
  orderTotal: number
): Promise<number> {
  const supabase = createAdminClient()
  const points = Math.floor(orderTotal * POINTS_PER_DOLLAR)

  if (points <= 0) return 0

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + POINTS_EXPIRY_DAYS)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('loyalty_points')
    .insert({
      agent_id: agentId,
      points,
      type: 'earned',
      source: 'order',
      source_id: orderId,
      description: `Points earned from order #${orderId.slice(0, 8)}`,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error awarding points:', error)
    return 0
  }

  return points
}

/**
 * Award bonus points
 */
export async function awardBonusPoints(
  agentId: string,
  points: number,
  description: string,
  source: string = 'bonus'
): Promise<boolean> {
  const supabase = createAdminClient()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + POINTS_EXPIRY_DAYS)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('loyalty_points')
    .insert({
      agent_id: agentId,
      points,
      type: 'bonus',
      source,
      description,
      expires_at: expiresAt.toISOString(),
    })

  if (error) {
    console.error('Error awarding bonus points:', error)
    return false
  }

  return true
}

/**
 * Redeem points
 */
export async function redeemPoints(
  agentId: string,
  points: number,
  description: string
): Promise<boolean> {
  const supabase = createAdminClient()

  // Check balance
  const summary = await getAgentLoyaltySummary(agentId)
  if (!summary || summary.current_points < points) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('loyalty_points')
    .insert({
      agent_id: agentId,
      points,
      type: 'redeemed',
      source: 'redemption',
      description,
    })

  if (error) {
    console.error('Error redeeming points:', error)
    return false
  }

  return true
}

/**
 * Add a punch to agent's card
 */
export async function addPunch(
  agentId: string,
  cardType: string,
  orderId?: string
): Promise<PunchCard | null> {
  const supabase = createAdminClient()

  // Find or create active punch card
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: card } = await (supabase as any)
    .from('punch_cards')
    .select('*')
    .eq('agent_id', agentId)
    .eq('card_type', cardType)
    .eq('is_expired', false)
    .lt('punches_earned', 10) // Not complete
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!card) {
    // Create new punch card
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCard, error } = await (supabase as any)
      .from('punch_cards')
      .insert({
        agent_id: agentId,
        card_type: cardType,
        punches_required: 10,
        punches_earned: 0,
        reward_type: 'free_service',
        reward_value: cardType,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating punch card:', error)
      return null
    }

    card = newCard
  }

  // Add punch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('punch_card_punches')
    .insert({
      punch_card_id: card.id,
      order_id: orderId,
      description: 'Punch from order',
    })

  // Update punch count
  const newPunchCount = card.punches_earned + 1
  const isComplete = newPunchCount >= card.punches_required

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedCard } = await (supabase as any)
    .from('punch_cards')
    .update({
      punches_earned: newPunchCount,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('id', card.id)
    .select()
    .single()

  return updatedCard
}

/**
 * Use a punch card reward
 */
export async function usePunchCardReward(
  cardId: string,
  orderId: string
): Promise<boolean> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('punch_cards')
    .update({
      reward_used: true,
      reward_used_at: new Date().toISOString(),
      reward_order_id: orderId,
    })
    .eq('id', cardId)
    .eq('is_complete', true)
    .eq('reward_used', false)

  if (error) {
    console.error('Error using punch card reward:', error)
    return false
  }

  return true
}

/**
 * Get agent's points history
 */
export async function getPointsHistory(
  agentId: string,
  limit: number = 20
): Promise<LoyaltyPoints[]> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('loyalty_points')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching points history:', error)
    return []
  }

  return data || []
}

/**
 * Calculate tier discount for an order
 */
export async function getTierDiscount(agentId: string): Promise<number> {
  const summary = await getAgentLoyaltySummary(agentId)
  return summary?.discount_percent || 0
}
