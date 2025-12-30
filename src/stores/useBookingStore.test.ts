/**
 * Booking Store Tests
 *
 * Tests for Zustand booking state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useBookingStore,
  useBookingProgress,
  useBookingPricing,
  useSelectedAddons,
  useCanProceed,
} from './useBookingStore'

// Mock the booking config
vi.mock('@/lib/booking/config', () => ({
  calculateBookingTotal: vi.fn().mockReturnValue({
    packagePrice: 449,
    addonsTotal: 75,
    subtotal: 524,
    breakdown: [
      { name: 'Signature Package', price: 449 },
      { name: 'Rush Delivery', price: 75 },
    ],
  }),
  LISTING_ADDONS: [
    { id: 'rush-delivery', name: 'Rush Delivery', price: 75 },
    { id: 'social-reel', name: 'Social Reel', price: 125 },
    { id: 'aerial-video', name: 'Aerial Video', price: 150 },
    { id: 'premium-staging', name: 'Premium Staging', price: 35, priceType: 'per_unit' },
  ],
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useBookingStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useBookingStore())
    act(() => {
      result.current.reset()
    })
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useBookingStore())

      expect(result.current.currentStep).toBe(0)
      expect(result.current.formData.packageKey).toBe('')
      expect(result.current.formData.sqftTier).toBe('lt2000')
      expect(result.current.formData.addons).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should have empty initial pricing', () => {
      const { result } = renderHook(() => useBookingStore())

      expect(result.current.pricing.packagePrice).toBe(0)
      expect(result.current.pricing.total).toBe(0)
      expect(result.current.pricing.breakdown).toEqual([])
    })

    it('should not be abandoned initially', () => {
      const { result } = renderHook(() => useBookingStore())

      expect(result.current.isAbandoned).toBe(false)
      expect(result.current.recoveryEmailSent).toBe(false)
    })
  })

  describe('Navigation', () => {
    it('should set step directly', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setStep(2)
      })

      expect(result.current.currentStep).toBe(2)
    })

    it('should increment step with nextStep', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not exceed max step', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setStep(4)
        result.current.nextStep()
      })

      expect(result.current.currentStep).toBe(4)
    })

    it('should decrement step with prevStep', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setStep(2)
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(1)
    })

    it('should not go below step 0', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.prevStep()
      })

      expect(result.current.currentStep).toBe(0)
    })

    it('should update lastUpdatedAt on nextStep', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.nextStep()
      })

      expect(result.current.formData.lastUpdatedAt).toBeDefined()
    })
  })

  describe('Form Updates', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.updateFormData({
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
        })
      })

      expect(result.current.formData.contactName).toBe('John Doe')
      expect(result.current.formData.contactEmail).toBe('john@example.com')
    })

    it('should preserve existing form data when updating', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.updateFormData({ contactName: 'John' })
        result.current.updateFormData({ contactEmail: 'john@test.com' })
      })

      expect(result.current.formData.contactName).toBe('John')
      expect(result.current.formData.contactEmail).toBe('john@test.com')
    })
  })

  describe('Package Selection', () => {
    it('should set package and sqft tier', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', '2001_2500')
      })

      expect(result.current.formData.packageKey).toBe('signature')
      expect(result.current.formData.sqftTier).toBe('2001_2500')
    })

    it('should trigger recalculatePricing on setPackage', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
      })

      // Pricing should be updated (from mock)
      expect(result.current.pricing.packagePrice).toBe(449)
    })

    it('should trigger calculateRecommendations on setPackage', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('essentials', 'lt2000')
      })

      // Should have recommendations
      expect(result.current.recommendedAddons.length).toBeGreaterThan(0)
    })
  })

  describe('Addon Management', () => {
    it('should toggle addon on', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.toggleAddon('rush-delivery')
      })

      expect(result.current.formData.addons).toContainEqual({
        id: 'rush-delivery',
        quantity: 1,
      })
    })

    it('should toggle addon off', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.toggleAddon('rush-delivery')
        result.current.toggleAddon('rush-delivery')
      })

      expect(result.current.formData.addons).not.toContainEqual(
        expect.objectContaining({ id: 'rush-delivery' })
      )
    })

    it('should set addon quantity', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.toggleAddon('premium-staging')
        result.current.setAddonQuantity('premium-staging', 3)
      })

      const addon = result.current.formData.addons.find(a => a.id === 'premium-staging')
      expect(addon?.quantity).toBe(3)
    })

    it('should add addon when setting quantity on non-existing addon', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setAddonQuantity('new-addon', 2)
      })

      expect(result.current.formData.addons).toContainEqual({
        id: 'new-addon',
        quantity: 2,
      })
    })

    it('should recalculate pricing when addons change', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.toggleAddon('rush-delivery')
      })

      expect(result.current.pricing.addonsTotal).toBe(75)
    })
  })

  describe('Property Address', () => {
    it('should set property address from Google Places', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPropertyAddress({
          formatted: '123 Main St, Orlando, FL 32801',
          street: '123 Main St',
          city: 'Orlando',
          state: 'FL',
          zip: '32801',
          lat: 28.5383,
          lng: -81.3792,
          placeId: 'ChIJxxx',
        })
      })

      expect(result.current.formData.propertyAddress).toBe('123 Main St')
      expect(result.current.formData.propertyCity).toBe('Orlando')
      expect(result.current.formData.propertyState).toBe('FL')
      expect(result.current.formData.propertyZip).toBe('32801')
      expect(result.current.formData.propertyLat).toBe(28.5383)
      expect(result.current.formData.propertyLng).toBe(-81.3792)
      expect(result.current.formData.propertyPlaceId).toBe('ChIJxxx')
    })
  })

  describe('Scheduling', () => {
    it('should set schedule date and time', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setSchedule('2024-01-15', '10:00')
      })

      expect(result.current.formData.scheduledDate).toBe('2024-01-15')
      expect(result.current.formData.scheduledTime).toBe('10:00')
    })
  })

  describe('Discounts', () => {
    it('should apply percent coupon', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.applyCoupon('SAVE20', 20, 'percent')
      })

      expect(result.current.formData.couponCode).toBe('SAVE20')
      expect(result.current.pricing.couponDiscount).toBeGreaterThan(0)
    })

    it('should apply fixed coupon', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.applyCoupon('FLAT50', 50, 'fixed')
      })

      expect(result.current.pricing.couponDiscount).toBe(50)
    })

    it('should remove coupon', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.applyCoupon('SAVE20', 20, 'percent')
        result.current.removeCoupon()
      })

      expect(result.current.formData.couponCode).toBeUndefined()
      expect(result.current.pricing.couponDiscount).toBe(0)
    })

    it('should set loyalty points', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.setLoyaltyPoints(500, 25)
      })

      expect(result.current.formData.loyaltyPointsToRedeem).toBe(500)
      expect(result.current.formData.loyaltyPointsValue).toBe(25)
      expect(result.current.pricing.loyaltyDiscount).toBe(25)
    })
  })

  describe('Airspace & Weather', () => {
    it('should set airspace status', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setAirspaceStatus('laanc_required', ['Near airport'])
      })

      expect(result.current.formData.airspaceStatus).toBe('laanc_required')
      expect(result.current.formData.airspaceWarnings).toEqual(['Near airport'])
    })

    it('should set weather forecast', () => {
      const { result } = renderHook(() => useBookingStore())

      const forecast = [
        { date: '2024-01-15', condition: 'Sunny', tempHigh: 75, tempLow: 60, rainChance: 10, icon: 'sun' },
      ]

      act(() => {
        result.current.setWeatherForecast(forecast)
      })

      expect(result.current.formData.weatherForecast).toEqual(forecast)
    })

    it('should set travel fee', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.setTravelFee(25, 50, 60)
      })

      expect(result.current.formData.travelFee).toBe(25)
      expect(result.current.formData.travelDistance).toBe(50)
      expect(result.current.formData.travelDuration).toBe(60)
      expect(result.current.pricing.travelFee).toBe(25)
    })
  })

  describe('Smart Recommendations', () => {
    it('should recommend addons for essentials package', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('essentials', 'lt2000')
      })

      expect(result.current.recommendedAddons).toContain('social-reel')
      expect(result.current.recommendedAddons).toContain('rush-delivery')
    })

    it('should recommend addons for signature package', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
      })

      expect(result.current.recommendedAddons).toContain('aerial-video')
      expect(result.current.recommendedAddons).toContain('premium-staging')
    })

    it('should exclude already selected addons from recommendations', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.toggleAddon('rush-delivery')
        result.current.setPackage('essentials', 'lt2000')
      })

      expect(result.current.recommendedAddons).not.toContain('rush-delivery')
    })

    it('should limit recommendations to 3', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('essentials', 'lt2000')
      })

      expect(result.current.recommendedAddons.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Cart Recovery', () => {
    it('should mark as abandoned', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.markAsAbandoned()
      })

      expect(result.current.isAbandoned).toBe(true)
    })

    it('should mark recovery email sent', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.markRecoveryEmailSent()
      })

      expect(result.current.recoveryEmailSent).toBe(true)
    })
  })

  describe('Session Management', () => {
    it('should initialize session with ID', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.initSession()
      })

      expect(result.current.formData.sessionId).toMatch(/^bk_/)
      expect(result.current.formData.createdAt).toBeDefined()
    })

    it('should not overwrite existing session', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.initSession()
      })

      const firstSessionId = result.current.formData.sessionId

      act(() => {
        result.current.initSession()
      })

      expect(result.current.formData.sessionId).toBe(firstSessionId)
    })
  })

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', '2001_2500')
        result.current.toggleAddon('rush-delivery')
        result.current.setStep(3)
        result.current.markAsAbandoned()
        result.current.reset()
      })

      expect(result.current.currentStep).toBe(0)
      expect(result.current.formData.packageKey).toBe('')
      expect(result.current.formData.addons).toEqual([])
      expect(result.current.isAbandoned).toBe(false)
    })
  })

  describe('Loading/Error State', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should set error state', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setError('Payment failed')
      })

      expect(result.current.error).toBe('Payment failed')
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setError('Error')
        result.current.setError(null)
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Pricing Calculation', () => {
    it('should calculate total with all fees and discounts', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.setTravelFee(25, 50, 60)
        result.current.applyCoupon('SAVE10', 10, 'percent')
      })

      // Base: 524 (from mock) + 25 travel = 549
      // 10% discount on base subtotal = 52.4 rounded
      expect(result.current.pricing.subtotal).toBe(549)
      expect(result.current.pricing.total).toBeLessThan(549)
    })

    it('should include breakdown items', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.toggleAddon('rush-delivery')
        result.current.setTravelFee(25, 50, 60)
      })

      expect(result.current.pricing.breakdown).toContainEqual({
        name: 'Travel Fee',
        price: 25,
      })
    })

    it('should show discounts as negative in breakdown', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.applyCoupon('SAVE50', 50, 'fixed')
      })

      const discountItem = result.current.pricing.breakdown.find(b =>
        b.name.includes('SAVE50')
      )
      expect(discountItem?.price).toBe(-50)
    })

    it('should not allow negative total', () => {
      const { result } = renderHook(() => useBookingStore())

      act(() => {
        result.current.setPackage('signature', 'lt2000')
        result.current.applyCoupon('HUGE', 1000, 'fixed')
      })

      expect(result.current.pricing.total).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('useBookingProgress', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBookingStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should calculate progress percentage', () => {
    const storeHook = renderHook(() => useBookingStore())
    const progressHook = renderHook(() => useBookingProgress())

    act(() => {
      storeHook.result.current.setStep(2)
    })

    // Step 2 = (2+1)/5 * 100 = 60%
    expect(progressHook.result.current.progress).toBe(60)
  })

  it('should identify first step', () => {
    const { result } = renderHook(() => useBookingProgress())

    expect(result.current.isFirstStep).toBe(true)
    expect(result.current.isLastStep).toBe(false)
  })

  it('should identify last step', () => {
    const storeHook = renderHook(() => useBookingStore())
    const progressHook = renderHook(() => useBookingProgress())

    act(() => {
      storeHook.result.current.setStep(4)
    })

    expect(progressHook.result.current.isLastStep).toBe(true)
  })
})

describe('useBookingPricing', () => {
  it('should return pricing state', () => {
    const storeHook = renderHook(() => useBookingStore())
    const pricingHook = renderHook(() => useBookingPricing())

    act(() => {
      storeHook.result.current.setPackage('signature', 'lt2000')
    })

    expect(pricingHook.result.current.packagePrice).toBe(449)
  })
})

describe('useSelectedAddons', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBookingStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should return addons with config', () => {
    const storeHook = renderHook(() => useBookingStore())
    const addonsHook = renderHook(() => useSelectedAddons())

    act(() => {
      storeHook.result.current.toggleAddon('rush-delivery')
    })

    expect(addonsHook.result.current[0].id).toBe('rush-delivery')
    expect(addonsHook.result.current[0].config?.name).toBe('Rush Delivery')
  })
})

describe('useCanProceed', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useBookingStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should return false for step 0 without package', () => {
    const { result } = renderHook(() => useCanProceed())

    expect(result.current).toBe(false)
  })

  it('should return true for step 0 with package', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setPackage('signature', 'lt2000')
    })

    expect(canProceedHook.result.current).toBe(true)
  })

  it('should return true for step 1 (addons are optional)', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(1)
    })

    expect(canProceedHook.result.current).toBe(true)
  })

  it('should return false for step 2 without address', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(2)
    })

    expect(canProceedHook.result.current).toBe(false)
  })

  it('should return true for step 2 with complete address', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(2)
      storeHook.result.current.setPropertyAddress({
        formatted: '123 Main St, Orlando, FL 32801',
        street: '123 Main St',
        city: 'Orlando',
        state: 'FL',
        zip: '32801',
        lat: 28.5383,
        lng: -81.3792,
        placeId: 'ChIJxxx',
      })
    })

    expect(canProceedHook.result.current).toBe(true)
  })

  it('should return false for step 3 without schedule', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(3)
    })

    expect(canProceedHook.result.current).toBe(false)
  })

  it('should return true for step 3 with schedule', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(3)
      storeHook.result.current.setSchedule('2024-01-15', '10:00')
    })

    expect(canProceedHook.result.current).toBe(true)
  })

  it('should return false for step 4 without contact info', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(4)
    })

    expect(canProceedHook.result.current).toBe(false)
  })

  it('should return true for step 4 with complete contact info', () => {
    const storeHook = renderHook(() => useBookingStore())
    const canProceedHook = renderHook(() => useCanProceed())

    act(() => {
      storeHook.result.current.setStep(4)
      storeHook.result.current.updateFormData({
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        contactPhone: '555-123-4567',
      })
    })

    expect(canProceedHook.result.current).toBe(true)
  })
})
