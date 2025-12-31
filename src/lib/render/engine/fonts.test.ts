/**
 * Font Loading Tests
 *
 * Tests for font loading, caching, and SSRF protection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadFont,
  loadFonts,
  loadMultipleFonts,
  clearFontCache,
  getFontCacheStats,
  AVAILABLE_FONTS,
  DEFAULT_FONT,
} from './fonts'

// Create mock functions with vi.hoisted to ensure they're available before vi.mock
const { mockStat, mockReadFile } = vi.hoisted(() => ({
  mockStat: vi.fn(),
  mockReadFile: vi.fn(),
}))

// Mock fs for file operations
vi.mock('fs/promises', () => ({
  default: {
    stat: mockStat,
    readFile: mockReadFile,
  },
  stat: mockStat,
  readFile: mockReadFile,
}))

// Mock fetch for Google Fonts API
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create a proper Buffer that works with buffer.buffer.slice
function createMockBuffer(content: string): Buffer {
  const buffer = Buffer.from(content)
  return buffer
}

describe('Font Constants', () => {
  it('should have Inter as the default font', () => {
    expect(DEFAULT_FONT).toBe('Inter')
  })

  it('should have a list of available fonts', () => {
    expect(AVAILABLE_FONTS).toContain('Inter')
    expect(AVAILABLE_FONTS).toContain('Playfair Display')
    expect(AVAILABLE_FONTS).toContain('Montserrat')
    expect(AVAILABLE_FONTS.length).toBeGreaterThan(0)
  })
})

describe('Font Cache', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
  })

  it('should start with empty cache', () => {
    const stats = getFontCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.sizeBytes).toBe(0)
  })

  it('should have reasonable limits', () => {
    const stats = getFontCacheStats()
    expect(stats.maxSize).toBeGreaterThan(0)
    expect(stats.maxSizeBytes).toBeGreaterThan(0)
    expect(stats.maxFontBytes).toBe(5 * 1024 * 1024) // 5MB
  })

  it('should clear cache properly', () => {
    // Simulate adding to cache by loading a font
    clearFontCache()
    const stats = getFontCacheStats()
    expect(stats.size).toBe(0)
    expect(stats.sizeBytes).toBe(0)
  })
})

describe('loadFont', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load a font from local files', async () => {
    const mockBuffer = createMockBuffer('mock-font-data')

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await loadFont('Inter', 'regular')

    expect(result).toBeDefined()
    expect(result.byteLength).toBeGreaterThan(0)
  })

  it('should cache loaded fonts', async () => {
    const mockBuffer = createMockBuffer('mock-font-data')

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    // First load
    await loadFont('Inter', 'regular')
    const statsAfterFirst = getFontCacheStats()

    // Second load (should hit cache)
    await loadFont('Inter', 'regular')
    const statsAfterSecond = getFontCacheStats()

    // fs.readFile should only be called once
    expect(mockReadFile).toHaveBeenCalledTimes(1)
    expect(statsAfterFirst.size).toBe(statsAfterSecond.size)
  })

  it('should reject fonts exceeding size limit', async () => {
    const largeSize = 10 * 1024 * 1024 // 10MB

    mockStat.mockResolvedValue({
      size: largeSize,
    } as any)

    // Mock Google Fonts as fallback
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`src: url(https://fonts.gstatic.com/test.woff2)`),
    })
    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '100000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100000)),
    })

    // Should fallback to Google Fonts when local file is too large
    await expect(loadFont('Inter', 'regular')).resolves.toBeDefined()
  })

  it('should fallback to Google Fonts when local file not found', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    // Mock Google Fonts CSS response
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        @font-face {
          src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2);
        }
      `),
    })

    // Mock font file response
    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '50000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    const result = await loadFont('Inter', 'regular')

    expect(result).toBeDefined()
    expect(mockFetch).toHaveBeenCalled()
  })

  it('should fallback to Inter when unknown font requested', async () => {
    const mockBuffer = Buffer.from('inter-font-data')

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await loadFont('UnknownFont', 'regular')

    expect(result).toBeDefined()
    // Should have loaded Inter instead
  })
})

describe('loadFonts', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should load both regular and bold weights', async () => {
    const mockBuffer = createMockBuffer('mock-font-data')

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await loadFonts('Inter')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: 'Inter',
      weight: 400,
      style: 'normal',
    })
    expect(result[1]).toMatchObject({
      name: 'Inter',
      weight: 700,
      style: 'normal',
    })
  })

  it('should return properly formatted Satori font objects', async () => {
    const mockBuffer = createMockBuffer('mock-font-data')

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await loadFonts('Inter')

    for (const font of result) {
      expect(font).toHaveProperty('name')
      expect(font).toHaveProperty('data')
      expect(font).toHaveProperty('weight')
      expect(font).toHaveProperty('style')
      // Data should be array-like (ArrayBuffer or typed array)
      expect(font.data).toBeDefined()
      expect(font.data.byteLength).toBeGreaterThan(0)
    }
  })
})

describe('loadMultipleFonts', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should load multiple font families', async () => {
    const mockBuffer = createMockBuffer('mock-font-data')

    // Mock all 4 font file loads (Inter regular, Inter bold, Roboto regular, Roboto bold)
    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await loadMultipleFonts(['Inter', 'Roboto'])

    // 2 fonts × 2 weights = 4 font objects
    expect(result).toHaveLength(4)

    const interFonts = result.filter(f => f.name === 'Inter')
    const robotoFonts = result.filter(f => f.name === 'Roboto')

    expect(interFonts).toHaveLength(2)
    expect(robotoFonts).toHaveLength(2)
  })

  it('should handle empty array', async () => {
    const result = await loadMultipleFonts([])
    expect(result).toHaveLength(0)
  })
})

describe('SSRF Protection', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should only allow fonts from Google Fonts domains', async () => {
    // When local file fails, it should only fetch from allowed domains
    mockStat.mockRejectedValue(new Error('ENOENT'))

    // Valid Google Fonts response
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2)
      `),
    })

    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '50000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    await expect(loadFont('Inter', 'regular')).resolves.toBeDefined()

    // Verify fetch was called with Google Fonts URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('fonts.googleapis.com'),
      expect.any(Object)
    )
  })

  it('should reject font URLs from untrusted domains', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    // Malicious CSS pointing to external URL
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://evil.com/malicious.woff2)
      `),
    })

    // After rejection, it will try to load Inter as fallback
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2)
      `),
    })

    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '50000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    // Should eventually succeed by falling back to Inter
    const result = await loadFont('TestFont', 'regular')
    expect(result).toBeDefined()
  })

  it('should reject font files that exceed size limit from remote', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2)
      `),
    })

    // Font file with large content-length
    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '10000000']]), // 10MB
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    // Should fall back to loading Inter
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2)
      `),
    })

    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '50000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    const result = await loadFont('TestFont', 'regular')
    expect(result).toBeDefined()
  })

  it('should include timeout on fetch requests', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(`
        src: url(https://fonts.gstatic.com/s/inter/v12/test.woff2)
      `),
    })

    mockFetch.mockResolvedValueOnce({
      headers: new Map([['content-length', '50000']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50000)),
    })

    await loadFont('Inter', 'regular')

    // Check that fetch was called with signal for timeout
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    )
  })
})

describe('Cache Eviction', () => {
  beforeEach(() => {
    clearFontCache()
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should track cache size in bytes', async () => {
    const mockBuffer = createMockBuffer('a'.repeat(1000)) // 1KB

    mockStat.mockResolvedValue({
      size: mockBuffer.length,
    } as any)

    mockReadFile.mockResolvedValue(mockBuffer)

    await loadFont('Inter', 'regular')

    const stats = getFontCacheStats()
    expect(stats.sizeBytes).toBeGreaterThan(0)
  })

  it('should report max cache sizes', () => {
    const stats = getFontCacheStats()

    expect(stats.maxSize).toBe(20) // Max 20 entries
    expect(stats.maxSizeBytes).toBe(50 * 1024 * 1024) // 50MB
    expect(stats.maxFontBytes).toBe(5 * 1024 * 1024) // 5MB per font
  })
})

describe('Available Fonts', () => {
  it('should include all expected font families', () => {
    const expectedFonts = [
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
    ]

    for (const font of expectedFonts) {
      expect(AVAILABLE_FONTS).toContain(font)
    }
  })

  it('should have at least 10 fonts available', () => {
    expect(AVAILABLE_FONTS.length).toBeGreaterThanOrEqual(10)
  })
})
