/**
 * Gemini Virtual Staging Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateStagedImage } from '../client'
import * as geminiProvider from '../providers/gemini'
import { createAdminClient } from '@/lib/supabase/admin'

// Mock the Gemini provider
vi.mock('../providers/gemini', () => ({
  generateWithGemini: vi.fn(),
}))

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('Gemini Virtual Staging Integration', () => {
  const createMockStorageBucket = () => ({
    upload: vi.fn().mockResolvedValue({
      data: { path: 'virtual-staging/test.jpg' },
      error: null,
    }),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: 'https://storage.example.com/virtual-staging/test.jpg' },
    })),
  })

  const mockSupabase = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-staging-id',
              original_url: 'https://example.com/room.jpg',
              room_type: 'living_room',
              style: 'modern',
              provider: 'gemini',
              status: 'processing',
            },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    storage: {
      from: vi.fn(() => createMockStorageBucket()),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)
  })

  it('should successfully generate and upload a staged image using Gemini', async () => {
    // Mock successful Gemini response
    vi.mocked(geminiProvider.generateWithGemini).mockResolvedValue({
      success: true,
      imageBase64: Buffer.from('fake-image-data').toString('base64'),
      processingTime: 5000,
      provider: 'gemini',
      status: 'success',
    })

    const result = await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'living_room',
      style: 'modern',
      provider: 'gemini',
    })

    expect(result.success).toBe(true)
    expect(result.staged_url).toBe('https://storage.example.com/virtual-staging/test.jpg')
    expect(geminiProvider.generateWithGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://example.com/room.jpg',
        roomType: 'living_room',
        style: 'modern',
      })
    )
  })

  it('should handle Gemini API configuration errors', async () => {
    // Mock Gemini not configured
    vi.mocked(geminiProvider.generateWithGemini).mockResolvedValue({
      success: false,
      error: 'GOOGLE_AI_API_KEY not configured',
      provider: 'gemini',
      status: 'not_configured',
    })

    const result = await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'living_room',
      style: 'modern',
      provider: 'gemini',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should handle Gemini generation failures', async () => {
    // Mock Gemini generation error
    vi.mocked(geminiProvider.generateWithGemini).mockResolvedValue({
      success: false,
      error: 'Image generation failed',
      processingTime: 3000,
      provider: 'gemini',
      status: 'error',
    })

    const result = await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'bedroom',
      style: 'scandinavian',
      provider: 'gemini',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should handle Supabase upload failures', async () => {
    // Mock successful Gemini but failed upload
    vi.mocked(geminiProvider.generateWithGemini).mockResolvedValue({
      success: true,
      imageBase64: Buffer.from('fake-image-data').toString('base64'),
      processingTime: 5000,
      provider: 'gemini',
      status: 'success',
    })

    // Mock upload failure
    mockSupabase.storage.from = vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Upload failed'),
      }),
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: 'https://storage.example.com/virtual-staging/test.jpg' },
      })),
    }))

    const result = await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'kitchen',
      style: 'modern',
      provider: 'gemini',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('should pass all styling parameters to Gemini', async () => {
    vi.mocked(geminiProvider.generateWithGemini).mockResolvedValue({
      success: true,
      imageBase64: Buffer.from('fake-image-data').toString('base64'),
      processingTime: 5000,
      provider: 'gemini',
      status: 'success',
    })

    await generateStagedImage({
      image_url: 'https://example.com/room.jpg',
      room_type: 'dining_room',
      style: 'luxury',
      provider: 'gemini',
      remove_existing_furniture: true,
      furniture_items: ['chandelier', 'dining_table', 'chairs'],
      placement_hints: ['Center the table', 'Add artwork on wall'],
    })

    expect(geminiProvider.generateWithGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: 'https://example.com/room.jpg',
        roomType: 'dining_room',
        style: 'luxury',
      })
    )

    // Verify prompt contains luxury styling (case-insensitive)
    const callArgs = vi.mocked(geminiProvider.generateWithGemini).mock.calls[0][0]
    expect(callArgs.prompt.toLowerCase()).toContain('luxury')
  })
})
