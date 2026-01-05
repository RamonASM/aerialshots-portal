/**
 * Safe JSON Parsing Utilities
 *
 * Provides type-safe JSON parsing with optional Zod validation
 * to prevent runtime errors from malformed JSON data.
 */

import { z, ZodType, ZodError } from 'zod'

export interface SafeParseResult<T> {
  success: true
  data: T
}

export interface SafeParseError {
  success: false
  error: string
  data: undefined
}

export type SafeParseReturn<T> = SafeParseResult<T> | SafeParseError

/**
 * Safely parse JSON string with optional schema validation
 *
 * @param json - The JSON string to parse
 * @param schema - Optional Zod schema to validate against
 * @param fallback - Optional fallback value if parsing/validation fails
 * @returns SafeParseReturn with success status and data/error
 *
 * @example
 * // Basic usage
 * const result = safeJsonParse<User>('{"name": "John"}')
 * if (result.success) {
 *   console.log(result.data.name)
 * }
 *
 * @example
 * // With Zod schema
 * const UserSchema = z.object({ name: z.string(), age: z.number() })
 * const result = safeJsonParse('{"name": "John", "age": 30}', UserSchema)
 */
export function safeJsonParse<T>(
  json: string,
  schema?: ZodType<T>
): SafeParseReturn<T> {
  try {
    const parsed = JSON.parse(json)

    if (schema) {
      const result = schema.safeParse(parsed)
      if (result.success) {
        return { success: true, data: result.data }
      }
      return {
        success: false,
        error: `Schema validation failed: ${formatZodError(result.error)}`,
        data: undefined,
      }
    }

    return { success: true, data: parsed as T }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error',
      data: undefined,
    }
  }
}

/**
 * Parse JSON with a fallback value if parsing fails
 *
 * @param json - The JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @param schema - Optional Zod schema to validate against
 * @returns Parsed data or fallback value
 *
 * @example
 * const user = parseJsonWithFallback<User>('invalid', { name: 'Unknown', age: 0 })
 */
export function parseJsonWithFallback<T>(
  json: string,
  fallback: T,
  schema?: ZodType<T>
): T {
  const result = safeJsonParse(json, schema)
  return result.success ? result.data : fallback
}

/**
 * Parse AI-generated JSON responses
 *
 * Handles common AI response formats:
 * - JSON wrapped in markdown code blocks (```json ... ```)
 * - JSON with leading/trailing text
 * - Multiple JSON objects (returns first valid one)
 *
 * @param response - The AI response string
 * @param schema - Optional Zod schema to validate against
 * @returns Parsed data or null if no valid JSON found
 *
 * @example
 * const content = parseAiJsonResponse<ContentResult>(aiResponse, ContentSchema)
 * if (content) {
 *   console.log(content.title)
 * }
 */
export function parseAiJsonResponse<T>(
  response: string,
  schema?: ZodType<T>
): T | null {
  if (!response || typeof response !== 'string') {
    return null
  }

  // Remove markdown code block wrappers
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Try to extract JSON object or array
  const jsonPatterns = [
    // Match object
    /\{[\s\S]*\}/,
    // Match array
    /\[[\s\S]*\]/,
  ]

  for (const pattern of jsonPatterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const result = safeJsonParse<T>(match[0], schema)
      if (result.success) {
        return result.data
      }
    }
  }

  // Try parsing the whole string as a last resort
  const result = safeJsonParse<T>(cleaned, schema)
  if (result.success) {
    return result.data
  }

  return null
}

/**
 * Parse JSONB column from Supabase
 *
 * Handles cases where JSONB might come as:
 * - Already parsed object
 * - JSON string
 * - null/undefined
 *
 * @param value - The value to parse
 * @param schema - Optional Zod schema to validate against
 * @returns Parsed data or null
 */
export function parseJsonbColumn<T>(
  value: unknown,
  schema?: ZodType<T>
): T | null {
  if (value === null || value === undefined) {
    return null
  }

  // Already an object
  if (typeof value === 'object') {
    if (schema) {
      const result = schema.safeParse(value)
      return result.success ? result.data : null
    }
    return value as T
  }

  // String that needs parsing
  if (typeof value === 'string') {
    const result = safeJsonParse<T>(value, schema)
    return result.success ? result.data : null
  }

  return null
}

/**
 * Safely stringify to JSON with error handling
 *
 * @param value - Value to stringify
 * @param pretty - Whether to format with indentation
 * @returns JSON string or error message
 */
export function safeJsonStringify(
  value: unknown,
  pretty: boolean = false
): string {
  try {
    return JSON.stringify(value, null, pretty ? 2 : undefined)
  } catch (error) {
    return `[Stringify Error: ${error instanceof Error ? error.message : 'Unknown'}]`
  }
}

/**
 * Format Zod error for readable output
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map(e => `${e.path.join('.')}: ${e.message}`)
    .join(', ')
}

/**
 * Type guard to check if value is valid JSON string
 */
export function isValidJsonString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

/**
 * Deep merge two objects (useful for JSONB updates)
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }

  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>]
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>]
    }
  }

  return result
}

/**
 * Common Zod schemas for reuse
 */
export const CommonSchemas = {
  /** UUID string */
  uuid: z.string().uuid(),

  /** Non-empty string */
  nonEmptyString: z.string().min(1),

  /** Email string */
  email: z.string().email(),

  /** URL string */
  url: z.string().url(),

  /** Positive integer */
  positiveInt: z.number().int().positive(),

  /** Non-negative number */
  nonNegative: z.number().nonnegative(),

  /** ISO date string */
  isoDate: z.string().datetime(),

  /** Boolean or boolean-like string */
  booleanLike: z.union([
    z.boolean(),
    z.enum(['true', 'false']).transform(v => v === 'true'),
  ]),
}
