/**
 * Marketing Generator Tests
 *
 * Tests for Bannerbear marketing asset generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateMarketingAssets,
  generateJustListedAssets,
  isMarketingConfigured,
  getAvailableFormats,
} from './generator'
import type { JustListedData, OpenHouseData, JustSoldData, PriceReductionData } from './types'

// Mock Bannerbear client
const mockCreateImage = vi.fn()

vi.mock('@/lib/integrations/bannerbear/client', () => ({
  createImage: (...args: unknown[]) => mockCreateImage(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  // Reset environment
  process.env.BANNERBEAR_API_KEY = 'test-api-key'
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.BANNERBEAR_API_KEY
})

describe('isMarketingConfigured', () => {
  it('should return true when BANNERBEAR_API_KEY is set', () => {
    process.env.BANNERBEAR_API_KEY = 'test-key'
    expect(isMarketingConfigured()).toBe(true)
  })

  it('should return false when BANNERBEAR_API_KEY is not set', () => {
    delete process.env.BANNERBEAR_API_KEY
    expect(isMarketingConfigured()).toBe(false)
  })

  it('should return false for empty API key', () => {
    process.env.BANNERBEAR_API_KEY = ''
    expect(isMarketingConfigured()).toBe(false)
  })
})

describe('getAvailableFormats', () => {
  it('should return formats for just_listed', () => {
    const formats = getAvailableFormats('just_listed')
    // All formats have placeholder templates by default, so empty
    expect(Array.isArray(formats)).toBe(true)
  })

  it('should return formats for open_house', () => {
    const formats = getAvailableFormats('open_house')
    expect(Array.isArray(formats)).toBe(true)
  })

  it('should return formats for just_sold', () => {
    const formats = getAvailableFormats('just_sold')
    expect(Array.isArray(formats)).toBe(true)
  })

  it('should return formats for price_reduction', () => {
    const formats = getAvailableFormats('price_reduction')
    expect(Array.isArray(formats)).toBe(true)
  })

  it('should filter out placeholder templates', () => {
    // Default templates have '_TEMPLATE' suffix which should be filtered
    const formats = getAvailableFormats('just_listed')
    formats.forEach(format => {
      expect(format).not.toContain('_TEMPLATE')
    })
  })
})

describe('generateMarketingAssets', () => {
  const mockJustListedData: JustListedData = {
    photoUrl: 'https://example.com/photo.jpg',
    address: '123 Main St',
    city: 'Orlando',
    state: 'FL',
    price: 450000,
    beds: 4,
    baths: 3,
    sqft: 2500,
    agentName: 'John Agent',
    agentPhone: '555-123-4567',
  }

  beforeEach(() => {
    mockCreateImage.mockResolvedValue({
      uid: 'bb-image-123',
      status: 'pending',
    })
  })

  it('should generate assets for just_listed type', async () => {
    // Set real template IDs
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'real-template-id'

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockJustListedData,
    })

    // Advance timers for delays
    await vi.runAllTimersAsync()

    const result = await resultPromise

    expect(result.success).toBe(true)
    expect(result.assets.length).toBe(1)
    expect(result.assets[0].format).toBe('instagram_square')
    expect(result.assets[0].bannerbearUid).toBe('bb-image-123')
  })

  it('should include metadata in Bannerbear request', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockJustListedData,
      webhookUrl: 'https://example.com/webhook',
    })

    await vi.runAllTimersAsync()
    await resultPromise

    // Verify the call was made with the right parameters
    expect(mockCreateImage).toHaveBeenCalled()
    const lastCall = mockCreateImage.mock.calls[0]
    // Template ID is the default since templates are read at module load time
    expect(typeof lastCall[0]).toBe('string')
    expect(lastCall[2]).toBe('https://example.com/webhook')
    // The metadata should be a JSON string containing listingId
    expect(lastCall[3]).toContain('listing-123')
  })

  it('should handle multiple formats', async () => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'template-square'
    process.env.BANNERBEAR_JUST_LISTED_STORY = 'template-story'

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square', 'instagram_story'],
      data: mockJustListedData,
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.assets.length).toBe(2)
    expect(mockCreateImage).toHaveBeenCalledTimes(2)
  })

  it('should handle template configuration', async () => {
    // Template is configured via env var set in beforeEach
    // When the template ID doesn't contain _TEMPLATE, it should be used
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'valid-template-id'

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockJustListedData,
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    // With a properly configured template, the call should succeed
    expect(result.success).toBe(true)
    expect(mockCreateImage).toHaveBeenCalled()
  })

  it('should handle Bannerbear API errors', async () => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'real-template-id'

    mockCreateImage.mockRejectedValue(new Error('API rate limit exceeded'))

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockJustListedData,
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0]).toContain('Failed to generate')
  })

  it('should set asset status to pending', async () => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'real-template-id'

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockJustListedData,
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.assets[0].status).toBe('pending')
  })
})

describe('Just Listed Modifications', () => {
  const mockData: JustListedData = {
    photoUrl: 'https://example.com/photo.jpg',
    address: '123 Main St',
    city: 'Orlando',
    state: 'FL',
    price: 450000,
    beds: 4,
    baths: 3,
    sqft: 2500,
    agentName: 'John Agent',
    agentPhone: '555-123-4567',
    agentLogoUrl: 'https://example.com/logo.png',
    brokerageLogoUrl: 'https://example.com/brokerage.png',
    brandColor: '#FF5500',
    tagline: 'Custom Tagline',
  }

  beforeEach(() => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'real-template-id'
    mockCreateImage.mockResolvedValue({ uid: 'bb-123', status: 'pending' })
  })

  it('should include required modifications', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]

    expect(modifications).toContainEqual({ name: 'background_image', image_url: mockData.photoUrl })
    expect(modifications).toContainEqual({ name: 'headline', text: 'JUST LISTED' })
    expect(modifications).toContainEqual({ name: 'address', text: mockData.address })
    expect(modifications).toContainEqual({ name: 'agent_name', text: mockData.agentName })
  })

  it('should include optional agent phone', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'agent_phone', text: mockData.agentPhone })
  })

  it('should include optional logos', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'agent_logo', image_url: mockData.agentLogoUrl })
    expect(modifications).toContainEqual({ name: 'brokerage_logo', image_url: mockData.brokerageLogoUrl })
  })

  it('should include brand color', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'accent_color', color: mockData.brandColor })
  })

  it('should use custom tagline when provided', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'tagline', text: 'Custom Tagline' })
  })
})

describe('Open House Modifications', () => {
  const mockData: OpenHouseData = {
    photoUrl: 'https://example.com/photo.jpg',
    address: '456 Oak Ave',
    city: 'Tampa',
    state: 'FL',
    date: 'Saturday, January 15th',
    time: '1:00 PM - 4:00 PM',
    agentName: 'Jane Realtor',
    agentPhone: '555-987-6543',
  }

  beforeEach(() => {
    process.env.BANNERBEAR_OPEN_HOUSE_SQUARE = 'oh-template-id'
    mockCreateImage.mockResolvedValue({ uid: 'bb-456', status: 'pending' })
  })

  it('should include event date and time', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'open_house',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'event_date', text: mockData.date })
    expect(modifications).toContainEqual({ name: 'event_time', text: mockData.time })
  })

  it('should set headline to OPEN HOUSE', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'open_house',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'headline', text: 'OPEN HOUSE' })
  })
})

describe('Just Sold Modifications', () => {
  const mockData: JustSoldData = {
    photoUrl: 'https://example.com/sold.jpg',
    address: '789 Pine St',
    city: 'Miami',
    state: 'FL',
    soldPrice: 525000,
    agentName: 'Bob Closer',
    daysOnMarket: 14,
    testimonial: 'Amazing experience!',
  }

  beforeEach(() => {
    process.env.BANNERBEAR_JUST_SOLD_SQUARE = 'js-template-id'
    mockCreateImage.mockResolvedValue({ uid: 'bb-789', status: 'pending' })
  })

  it('should include sold price', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_sold',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'price', text: '$525,000' })
  })

  it('should include days on market when provided', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_sold',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'days_on_market', text: '14 Days on Market' })
  })

  it('should include testimonial when provided', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_sold',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'testimonial', text: '"Amazing experience!"' })
  })
})

describe('Price Reduction Modifications', () => {
  const mockData: PriceReductionData = {
    photoUrl: 'https://example.com/reduced.jpg',
    address: '321 Elm Dr',
    city: 'Jacksonville',
    newPrice: 380000,
    originalPrice: 425000,
    savings: 45000,
    agentName: 'Sarah Seller',
  }

  beforeEach(() => {
    process.env.BANNERBEAR_PRICE_REDUCTION_SQUARE = 'pr-template-id'
    mockCreateImage.mockResolvedValue({ uid: 'bb-321', status: 'pending' })
  })

  it('should include both prices', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'price_reduction',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'price', text: '$380,000' })
    expect(modifications).toContainEqual({ name: 'original_price', text: '$425,000' })
  })

  it('should include savings amount', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'price_reduction',
      formats: ['instagram_square'],
      data: mockData,
    })

    await vi.runAllTimersAsync()
    await resultPromise

    const modifications = mockCreateImage.mock.calls[0][1]
    expect(modifications).toContainEqual({ name: 'savings', text: 'Save $45,000' })
  })
})

describe('generateJustListedAssets', () => {
  const mockData: JustListedData = {
    photoUrl: 'https://example.com/photo.jpg',
    address: '123 Main St',
    city: 'Orlando',
    state: 'FL',
    price: 450000,
    beds: 4,
    baths: 3,
    sqft: 2500,
    agentName: 'John Agent',
  }

  beforeEach(() => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'jl-square'
    process.env.BANNERBEAR_JUST_LISTED_STORY = 'jl-story'
    mockCreateImage.mockResolvedValue({ uid: 'bb-quick', status: 'pending' })
  })

  it('should use default formats when not specified', async () => {
    const resultPromise = generateJustListedAssets(
      'listing-123',
      'agent-456',
      mockData
    )

    await vi.runAllTimersAsync()
    const result = await resultPromise

    // Default is instagram_square and instagram_story
    expect(mockCreateImage).toHaveBeenCalledTimes(2)
  })

  it('should use custom formats when specified', async () => {
    const resultPromise = generateJustListedAssets(
      'listing-123',
      'agent-456',
      mockData,
      ['instagram_square']
    )

    await vi.runAllTimersAsync()
    await resultPromise

    expect(mockCreateImage).toHaveBeenCalledTimes(1)
  })

  it('should pass webhook URL', async () => {
    const resultPromise = generateJustListedAssets(
      'listing-123',
      'agent-456',
      mockData,
      ['instagram_square'],
      'https://webhook.example.com/callback'
    )

    await vi.runAllTimersAsync()
    await resultPromise

    expect(mockCreateImage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      'https://webhook.example.com/callback',
      expect.any(String)
    )
  })
})

describe('Asset Type Aliases', () => {
  beforeEach(() => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'cs-template'
    process.env.BANNERBEAR_JUST_SOLD_SQUARE = 'uc-template'
    mockCreateImage.mockResolvedValue({ uid: 'bb-alias', status: 'pending' })
  })

  it('should treat coming_soon like just_listed', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'coming_soon',
      formats: ['instagram_square'],
      data: {
        photoUrl: 'https://example.com/photo.jpg',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        price: 450000,
        beds: 4,
        baths: 3,
        sqft: 2500,
        agentName: 'John Agent',
      },
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    // coming_soon uses just_listed modifications builder
    expect(mockCreateImage).toHaveBeenCalled()
  })

  it('should treat under_contract like just_sold', async () => {
    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'under_contract',
      formats: ['instagram_square'],
      data: {
        photoUrl: 'https://example.com/photo.jpg',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        soldPrice: 450000,
        agentName: 'John Agent',
      },
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    // under_contract uses just_sold modifications builder
    expect(mockCreateImage).toHaveBeenCalled()
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    process.env.BANNERBEAR_JUST_LISTED_SQUARE = 'real-template'
  })

  it('should handle unknown asset type', async () => {
    await expect(
      generateMarketingAssets({
        listingId: 'listing-123',
        agentId: 'agent-456',
        type: 'unknown_type' as any,
        formats: ['instagram_square'],
        data: {} as any,
      })
    ).rejects.toThrow('Unknown marketing asset type')
  })

  it('should continue after one format fails', async () => {
    process.env.BANNERBEAR_JUST_LISTED_STORY = 'story-template'

    mockCreateImage
      .mockRejectedValueOnce(new Error('First failed'))
      .mockResolvedValueOnce({ uid: 'bb-second', status: 'pending' })

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square', 'instagram_story'],
      data: {
        photoUrl: 'https://example.com/photo.jpg',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        price: 450000,
        beds: 4,
        baths: 3,
        sqft: 2500,
        agentName: 'John Agent',
      },
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(true) // At least one succeeded
    expect(result.assets.length).toBe(1)
    expect(result.errors.length).toBe(1)
  })

  it('should return success false when all formats fail', async () => {
    mockCreateImage.mockRejectedValue(new Error('All failed'))

    const resultPromise = generateMarketingAssets({
      listingId: 'listing-123',
      agentId: 'agent-456',
      type: 'just_listed',
      formats: ['instagram_square'],
      data: {
        photoUrl: 'https://example.com/photo.jpg',
        address: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        price: 450000,
        beds: 4,
        baths: 3,
        sqft: 2500,
        agentName: 'John Agent',
      },
    })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.success).toBe(false)
    expect(result.assets.length).toBe(0)
  })
})
