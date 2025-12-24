import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  }),
}
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage })

// Mock sessionStorage
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {}
  }),
}
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage })

// Import after mocks are set up
import { trackPageView, trackDownload, trackLead, trackSessionEnd } from './tracker'

describe('Analytics Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    mockSessionStorage.clear()
    mockFetch.mockResolvedValue({ ok: true })

    // Mock document.referrer
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('trackPageView', () => {
    it('should send page view event with correct data', async () => {
      await trackPageView({
        listingId: 'listing-123',
        agentId: 'agent-456',
        pageType: 'property',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.eventType).toBe('page_view')
      expect(body.listingId).toBe('listing-123')
      expect(body.agentId).toBe('agent-456')
      expect(body.pageType).toBe('property')
      expect(body.visitorId).toMatch(/^v_\d+_[a-z0-9]+$/)
      expect(body.sessionId).toMatch(/^s_\d+_[a-z0-9]+$/)
      expect(body.referrer).toBe('https://google.com')
    })

    it('should persist visitor ID across calls', async () => {
      await trackPageView({ pageType: 'property' })
      const firstVisitorId = JSON.parse(mockFetch.mock.calls[0][1].body).visitorId

      await trackPageView({ pageType: 'portfolio' })
      const secondVisitorId = JSON.parse(mockFetch.mock.calls[1][1].body).visitorId

      expect(firstVisitorId).toBe(secondVisitorId)
    })

    it('should not throw on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Should not throw
      await expect(
        trackPageView({ pageType: 'property' })
      ).resolves.not.toThrow()
    })
  })

  describe('trackDownload', () => {
    it('should send download event', async () => {
      await trackDownload({
        listingId: 'listing-123',
        assetType: 'photo',
        fileName: 'exterior.jpg',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.eventType).toBe('download')
      expect(body.assetType).toBe('photo')
      expect(body.fileName).toBe('exterior.jpg')
    })
  })

  describe('trackLead', () => {
    it('should send lead conversion event', async () => {
      await trackLead({
        listingId: 'listing-123',
        agentId: 'agent-456',
        conversionType: 'contact_form',
        leadName: 'John Doe',
        leadEmail: 'john@example.com',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.eventType).toBe('lead_conversion')
      expect(body.conversionType).toBe('contact_form')
      expect(body.leadName).toBe('John Doe')
      expect(body.leadEmail).toBe('john@example.com')
    })

    it('should handle phone click conversion', async () => {
      await trackLead({
        agentId: 'agent-456',
        conversionType: 'phone_click',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.conversionType).toBe('phone_click')
    })
  })

  describe('trackSessionEnd', () => {
    it('should send session end with duration and scroll depth', async () => {
      // Mock navigator.sendBeacon
      const mockSendBeacon = vi.fn().mockReturnValue(true)
      Object.defineProperty(navigator, 'sendBeacon', {
        value: mockSendBeacon,
        configurable: true,
      })

      await trackSessionEnd(120, 75)

      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/analytics/track',
        expect.any(String)
      )

      const body = JSON.parse(mockSendBeacon.mock.calls[0][1])
      expect(body.eventType).toBe('session_end')
      expect(body.durationSeconds).toBe(120)
      expect(body.scrollDepth).toBe(75)
    })

    it('should fallback to fetch if sendBeacon unavailable', async () => {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: undefined,
        configurable: true,
      })

      await trackSessionEnd(60, 50)

      expect(mockFetch).toHaveBeenCalled()
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.durationSeconds).toBe(60)
      expect(body.scrollDepth).toBe(50)
    })
  })

  describe('Session Management', () => {
    it('should create new session after 30 minutes of inactivity', async () => {
      // First call
      await trackPageView({ pageType: 'property' })
      const firstSessionId = JSON.parse(mockFetch.mock.calls[0][1].body).sessionId

      // Simulate 31 minutes passing
      const oldSession = JSON.parse(mockSessionStorage.store['asm_session'])
      oldSession.lastActivity = Date.now() - 31 * 60 * 1000
      mockSessionStorage.store['asm_session'] = JSON.stringify(oldSession)

      // Second call should get new session
      await trackPageView({ pageType: 'portfolio' })
      const secondSessionId = JSON.parse(mockFetch.mock.calls[1][1].body).sessionId

      expect(firstSessionId).not.toBe(secondSessionId)
    })

    it('should maintain session within 30 minutes', async () => {
      await trackPageView({ pageType: 'property' })
      const firstSessionId = JSON.parse(mockFetch.mock.calls[0][1].body).sessionId

      // Simulate 10 minutes passing (within session window)
      const oldSession = JSON.parse(mockSessionStorage.store['asm_session'])
      oldSession.lastActivity = Date.now() - 10 * 60 * 1000
      mockSessionStorage.store['asm_session'] = JSON.stringify(oldSession)

      await trackPageView({ pageType: 'portfolio' })
      const secondSessionId = JSON.parse(mockFetch.mock.calls[1][1].body).sessionId

      expect(firstSessionId).toBe(secondSessionId)
    })
  })
})
