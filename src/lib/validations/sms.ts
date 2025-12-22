import { z } from 'zod'
import { uuidSchema } from './common'

/**
 * SMS/Communication validation schemas
 */

// SMS template types
export const smsTemplateSchema = z.enum([
  'delivery_ready',
  'order_confirmed',
  'appointment_reminder',
  'welcome',
  'follow_up',
])

// Language options
export const languageSchema = z.enum(['en', 'es'])

// SMS send request
export const smsSendSchema = z.object({
  agent_id: uuidSchema,
  listing_id: uuidSchema.optional(),
  template: smsTemplateSchema,
  language: languageSchema.default('en'),
  customMessage: z.string().max(1600).optional(), // SMS max length
})
