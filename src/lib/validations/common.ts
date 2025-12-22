import { z } from 'zod'

/**
 * Common validation schemas used across the application
 */

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Email validation
export const emailSchema = z.string().email('Invalid email format')

// Phone number validation (flexible format)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()

// URL validation
export const urlSchema = z.string().url('Invalid URL format')

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// Status filters
export const statusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
])

// Date range
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

// ID parameter (for route params)
export const idParamSchema = z.object({
  id: uuidSchema,
})

// Non-empty string
export const nonEmptyStringSchema = z.string().min(1, 'Required field')

// Positive number
export const positiveNumberSchema = z.number().positive('Must be a positive number')

// Non-negative number
export const nonNegativeNumberSchema = z.number().nonnegative('Cannot be negative')
