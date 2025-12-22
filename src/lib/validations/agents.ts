import { z } from 'zod'
import { uuidSchema } from './common'

/**
 * Agent-related validation schemas
 */

// Agent execute input
export const agentExecuteInputSchema = z.object({
  input: z.record(z.string(), z.unknown()).optional().default({}),
})

// Agent route params
export const agentSlugParamSchema = z.object({
  agentSlug: z.string().min(1),
})
