/**
 * Central export file for all validation schemas
 *
 * This module provides Zod schemas for validating API inputs across the application.
 * Import from this file for convenience, or directly from specific schema files.
 */

import { z } from 'zod'

// Re-export all schemas
export * from './common'
export * from './agents'
export * from './listings'
export * from './campaigns'
export * from './credits'
export * from './instagram'
export * from './sms'

/**
 * Helper function to validate request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param body - Request body to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 *
 * @example
 * ```ts
 * const body = await request.json()
 * const validated = validateBody(listingDescriptionInputSchema, body)
 * ```
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body)
}

/**
 * Helper function to safely validate with error handling
 * Returns either the validated data or an error
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with either success=true and data, or success=false and error
 *
 * @example
 * ```ts
 * const result = safeValidate(emailSchema, body.email)
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 })
 * }
 * const validEmail = result.data
 * ```
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Format Zod errors into a readable message
  const errorMessage = result.error.issues
    .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
    .join(', ')

  return { success: false, error: errorMessage }
}

/**
 * Helper function to validate query parameters
 * Automatically coerces string values to appropriate types
 *
 * @param schema - Zod schema to validate against
 * @param searchParams - URLSearchParams or object with query parameters
 * @returns Validated and typed data
 *
 * @example
 * ```ts
 * const { searchParams } = new URL(request.url)
 * const params = validateQuery(paginationSchema, searchParams)
 * ```
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): T {
  // Convert URLSearchParams to object if needed
  const paramsObj = searchParams instanceof URLSearchParams
    ? Object.fromEntries(searchParams.entries())
    : searchParams

  return schema.parse(paramsObj)
}

/**
 * Helper function to validate route parameters
 *
 * @param schema - Zod schema to validate against
 * @param params - Route parameters (usually from Next.js)
 * @returns Validated and typed data
 *
 * @example
 * ```ts
 * const { agentSlug } = validateParams(agentSlugParamSchema, await params)
 * ```
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  return schema.parse(params)
}
