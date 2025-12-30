/**
 * Gemini Provider
 *
 * Wrapper for Google Generative AI that can be mocked in tests.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

let genAIInstance: GoogleGenerativeAI | null = null

/**
 * Get or create the Gemini client
 */
export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set')
  }

  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey)
  }

  return genAIInstance
}

/**
 * Reset the client (for testing)
 */
export function resetGeminiClient(): void {
  genAIInstance = null
}

/**
 * Convert image URL to base64 for Gemini
 */
export async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // If already base64 data URL, extract it
  if (url.startsWith('data:')) {
    const [header, base64] = url.split(',')
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/jpeg'
    return { base64, mimeType }
  }

  // Fetch the image
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return { base64, mimeType: contentType }
}

/**
 * Generate content with Gemini
 */
export async function generateWithGemini(
  prompt: string,
  imageData?: { base64: string; mimeType: string },
  model: string = 'gemini-2.0-flash-exp'
): Promise<string> {
  const genAI = getGeminiClient()
  const genModel = genAI.getGenerativeModel({ model })

  const parts: (string | { inlineData: { mimeType: string; data: string } })[] = [prompt]

  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64,
      },
    })
  }

  const result = await genModel.generateContent(parts)
  return result.response.text()
}

/**
 * Parse JSON from Gemini response (handles markdown code blocks)
 */
export function parseJsonResponse<T>(response: string): T {
  let jsonStr = response

  // Extract from markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  // Try to find array in response
  const arrayMatch = jsonStr.match(/\[[\s\S]*?\]/)
  if (arrayMatch && jsonStr.trim().startsWith('[')) {
    jsonStr = arrayMatch[0]
  }

  return JSON.parse(jsonStr.trim()) as T
}
