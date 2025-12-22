import { z } from 'zod'
import { uuidSchema, emailSchema } from './common'

/**
 * Credit and payment-related validation schemas
 */

// Credit transaction types
export const creditTransactionTypeSchema = z.enum([
  'purchase',
  'redemption',
  'reward',
  'bonus',
  'refund',
  'asm_ai_tool',
  'storywork_tool',
])

// Source platforms
export const sourcePlatformSchema = z.enum(['asm_portal', 'storywork'])

// Credits spend request
export const creditsSpendSchema = z.object({
  agent_id: uuidSchema.optional(),
  email: emailSchema.optional(),
  amount: z.number().int().positive('Amount must be positive'),
  type: creditTransactionTypeSchema,
  description: z.string().min(1, 'Description is required'),
  source_platform: sourcePlatformSchema.default('asm_portal'),
})

// Credits balance query
export const creditsBalanceQuerySchema = z.object({
  agent_id: uuidSchema.optional(),
  email: emailSchema.optional(),
})

// Reward types
export const rewardTypeSchema = z.enum(['ai', 'discount', 'premium'])

// Reward redemption
export const rewardRedemptionSchema = z.object({
  agent_id: uuidSchema,
  reward_id: z.string().min(1),
  credits_cost: z.number().int().positive(),
  reward_type: rewardTypeSchema,
})
