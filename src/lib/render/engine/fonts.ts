/**
 * Font Loading and Caching
 * Loads fonts for Satori rendering with LRU cache
 */

import path from 'path'
import fs from 'fs/promises'

// =====================
// CONSTANTS
// =====================

export const DEFAULT_FONT = 'Inter'

export const AVAILABLE_FONTS = [
  'Inter',
  'Playfair Display',
  'Montserrat',
  'Roboto',
  'Poppins',
  'Open Sans',
  'Lato',
  'Oswald',
  'Raleway',
  'Merriweather',
] as const

export type FontFamily = typeof AVAILABLE_FONTS[number]

// Font file mapping
const FONT_FILES: Record<string, { regular: string; bold: string }> = {
  'Inter': {
    regular: 'Inter-Regular.ttf',
    bold: 'Inter-Bold.ttf',
  },
  'Playfair Display': {
    regular: 'PlayfairDisplay-Regular.ttf',
    bold: 'PlayfairDisplay-Bold.ttf',
  },
  'Montserrat': {
    regular: 'Montserrat-Regular.ttf',
    bold: 'Montserrat-Bold.ttf',
  },
  'Roboto': {
    regular: 'Roboto-Regular.ttf',
    bold: 'Roboto-Bold.ttf',
  },
  'Poppins': {
    regular: 'Poppins-Regular.ttf',
    bold: 'Poppins-Bold.ttf',
  },
  'Open Sans': {
    regular: 'OpenSans-Regular.ttf',
    bold: 'OpenSans-Bold.ttf',
  },
  'Lato': {
    regular: 'Lato-Regular.ttf',
    bold: 'Lato-Bold.ttf',
  },
  'Oswald': {
    regular: 'Oswald-Regular.ttf',
    bold: 'Oswald-Bold.ttf',
  },
  'Raleway': {
    regular: 'Raleway-Regular.ttf',
    bold: 'Raleway-Bold.ttf',
  },
  'Merriweather': {
    regular: 'Merriweather-Regular.ttf',
    bold: 'Merriweather-Bold.ttf',
  },
}

// =====================
// SECURITY CONSTANTS
// =====================

// Maximum font file size (5MB)
const MAX_FONT_SIZE_BYTES = 5 * 1024 * 1024

// Maximum total cache size in bytes (50MB)
const MAX_CACHE_BYTES = 50 * 1024 * 1024

// Allowed domains for font fetching (SSRF protection)
const ALLOWED_FONT_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]

// =====================
// LRU CACHE
// =====================

const MAX_CACHE_SIZE = 20
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CacheEntry {
  data: ArrayBuffer
  timestamp: number
  sizeBytes: number
}

let currentCacheBytes = 0
const fontCache = new Map<string, CacheEntry>()

function getCached(key: string): ArrayBuffer | null {
  const entry = fontCache.get(key)
  if (!entry) return null

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    currentCacheBytes -= entry.sizeBytes
    fontCache.delete(key)
    return null
  }

  // Move to end (most recently used)
  fontCache.delete(key)
  fontCache.set(key, entry)

  return entry.data
}

function setCache(key: string, data: ArrayBuffer): void {
  const sizeBytes = data.byteLength

  // Reject fonts that exceed maximum size
  if (sizeBytes > MAX_FONT_SIZE_BYTES) {
    console.warn(`[Fonts] Font ${key} exceeds max size (${sizeBytes} > ${MAX_FONT_SIZE_BYTES})`)
    return
  }

  // Evict oldest entries if at capacity (count-based)
  while (fontCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = fontCache.keys().next().value
    if (oldestKey) {
      const entry = fontCache.get(oldestKey)
      if (entry) currentCacheBytes -= entry.sizeBytes
      fontCache.delete(oldestKey)
    }
  }

  // Evict oldest entries if total bytes exceeded
  while (currentCacheBytes + sizeBytes > MAX_CACHE_BYTES && fontCache.size > 0) {
    const oldestKey = fontCache.keys().next().value
    if (oldestKey) {
      const entry = fontCache.get(oldestKey)
      if (entry) currentCacheBytes -= entry.sizeBytes
      fontCache.delete(oldestKey)
    }
  }

  fontCache.set(key, {
    data,
    timestamp: Date.now(),
    sizeBytes,
  })
  currentCacheBytes += sizeBytes
}

// =====================
// FONT LOADING
// =====================

/**
 * Load a single font file
 */
export async function loadFont(
  fontFamily: string,
  weight: 'regular' | 'bold'
): Promise<ArrayBuffer> {
  const cacheKey = `${fontFamily}-${weight}`

  // Check cache first
  const cached = getCached(cacheKey)
  if (cached) return cached

  // Get font file name, fallback to Inter if not found
  const fontConfig = FONT_FILES[fontFamily] || FONT_FILES[DEFAULT_FONT]
  const fontFile = fontConfig[weight]

  try {
    // Try loading from local fonts directory
    const fontPath = path.join(process.cwd(), 'public', 'fonts', fontFile)

    // Check file size before reading (DoS protection)
    const stats = await fs.stat(fontPath)
    if (stats.size > MAX_FONT_SIZE_BYTES) {
      throw new Error(`Font file too large: ${stats.size} bytes (max ${MAX_FONT_SIZE_BYTES})`)
    }

    const buffer = await fs.readFile(fontPath)
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )

    setCache(cacheKey, arrayBuffer)
    return arrayBuffer
  } catch {
    // Fallback: fetch from Google Fonts
    return await fetchGoogleFont(fontFamily, weight)
  }
}

/**
 * Validate that a URL is from an allowed font domain (SSRF protection)
 */
function isAllowedFontUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_FONT_DOMAINS.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Fetch font from Google Fonts API
 */
async function fetchGoogleFont(
  fontFamily: string,
  weight: 'regular' | 'bold'
): Promise<ArrayBuffer> {
  const cacheKey = `${fontFamily}-${weight}-google`

  const cached = getCached(cacheKey)
  if (cached) return cached

  const fontWeight = weight === 'bold' ? '700' : '400'
  const familyParam = fontFamily.replace(/ /g, '+')

  try {
    // Fetch the CSS to get the font URL
    const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${fontWeight}&display=swap`

    // Validate URL before fetching (SSRF protection)
    if (!isAllowedFontUrl(cssUrl)) {
      throw new Error(`Invalid font CSS URL: ${cssUrl}`)
    }

    const cssResponse = await fetch(cssUrl, {
      headers: {
        // Use a modern user agent to get woff2 format
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    const css = await cssResponse.text()

    // Extract the font URL from CSS
    const urlMatch = css.match(/src: url\(([^)]+)\)/)
    if (!urlMatch) {
      throw new Error(`Could not find font URL for ${fontFamily}`)
    }

    const fontUrl = urlMatch[1]

    // Validate font file URL before fetching (SSRF protection)
    if (!isAllowedFontUrl(fontUrl)) {
      throw new Error(`Invalid font file URL: ${fontUrl.slice(0, 100)}`)
    }

    // Fetch the actual font file
    const fontResponse = await fetch(fontUrl, {
      signal: AbortSignal.timeout(15000),
    })

    // Validate content length before reading
    const contentLength = fontResponse.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_FONT_SIZE_BYTES) {
      throw new Error(`Font file too large: ${contentLength} bytes`)
    }

    const arrayBuffer = await fontResponse.arrayBuffer()

    // Double-check actual size
    if (arrayBuffer.byteLength > MAX_FONT_SIZE_BYTES) {
      throw new Error(`Font file exceeds size limit: ${arrayBuffer.byteLength} bytes`)
    }

    setCache(cacheKey, arrayBuffer)
    return arrayBuffer
  } catch (error) {
    // If Google Fonts fails, try to load Inter as ultimate fallback
    if (fontFamily !== DEFAULT_FONT) {
      console.warn(`Failed to load ${fontFamily}, falling back to ${DEFAULT_FONT}`)
      return loadFont(DEFAULT_FONT, weight)
    }
    throw error
  }
}

/**
 * Load all fonts needed for a brand kit
 * Returns array in Satori font format
 */
export async function loadFonts(fontFamily: string): Promise<Array<{
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}>> {
  const [regular, bold] = await Promise.all([
    loadFont(fontFamily, 'regular'),
    loadFont(fontFamily, 'bold'),
  ])

  return [
    { name: fontFamily, data: regular, weight: 400, style: 'normal' as const },
    { name: fontFamily, data: bold, weight: 700, style: 'normal' as const },
  ]
}

/**
 * Load multiple font families
 */
export async function loadMultipleFonts(fontFamilies: string[]): Promise<Array<{
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}>> {
  const fontArrays = await Promise.all(
    fontFamilies.map(family => loadFonts(family))
  )
  return fontArrays.flat()
}

/**
 * Clear the font cache (useful for testing)
 */
export function clearFontCache(): void {
  fontCache.clear()
  currentCacheBytes = 0
}

/**
 * Get cache stats (useful for monitoring)
 */
export function getFontCacheStats(): {
  size: number
  maxSize: number
  sizeBytes: number
  maxSizeBytes: number
  maxFontBytes: number
} {
  return {
    size: fontCache.size,
    maxSize: MAX_CACHE_SIZE,
    sizeBytes: currentCacheBytes,
    maxSizeBytes: MAX_CACHE_BYTES,
    maxFontBytes: MAX_FONT_SIZE_BYTES,
  }
}
