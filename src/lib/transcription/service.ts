// Transcription service using OpenAI Whisper API

export const SUPPORTED_FORMATS = ['mp3', 'wav', 'webm', 'm4a', 'ogg', 'flac'] as const
export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB - OpenAI Whisper limit

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]

export interface TranscriptionResult {
  success: boolean
  transcript?: string
  error?: string
  duration?: number
  language?: string
}

export interface TranscriptionError {
  code: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates an audio file before transcription
 */
export function validateAudioFile(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = Math.round(file.size / (1024 * 1024))
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is 25MB.`,
    }
  }

  // Check file format
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeType = file.type.toLowerCase()

  const isValidExtension = extension && SUPPORTED_FORMATS.includes(extension as SupportedFormat)
  const isValidMimeType =
    mimeType.startsWith('audio/') ||
    mimeType === 'application/ogg' ||
    mimeType === 'video/webm' // webm can contain audio

  if (!isValidExtension && !isValidMimeType) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Transcribes audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  file: File,
  language: string = 'en'
): Promise<TranscriptionResult> {
  // Validate file first
  const validation = validateAudioFile(file)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    }
  }

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(30000), // 30 second timeout for transcription
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `API error: ${response.status}`
      return {
        success: false,
        error: errorMessage,
      }
    }

    const data = await response.json()

    return {
      success: true,
      transcript: data.text,
      language: data.language || language,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Network error: ${message}`,
    }
  }
}

/**
 * Cleans and normalizes transcript text
 */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Estimates word count from transcript
 */
export function getWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Estimates story type from transcript content (basic heuristics)
 */
export function estimateStoryType(
  transcript: string
): 'against_the_odds' | 'fresh_drop' | 'behind_the_deal' | null {
  const lower = transcript.toLowerCase()

  // Against the Odds indicators
  const oddsKeywords = [
    'bidding war',
    'multiple offers',
    'competition',
    'challenge',
    'difficult',
    'obstacle',
    'overcome',
    'beat out',
    'won the',
    'against all odds',
  ]

  // Fresh Drop indicators
  const freshKeywords = [
    'new listing',
    'just listed',
    'coming soon',
    'hitting the market',
    'now available',
    'brand new',
    'fresh on',
    'excited to announce',
  ]

  // Behind the Deal indicators
  const dealKeywords = [
    'just closed',
    'sold',
    'congratulations',
    'keys',
    'closing day',
    'settlement',
    'finally closed',
    'happy clients',
    'new homeowners',
  ]

  const oddsScore = oddsKeywords.filter((k) => lower.includes(k)).length
  const freshScore = freshKeywords.filter((k) => lower.includes(k)).length
  const dealScore = dealKeywords.filter((k) => lower.includes(k)).length

  const maxScore = Math.max(oddsScore, freshScore, dealScore)
  if (maxScore === 0) return null

  if (oddsScore === maxScore) return 'against_the_odds'
  if (freshScore === maxScore) return 'fresh_drop'
  return 'behind_the_deal'
}
