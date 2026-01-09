import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { registerSkill, clearRegistry, executeSkill } from '../index'
import { imageAnalyzeSkill } from './analyze'
import { imageGenerateSkill } from './generate'
import { imageInpaintSkill } from './inpaint'
import type {
  ImageAnalyzeInput,
  ImageAnalyzeOutput,
  ImageGenerateInput,
  ImageGenerateOutput,
  ImageInpaintInput,
  ImageInpaintOutput
} from './types'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  }),
}))

// Mock the render engine to avoid Satori initialization
vi.mock('@/lib/render/engine', () => ({
  renderWithSatori: vi.fn().mockResolvedValue({
    buffer: Buffer.from('mock-image'),
    width: 1080,
    height: 1080,
  }),
}))

// Mock the Gemini provider
const mockGenerateWithGemini = vi.fn()
const mockImageUrlToBase64 = vi.fn()
const mockParseJsonResponse = vi.fn()

vi.mock('./gemini-provider', () => ({
  generateWithGemini: (...args: unknown[]) => mockGenerateWithGemini(...args),
  imageUrlToBase64: (...args: unknown[]) => mockImageUrlToBase64(...args),
  parseJsonResponse: (...args: unknown[]) => mockParseJsonResponse(...args),
  getGeminiClient: vi.fn(),
  resetGeminiClient: vi.fn(),
}))

describe('Image Skills', () => {
  beforeEach(() => {
    clearRegistry()
    vi.clearAllMocks()

    // Set up environment
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'

    // Default mock for image URL to base64
    mockImageUrlToBase64.mockResolvedValue({
      base64: 'dGVzdC1pbWFnZS1kYXRh',
      mimeType: 'image/jpeg',
    })
  })

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY
  })

  describe('Image Analyze Skill', () => {
    beforeEach(() => {
      registerSkill(imageAnalyzeSkill)
    })

    it('should register the skill', () => {
      expect(imageAnalyzeSkill.id).toBe('image-analyze')
      expect(imageAnalyzeSkill.category).toBe('data')
      expect(imageAnalyzeSkill.provider).toBe('gemini')
    })

    it('should validate required fields', () => {
      const errors = imageAnalyzeSkill.validate!({} as ImageAnalyzeInput)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field === 'imageUrl')).toBe(true)
      expect(errors.some(e => e.field === 'analysisType')).toBe(true)
    })

    it('should validate analysis type', () => {
      const errors = imageAnalyzeSkill.validate!({
        imageUrl: 'https://example.com/image.jpg',
        analysisType: 'invalid' as ImageAnalyzeInput['analysisType'],
      })
      expect(errors.some(e => e.code === 'INVALID')).toBe(true)
    })

    it('should analyze room type successfully', async () => {
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify({
        roomType: 'living_room',
        roomConfidence: 0.95,
        hasFurniture: true,
        isEmpty: false,
        isExterior: false,
      }))
      mockParseJsonResponse.mockReturnValueOnce({
        roomType: 'living_room',
        roomConfidence: 0.95,
        hasFurniture: true,
        isEmpty: false,
        isExterior: false,
      })

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          analysisType: 'room',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageAnalyzeOutput
      expect(data?.roomType).toBe('living_room')
      expect(data?.roomConfidence).toBe(0.95)
    })

    it('should analyze objects in image', async () => {
      const analysisResult = {
        objects: [
          { label: 'sofa', confidence: 0.98 },
          { label: 'coffee table', confidence: 0.92 },
          { label: 'lamp', confidence: 0.85 },
        ],
        hasFurniture: true,
        isEmpty: false,
      }
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify(analysisResult))
      mockParseJsonResponse.mockReturnValueOnce(analysisResult)

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          analysisType: 'objects',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageAnalyzeOutput
      expect(data?.objects?.length).toBe(3)
      expect(data?.hasFurniture).toBe(true)
    })

    it('should analyze image quality', async () => {
      const qualityResult = {
        qualityScore: 85,
        qualityIssues: ['slight overexposure in window area'],
        brightness: 'bright',
      }
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify(qualityResult))
      mockParseJsonResponse.mockReturnValueOnce(qualityResult)

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          analysisType: 'quality',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageAnalyzeOutput
      expect(data?.qualityScore).toBe(85)
      expect(data?.qualityIssues).toHaveLength(1)
    })

    it('should analyze staging readiness', async () => {
      const stagingResult = {
        isEmpty: true,
        stagingReady: true,
        suggestedStyle: 'modern',
        stagingRecommendations: [
          'Add a sectional sofa',
          'Include a coffee table',
          'Add accent lighting',
        ],
      }
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify(stagingResult))
      mockParseJsonResponse.mockReturnValueOnce(stagingResult)

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/empty-room.jpg',
          analysisType: 'staging_readiness',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageAnalyzeOutput
      expect(data?.isEmpty).toBe(true)
      expect(data?.stagingReady).toBe(true)
      expect(data?.suggestedStyle).toBe('modern')
    })

    it('should handle API errors', async () => {
      mockGenerateWithGemini.mockRejectedValueOnce(new Error('API quota exceeded'))

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          analysisType: 'room',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('quota')
    })

    it('should handle missing API key', async () => {
      mockImageUrlToBase64.mockRejectedValueOnce(new Error('GOOGLE_AI_API_KEY environment variable is not set'))

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          analysisType: 'room',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INVALID_API_KEY')
    })

    it('should handle image fetch errors', async () => {
      mockImageUrlToBase64.mockRejectedValueOnce(new Error('Failed to fetch image: Not Found'))

      const result = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/missing.jpg',
          analysisType: 'room',
        },
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('IMAGE_FETCH_ERROR')
    })
  })

  describe('Image Generate Skill', () => {
    beforeEach(() => {
      registerSkill(imageGenerateSkill)
    })

    it('should register the skill', () => {
      expect(imageGenerateSkill.id).toBe('image-generate')
      expect(imageGenerateSkill.category).toBe('generate')
      expect(imageGenerateSkill.provider).toBe('gemini')
    })

    it('should validate prompt requirement', () => {
      const errors = imageGenerateSkill.validate!({
        width: 1024,
        height: 768,
      } as ImageGenerateInput)
      expect(errors.some(e => e.field === 'prompt')).toBe(true)
    })

    it('should accept roomType and style instead of prompt', () => {
      const errors = imageGenerateSkill.validate!({
        roomType: 'living_room',
        style: 'modern',
      } as ImageGenerateInput)
      expect(errors.length).toBe(0)
    })

    it('should validate dimensions', () => {
      const errors = imageGenerateSkill.validate!({
        prompt: 'test',
        width: 100, // Too small
        height: 5000, // Too large
      })
      expect(errors.some(e => e.field === 'width')).toBe(true)
      expect(errors.some(e => e.field === 'height')).toBe(true)
    })

    it('should generate image from prompt', async () => {
      mockGenerateWithGemini.mockResolvedValueOnce('Image generated successfully')

      const result = await executeSkill({
        skillId: 'image-generate',
        input: {
          prompt: 'A modern living room with minimalist furniture',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageGenerateOutput
      expect(data?.provider).toBe('gemini')
    })

    it('should generate staging from source image', async () => {
      mockGenerateWithGemini.mockResolvedValueOnce('Staged image generated')

      const result = await executeSkill({
        skillId: 'image-generate',
        input: {
          prompt: 'Stage this room',
          sourceImage: 'https://example.com/empty-room.jpg',
          roomType: 'living_room',
          style: 'modern',
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageGenerateOutput
      expect(data?.processingTimeMs).toBeDefined()
    })

    it('should estimate cost correctly', async () => {
      const standardCost = await imageGenerateSkill.estimateCost!({
        prompt: 'test',
        quality: 'standard',
      })
      expect(standardCost).toBe(0.002)

      const hdCost = await imageGenerateSkill.estimateCost!({
        prompt: 'test',
        quality: 'hd',
      })
      expect(hdCost).toBe(0.004)
    })
  })

  describe('Image Inpaint Skill', () => {
    beforeEach(() => {
      registerSkill(imageInpaintSkill)
    })

    it('should register the skill', () => {
      expect(imageInpaintSkill.id).toBe('image-inpaint')
      expect(imageInpaintSkill.category).toBe('transform')
      expect(imageInpaintSkill.provider).toBe('gemini')
    })

    it('should validate required fields', () => {
      const errors = imageInpaintSkill.validate!({} as ImageInpaintInput)
      expect(errors.some(e => e.field === 'imageUrl')).toBe(true)
    })

    it('should require removal target', () => {
      const errors = imageInpaintSkill.validate!({
        imageUrl: 'https://example.com/room.jpg',
      })
      expect(errors.some(e => e.field === 'objectsToRemove')).toBe(true)
    })

    it('should accept removeAllFurniture flag', () => {
      const errors = imageInpaintSkill.validate!({
        imageUrl: 'https://example.com/room.jpg',
        removeAllFurniture: true,
      })
      expect(errors.length).toBe(0)
    })

    it('should accept custom prompt', () => {
      const errors = imageInpaintSkill.validate!({
        imageUrl: 'https://example.com/room.jpg',
        prompt: 'Remove all clutter from this room',
      })
      expect(errors.length).toBe(0)
    })

    it('should detect and remove specific objects', async () => {
      // First call: detect objects, returns JSON response
      mockGenerateWithGemini.mockResolvedValueOnce('["sofa", "coffee table"]')
      mockParseJsonResponse.mockReturnValueOnce(['sofa', 'coffee table'])
      // Second call: inpaint
      mockGenerateWithGemini.mockResolvedValueOnce('Objects removed successfully')

      const result = await executeSkill({
        skillId: 'image-inpaint',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          objectsToRemove: ['sofa', 'coffee table', 'lamp'],
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageInpaintOutput
      expect(data?.objectsRemoved).toContain('sofa')
      expect(data?.objectsRemoved).toContain('coffee table')
    })

    it('should remove all furniture when flag set', async () => {
      // First call: detect all furniture
      mockGenerateWithGemini.mockResolvedValueOnce('["sofa", "coffee table", "lamp", "rug", "bookshelf"]')
      mockParseJsonResponse.mockReturnValueOnce(['sofa', 'coffee table', 'lamp', 'rug', 'bookshelf'])
      // Second call: inpaint
      mockGenerateWithGemini.mockResolvedValueOnce('All furniture removed')

      const result = await executeSkill({
        skillId: 'image-inpaint',
        input: {
          imageUrl: 'https://example.com/room.jpg',
          removeAllFurniture: true,
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageInpaintOutput
      expect(data?.objectsRemoved?.length).toBeGreaterThan(0)
    })

    it('should return original image when no objects to remove', async () => {
      // Detection returns empty
      mockGenerateWithGemini.mockResolvedValueOnce('[]')
      mockParseJsonResponse.mockReturnValueOnce([])

      const result = await executeSkill({
        skillId: 'image-inpaint',
        input: {
          imageUrl: 'https://example.com/empty-room.jpg',
          objectsToRemove: ['sofa'],
        },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      const data = result.data as ImageInpaintOutput
      expect(data?.objectsRemoved).toHaveLength(0)
      expect(data?.imageUrl).toBe('https://example.com/empty-room.jpg')
    })

    it('should estimate cost', async () => {
      const cost = await imageInpaintSkill.estimateCost!({
        imageUrl: 'https://example.com/room.jpg',
        removeAllFurniture: true,
      })
      expect(cost).toBe(0.004) // Detection + inpaint
    })
  })

  describe('Image Skills Integration', () => {
    beforeEach(() => {
      registerSkill(imageAnalyzeSkill)
      registerSkill(imageGenerateSkill)
      registerSkill(imageInpaintSkill)
    })

    it('should analyze then stage workflow', async () => {
      // Step 1: Analyze the room
      const analysisResult = {
        roomType: 'living_room',
        isEmpty: true,
        stagingReady: true,
        suggestedStyle: 'modern',
      }
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify(analysisResult))
      mockParseJsonResponse.mockReturnValueOnce(analysisResult)

      const analyzeResult = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'https://example.com/empty-room.jpg',
          analysisType: 'staging_readiness',
        },
        skipLogging: true,
      })

      expect(analyzeResult.success).toBe(true)
      const analyzeData = analyzeResult.data as ImageAnalyzeOutput
      expect(analyzeData?.stagingReady).toBe(true)

      // Step 2: Generate staging based on analysis
      mockGenerateWithGemini.mockResolvedValueOnce('Staged living room generated')

      const generateResult = await executeSkill({
        skillId: 'image-generate',
        input: {
          sourceImage: 'https://example.com/empty-room.jpg',
          roomType: analyzeData?.roomType,
          style: analyzeData?.suggestedStyle,
          prompt: 'Stage this room',
        },
        skipLogging: true,
      })

      expect(generateResult.success).toBe(true)
    })

    it('should inpaint then analyze workflow', async () => {
      // Step 1: Remove furniture
      mockGenerateWithGemini.mockResolvedValueOnce('["sofa", "table"]')
      mockParseJsonResponse.mockReturnValueOnce(['sofa', 'table'])
      mockGenerateWithGemini.mockResolvedValueOnce('Furniture removed')

      const inpaintResult = await executeSkill({
        skillId: 'image-inpaint',
        input: {
          imageUrl: 'https://example.com/furnished-room.jpg',
          removeAllFurniture: true,
        },
        skipLogging: true,
      })

      expect(inpaintResult.success).toBe(true)
      const inpaintData = inpaintResult.data as ImageInpaintOutput
      expect(inpaintData?.objectsRemoved).toContain('sofa')

      // Step 2: Verify room is now empty
      const verifyResult = {
        isEmpty: true,
        stagingReady: true,
      }
      mockGenerateWithGemini.mockResolvedValueOnce(JSON.stringify(verifyResult))
      mockParseJsonResponse.mockReturnValueOnce(verifyResult)

      const analyzeResult = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: 'inpainted-result-url',
          analysisType: 'staging_readiness',
        },
        skipLogging: true,
      })

      expect(analyzeResult.success).toBe(true)
      const analyzeData = analyzeResult.data as ImageAnalyzeOutput
      expect(analyzeData?.stagingReady).toBe(true)
    })
  })
})
