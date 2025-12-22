import { z } from 'zod'
import { uuidSchema, urlSchema } from './common'

/**
 * Instagram integration validation schemas
 */

// Instagram publish request
export const instagramPublishSchema = z.object({
  carouselId: uuidSchema,
  agentId: uuidSchema,
})

// Instagram embed request
export const instagramEmbedSchema = z.object({
  url: urlSchema,
})

// Instagram OAuth callback
export const instagramCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

// Instagram disconnect request
export const instagramDisconnectSchema = z.object({
  agentId: uuidSchema,
})
