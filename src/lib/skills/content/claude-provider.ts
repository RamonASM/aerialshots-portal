/**
 * Claude Provider
 *
 * Wrapper for Anthropic Claude API that can be mocked in tests.
 * Includes circuit breaker protection for resilience.
 */

import { withCircuitBreaker, CircuitOpenError } from '@/lib/resilience/circuit-breaker'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: string
  tokensUsed: number
  model: string
}

/**
 * Generate content with Claude
 * Wrapped with circuit breaker for resilience against API failures.
 */
export async function generateWithClaude(
  prompt: string,
  options: {
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    model?: string
  } = {}
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  const {
    systemPrompt,
    maxTokens = 1000,
    temperature = 0.7,
    model = 'claude-3-haiku-20240307',
  } = options

  const messages: ClaudeMessage[] = [{ role: 'user', content: prompt }]

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  try {
    return await withCircuitBreaker('claude-api', async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()

        // Parse error for specific error codes
        if (response.status === 401) {
          throw new Error('Invalid API key')
        } else if (response.status === 429) {
          throw new Error('Rate limited')
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorText}`)
        }

        throw new Error(`Claude API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      return {
        content: data.content[0].text,
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        model,
      }
    }, { timeout: 60000 }) // 60 second timeout for Claude API calls
  } catch (error) {
    // Re-throw CircuitOpenError with more context
    if (error instanceof CircuitOpenError) {
      throw new Error(`Claude API circuit is open due to repeated failures. Please try again later.`)
    }
    throw error
  }
}

/**
 * Parse JSON from Claude response (handles markdown code blocks)
 */
export function parseJsonResponse<T>(response: string): T {
  let jsonStr = response.trim()

  // Extract from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Try to find JSON object or array
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)

  if (objectMatch && jsonStr.trim().startsWith('{')) {
    jsonStr = objectMatch[0]
  } else if (arrayMatch && jsonStr.trim().startsWith('[')) {
    jsonStr = arrayMatch[0]
  }

  return JSON.parse(jsonStr) as T
}

/**
 * Extract array from Claude response
 */
export function parseArrayResponse<T>(response: string): T[] {
  let jsonStr = response.trim()

  // Extract from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Find array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    return JSON.parse(arrayMatch[0]) as T[]
  }

  throw new Error('No array found in response')
}
