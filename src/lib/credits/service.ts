import { createClient as createServerClient } from '@/lib/supabase/server'
import { createBrowserClient } from '@supabase/ssr'
import { notifyLowCreditBalance } from '@/lib/notifications'

// Low balance thresholds - agents get notified at these levels
export const LOW_BALANCE_THRESHOLDS = [50, 25, 10] as const

// Credit transaction types (unified)
export type CreditTransactionType =
  // Earning types (ASM Portal)
  | 'referral_photo'
  | 'referral_video'
  | 'referral_premium'
  | 'milestone_5'
  | 'milestone_10'
  | 'milestone_25'
  | 'milestone_50'
  // Spending types (ASM Portal)
  | 'asm_ai_tool'
  | 'asm_discount'
  | 'asm_free_service'
  // Spending types (Storywork)
  | 'storywork_basic_story'
  | 'storywork_voice_story'
  | 'storywork_carousel'
  // Subscription types
  | 'subscription_credit'
  | 'subscription_bonus'
  // Admin/System types
  | 'adjustment'
  | 'expiry'
  | 'refund'
  | 'migration'
  | 'low_balance_alert' // Used to track when low balance notifications are sent

// Credit costs/earnings
export const creditAmounts: Record<CreditTransactionType, number> = {
  // Earning
  referral_photo: 100,
  referral_video: 200,
  referral_premium: 300,
  milestone_5: 250,
  milestone_10: 500,
  milestone_25: 750,
  milestone_50: 1000,
  subscription_credit: 0, // Variable based on tier
  subscription_bonus: 0, // Variable
  // Spending (negative values)
  asm_ai_tool: -25, // Variable, this is average
  asm_discount: -150, // Variable
  asm_free_service: -750, // Variable
  storywork_basic_story: -50,
  storywork_voice_story: -60,
  storywork_carousel: -75,
  // Admin/System
  adjustment: 0,
  expiry: 0,
  refund: 0,
  migration: 0,
  low_balance_alert: 0, // No credits involved, just tracking
}

export interface CreditTransaction {
  id: string
  agent_id: string
  amount: number
  type: CreditTransactionType
  description: string
  referral_id?: string
  created_at: string
}

export interface CreditBalance {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  recentTransactions: CreditTransaction[]
}

// Server-side credit service
export class ServerCreditService {
  private supabase: Awaited<ReturnType<typeof createServerClient>> | null = null

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  async getBalance(agentId: string): Promise<CreditBalance> {
    const supabase = await this.getClient()

    const [{ data: agent }, { data: transactions }] = await Promise.all([
      supabase
        .from('agents')
        .select('credit_balance, lifetime_credits')
        .eq('id', agentId)
        .single(),
      supabase
        .from('credit_transactions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const lifetimeSpent =
      transactions
        ?.filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    return {
      balance: agent?.credit_balance || 0,
      lifetimeEarned: agent?.lifetime_credits || 0,
      lifetimeSpent,
      recentTransactions: (transactions as CreditTransaction[]) || [],
    }
  }

  async earnCredits(
    agentId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    referralId?: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const supabase = await this.getClient()

    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('description', `${idempotencyKey}`)
        .single()

      if (existing) {
        const { data: agent } = await supabase
          .from('agents')
          .select('credit_balance')
          .eq('id', agentId)
          .single()
        return { success: true, newBalance: agent?.credit_balance || 0 }
      }
    }

    // Get current balance
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('credit_balance, lifetime_credits')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return { success: false, newBalance: 0, error: 'Agent not found' }
    }

    const newBalance = (agent.credit_balance || 0) + amount
    const newLifetime = (agent.lifetime_credits || 0) + (amount > 0 ? amount : 0)

    // Update balance and log transaction
    const [updateResult, insertResult] = await Promise.all([
      supabase
        .from('agents')
        .update({
          credit_balance: newBalance,
          lifetime_credits: newLifetime,
        })
        .eq('id', agentId),
      supabase.from('credit_transactions').insert({
        agent_id: agentId,
        amount,
        type,
        description: idempotencyKey ? `${idempotencyKey} - ${description}` : description,
        referral_id: referralId || null,
      }),
    ])

    if (updateResult.error || insertResult.error) {
      return { success: false, newBalance: agent.credit_balance || 0, error: 'Failed to update credits' }
    }

    return { success: true, newBalance }
  }

  async spendCredits(
    agentId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    sourcePlatform: 'asm_portal' | 'storywork' = 'asm_portal'
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const supabase = await this.getClient()

    // Get current balance
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return { success: false, newBalance: 0, error: 'Agent not found' }
    }

    const previousBalance = agent.credit_balance || 0

    if (previousBalance < amount) {
      return {
        success: false,
        newBalance: previousBalance,
        error: 'Insufficient credits',
      }
    }

    const newBalance = previousBalance - amount

    // Update balance and log transaction
    const [updateResult, insertResult] = await Promise.all([
      supabase.from('agents').update({ credit_balance: newBalance }).eq('id', agentId),
      supabase.from('credit_transactions').insert({
        agent_id: agentId,
        amount: -amount,
        type,
        description: `[${sourcePlatform}] ${description}`,
      }),
    ])

    if (updateResult.error || insertResult.error) {
      return {
        success: false,
        newBalance: previousBalance,
        error: 'Failed to update credits',
      }
    }

    // Check if balance crossed a low threshold and send notification
    this.checkLowBalance(agentId, previousBalance, newBalance).catch((err) =>
      console.error('Low balance check error:', err)
    )

    return { success: true, newBalance }
  }

  // Check if balance crossed a low threshold after spending
  async checkLowBalance(
    agentId: string,
    previousBalance: number,
    newBalance: number
  ): Promise<void> {
    const supabase = await this.getClient()

    // Find if we crossed any threshold
    for (const threshold of LOW_BALANCE_THRESHOLDS) {
      if (previousBalance > threshold && newBalance <= threshold) {
        // Get agent details for notification
        const { data: agent } = await supabase
          .from('agents')
          .select('name, email, phone')
          .eq('id', agentId)
          .single()

        if (agent?.email) {
          // Check if we already sent a low balance notification recently (within 7 days)
          // We use a specific transaction type to track this
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { data: recentNotification } = await supabase
            .from('credit_transactions')
            .select('id')
            .eq('agent_id', agentId)
            .eq('type', 'low_balance_alert')
            .gte('created_at', sevenDaysAgo)
            .limit(1)

          if (!recentNotification || recentNotification.length === 0) {
            // Send low balance notification
            await notifyLowCreditBalance(
              { email: agent.email, phone: agent.phone || undefined, name: agent.name || 'Agent' },
              {
                agentName: agent.name || 'Agent',
                currentBalance: newBalance,
                threshold,
                rewardsUrl: 'https://portal.aerialshots.media/dashboard/rewards',
              }
            )

            // Log a zero-amount transaction to track the notification
            await supabase.from('credit_transactions').insert({
              agent_id: agentId,
              amount: 0,
              type: 'low_balance_alert',
              description: `Low balance alert sent (${newBalance} credits, threshold: ${threshold})`,
            })
          }
        }

        break // Only send one notification per spend event
      }
    }
  }

  async checkMilestones(agentId: string): Promise<{ milestone?: string; bonus?: number }> {
    const supabase = await this.getClient()

    // Count completed referrals
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', agentId)
      .eq('status', 'credited')

    const completedCount = count || 0

    // Check if milestones have been awarded
    const { data: existingMilestones } = await supabase
      .from('credit_transactions')
      .select('type')
      .eq('agent_id', agentId)
      .in('type', ['milestone_5', 'milestone_10'])

    const awardedMilestones = existingMilestones?.map((t) => t.type) || []

    if (completedCount >= 10 && !awardedMilestones.includes('milestone_10')) {
      await this.earnCredits(
        agentId,
        creditAmounts.milestone_10,
        'milestone_10',
        '10 Referrals Milestone Bonus'
      )
      return { milestone: '10 referrals', bonus: creditAmounts.milestone_10 }
    }

    if (completedCount >= 5 && !awardedMilestones.includes('milestone_5')) {
      await this.earnCredits(
        agentId,
        creditAmounts.milestone_5,
        'milestone_5',
        '5 Referrals Milestone Bonus'
      )
      return { milestone: '5 referrals', bonus: creditAmounts.milestone_5 }
    }

    return {}
  }
}

// Client-side credit service (for browser components)
export class ClientCreditService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async getBalance(agentId: string): Promise<number> {
    const { data } = await this.supabase
      .from('agents')
      .select('credit_balance')
      .eq('id', agentId)
      .single()

    return data?.credit_balance || 0
  }

  async getTransactionHistory(agentId: string, limit = 20): Promise<CreditTransaction[]> {
    const { data } = await this.supabase
      .from('credit_transactions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as CreditTransaction[]) || []
  }
}

// Singleton instances
export const serverCreditService = new ServerCreditService()

// =====================
// UNIFIED CREDITS SERVICE
// =====================

export interface UnifiedUser {
  id: string
  email: string
  asm_agent_id: string | null
  storywork_user_id: string | null
  storywork_clerk_id: string | null
  credit_balance: number
  lifetime_credits: number
}

export interface UnifiedCreditTransaction {
  id: string
  unified_user_id: string
  amount: number
  running_balance: number
  transaction_type: CreditTransactionType
  source_platform: 'asm_portal' | 'storywork' | 'system'
  description: string
  idempotency_key?: string
  reference_id?: string
  reference_type?: string
  created_at: string
}

export class UnifiedCreditService {
  private supabase: Awaited<ReturnType<typeof createServerClient>> | null = null

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createServerClient()
    }
    return this.supabase
  }

  // Get or create unified user by email
  async getOrCreateUnifiedUser(
    email: string,
    asmAgentId?: string,
    storyworkUserId?: string,
    storyworkClerkId?: string
  ): Promise<UnifiedUser> {
    const supabase = await this.getClient()

    // Use the database function (cast to any since RPC types aren't generated yet)
    const { data, error } = await (supabase.rpc as Function)('get_or_create_unified_user', {
      p_email: email,
      p_asm_agent_id: asmAgentId || null,
      p_storywork_user_id: storyworkUserId || null,
      p_storywork_clerk_id: storyworkClerkId || null,
    })

    if (error) {
      throw new Error(`Failed to get/create unified user: ${error.message}`)
    }

    // Fetch the full user record (cast to any since table types aren't generated yet)
    const { data: user, error: fetchError } = await (supabase.from as Function)('unified_users')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError || !user) {
      throw new Error(`Failed to fetch unified user: ${fetchError?.message}`)
    }

    return user as UnifiedUser
  }

  // Get unified user by ASM agent ID
  async getUnifiedUserByAgentId(agentId: string): Promise<UnifiedUser | null> {
    const supabase = await this.getClient()

    const { data } = await (supabase.from as Function)('unified_users')
      .select('*')
      .eq('asm_agent_id', agentId)
      .single()

    return data as UnifiedUser | null
  }

  // Get unified user by Storywork clerk ID
  async getUnifiedUserByClerkId(clerkId: string): Promise<UnifiedUser | null> {
    const supabase = await this.getClient()

    const { data } = await (supabase.from as Function)('unified_users')
      .select('*')
      .eq('storywork_clerk_id', clerkId)
      .single()

    return data as UnifiedUser | null
  }

  // Earn credits (unified)
  async earnCredits(
    unifiedUserId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    sourcePlatform: 'asm_portal' | 'storywork' | 'system' = 'asm_portal',
    idempotencyKey?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const supabase = await this.getClient()

    const { data, error } = await (supabase.rpc as Function)('earn_unified_credits', {
      p_unified_user_id: unifiedUserId,
      p_amount: amount,
      p_transaction_type: type,
      p_source_platform: sourcePlatform,
      p_description: description,
      p_idempotency_key: idempotencyKey || null,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    })

    if (error) {
      return { success: false, newBalance: 0, error: error.message }
    }

    const result = data?.[0]
    if (!result?.success) {
      return { success: false, newBalance: 0, error: result?.error || 'Unknown error' }
    }

    return { success: true, newBalance: result.new_balance }
  }

  // Spend credits (unified)
  async spendCredits(
    unifiedUserId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    sourcePlatform: 'asm_portal' | 'storywork' | 'system' = 'asm_portal',
    idempotencyKey?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const supabase = await this.getClient()

    const { data, error } = await (supabase.rpc as Function)('spend_unified_credits', {
      p_unified_user_id: unifiedUserId,
      p_amount: amount,
      p_transaction_type: type,
      p_source_platform: sourcePlatform,
      p_description: description,
      p_idempotency_key: idempotencyKey || null,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    })

    if (error) {
      return { success: false, newBalance: 0, error: error.message }
    }

    const result = data?.[0]
    if (!result?.success) {
      return { success: false, newBalance: result?.new_balance || 0, error: result?.error || 'Unknown error' }
    }

    return { success: true, newBalance: result.new_balance }
  }

  // Reserve credits (two-phase)
  async reserveCredits(
    unifiedUserId: string,
    amount: number,
    purpose: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<{ success: boolean; reservationId?: string; error?: string }> {
    const supabase = await this.getClient()

    const { data, error } = await (supabase.rpc as Function)('reserve_credits', {
      p_unified_user_id: unifiedUserId,
      p_amount: amount,
      p_purpose: purpose,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const result = data?.[0]
    if (!result?.success) {
      return { success: false, error: result?.error || 'Unknown error' }
    }

    return { success: true, reservationId: result.reservation_id }
  }

  // Commit reservation
  async commitReservation(
    reservationId: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    const supabase = await this.getClient()

    const { data, error } = await (supabase.rpc as Function)('commit_reservation', {
      p_reservation_id: reservationId,
      p_idempotency_key: idempotencyKey || null,
    })

    if (error) {
      return { success: false, newBalance: 0, error: error.message }
    }

    const result = data?.[0]
    if (!result?.success) {
      return { success: false, newBalance: 0, error: result?.error || 'Unknown error' }
    }

    return { success: true, newBalance: result.new_balance }
  }

  // Release reservation (cancel)
  async releaseReservation(reservationId: string): Promise<boolean> {
    const supabase = await this.getClient()

    const { data, error } = await (supabase.rpc as Function)('release_reservation', {
      p_reservation_id: reservationId,
    })

    if (error) {
      return false
    }

    return data === true
  }

  // Get transaction history (unified)
  async getTransactionHistory(
    unifiedUserId: string,
    limit = 20
  ): Promise<UnifiedCreditTransaction[]> {
    const supabase = await this.getClient()

    const { data } = await (supabase.from as Function)('unified_credit_transactions')
      .select('*')
      .eq('unified_user_id', unifiedUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as UnifiedCreditTransaction[]) || []
  }

  // Link ASM agent to unified user
  async linkAsmAgent(unifiedUserId: string, agentId: string): Promise<boolean> {
    const supabase = await this.getClient()

    const { error } = await (supabase.from as Function)('unified_users')
      .update({ asm_agent_id: agentId })
      .eq('id', unifiedUserId)

    return !error
  }

  // Link Storywork user to unified user
  async linkStoryworkUser(
    unifiedUserId: string,
    storyworkUserId: string,
    clerkId: string
  ): Promise<boolean> {
    const supabase = await this.getClient()

    const { error } = await (supabase.from as Function)('unified_users')
      .update({
        storywork_user_id: storyworkUserId,
        storywork_clerk_id: clerkId,
      })
      .eq('id', unifiedUserId)

    return !error
  }

  // Migrate existing agent credits to unified system
  async migrateAgentToUnified(agentId: string): Promise<UnifiedUser | null> {
    const supabase = await this.getClient()

    // Get agent data
    const { data: agent } = await supabase
      .from('agents')
      .select('id, email, credit_balance, lifetime_credits')
      .eq('id', agentId)
      .single()

    if (!agent) return null

    // Create or get unified user
    const unifiedUser = await this.getOrCreateUnifiedUser(agent.email, agentId)

    // If unified user has no balance, migrate from agent
    if (unifiedUser.credit_balance === 0 && agent.credit_balance > 0) {
      const { error } = await (supabase.from as Function)('unified_users')
        .update({
          credit_balance: agent.credit_balance,
          lifetime_credits: agent.lifetime_credits,
        })
        .eq('id', unifiedUser.id)

      if (!error) {
        // Log migration transaction
        await (supabase.from as Function)('unified_credit_transactions').insert({
          unified_user_id: unifiedUser.id,
          amount: agent.credit_balance,
          running_balance: agent.credit_balance,
          transaction_type: 'migration',
          source_platform: 'system',
          description: 'Migrated from ASM Portal agent credits',
          reference_id: agentId,
          reference_type: 'agent',
        })

        return {
          ...unifiedUser,
          credit_balance: agent.credit_balance,
          lifetime_credits: agent.lifetime_credits,
        }
      }
    }

    return unifiedUser
  }
}

// Singleton instance
export const unifiedCreditService = new UnifiedCreditService()
