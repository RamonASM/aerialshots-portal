'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { type SqftTierId } from '@/lib/pricing/config'
import {
  calculateBookingTotal,
  type BookingFormData,
  type ListingAddon,
  LISTING_ADDONS,
} from '@/lib/booking/config'

// Extended booking form data with new fields
export interface ExtendedBookingFormData extends BookingFormData {
  // Property location (from Google Places)
  propertyLat?: number
  propertyLng?: number
  propertyPlaceId?: string

  // Airspace check
  airspaceStatus?: 'clear' | 'laanc_required' | 'restricted' | 'unknown'
  airspaceWarnings?: string[]

  // Weather info
  weatherForecast?: {
    date: string
    condition: string
    tempHigh: number
    tempLow: number
    rainChance: number
    icon: string
  }[]

  // Travel fee
  travelFee?: number
  travelDistance?: number
  travelDuration?: number

  // Coupon/discount
  couponCode?: string
  couponDiscount?: number
  couponType?: 'percent' | 'fixed'

  // Loyalty points
  loyaltyPointsToRedeem?: number
  loyaltyPointsValue?: number

  // Session tracking
  sessionId?: string
  createdAt?: string
  lastUpdatedAt?: string

  // UTM tracking
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

// Store state interface
interface BookingState {
  // Current step (0-indexed)
  currentStep: number

  // Form data
  formData: ExtendedBookingFormData

  // UI state
  isLoading: boolean
  error: string | null

  // Pricing (calculated)
  pricing: {
    packagePrice: number
    addonsTotal: number
    travelFee: number
    couponDiscount: number
    loyaltyDiscount: number
    subtotal: number
    tax: number
    total: number
    breakdown: Array<{ name: string; price: number; quantity?: number }>
  }

  // Smart recommendations
  recommendedAddons: string[]

  // Cart recovery
  isAbandoned: boolean
  recoveryEmailSent: boolean
}

// Store actions interface
interface BookingActions {
  // Navigation
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  // Form updates
  updateFormData: (data: Partial<ExtendedBookingFormData>) => void
  setPackage: (packageKey: string, sqftTier: SqftTierId) => void
  toggleAddon: (addonId: string) => void
  setAddonQuantity: (addonId: string, quantity: number) => void

  // Property
  setPropertyAddress: (address: {
    formatted: string
    street: string
    city: string
    state: string
    zip: string
    lat: number
    lng: number
    placeId: string
  }) => void

  // Scheduling
  setSchedule: (date: string, time: string) => void

  // Discounts
  applyCoupon: (code: string, discount: number, type: 'percent' | 'fixed') => void
  removeCoupon: () => void
  setLoyaltyPoints: (points: number, value: number) => void

  // Airspace & Weather
  setAirspaceStatus: (status: 'clear' | 'laanc_required' | 'restricted' | 'unknown', warnings?: string[]) => void
  setWeatherForecast: (forecast: ExtendedBookingFormData['weatherForecast']) => void
  setTravelFee: (fee: number, distance: number, duration: number) => void

  // Smart recommendations
  calculateRecommendations: () => void

  // Cart recovery
  markAsAbandoned: () => void
  markRecoveryEmailSent: () => void

  // Pricing
  recalculatePricing: () => void

  // Session
  initSession: () => void

  // Reset
  reset: () => void

  // Loading/Error
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// Initial form data
const initialFormData: ExtendedBookingFormData = {
  packageKey: '',
  sqftTier: 'lt2000',
  addons: [],
  propertyAddress: '',
  propertyCity: '',
  propertyState: 'FL',
  propertyZip: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
}

// Initial pricing
const initialPricing = {
  packagePrice: 0,
  addonsTotal: 0,
  travelFee: 0,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  subtotal: 0,
  tax: 0,
  total: 0,
  breakdown: [],
}

// Generate session ID
function generateSessionId(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create the store
export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentStep: 0,
      formData: { ...initialFormData },
      isLoading: false,
      error: null,
      pricing: { ...initialPricing },
      recommendedAddons: [],
      isAbandoned: false,
      recoveryEmailSent: false,

      // Navigation
      setStep: (step) => set({ currentStep: step }),

      nextStep: () => set((state) => {
        state.currentStep = Math.min(state.currentStep + 1, 4)
        state.formData.lastUpdatedAt = new Date().toISOString()
      }),

      prevStep: () => set((state) => {
        state.currentStep = Math.max(state.currentStep - 1, 0)
      }),

      // Form updates
      updateFormData: (data) => set((state) => {
        Object.assign(state.formData, data)
        state.formData.lastUpdatedAt = new Date().toISOString()
      }),

      setPackage: (packageKey, sqftTier) => {
        set((state) => {
          state.formData.packageKey = packageKey
          state.formData.sqftTier = sqftTier
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
        get().calculateRecommendations()
      },

      toggleAddon: (addonId) => {
        set((state) => {
          const existingIndex = state.formData.addons.findIndex(a => a.id === addonId)
          if (existingIndex >= 0) {
            state.formData.addons.splice(existingIndex, 1)
          } else {
            state.formData.addons.push({ id: addonId, quantity: 1 })
          }
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
      },

      setAddonQuantity: (addonId, quantity) => {
        set((state) => {
          const addon = state.formData.addons.find(a => a.id === addonId)
          if (addon) {
            addon.quantity = quantity
          } else if (quantity > 0) {
            state.formData.addons.push({ id: addonId, quantity })
          }
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
      },

      // Property address (from Google Places)
      setPropertyAddress: (address) => {
        set((state) => {
          state.formData.propertyAddress = address.street
          state.formData.propertyCity = address.city
          state.formData.propertyState = address.state
          state.formData.propertyZip = address.zip
          state.formData.propertyLat = address.lat
          state.formData.propertyLng = address.lng
          state.formData.propertyPlaceId = address.placeId
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
      },

      // Scheduling
      setSchedule: (date, time) => {
        set((state) => {
          state.formData.scheduledDate = date
          state.formData.scheduledTime = time
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
      },

      // Discounts
      applyCoupon: (code, discount, type) => {
        set((state) => {
          state.formData.couponCode = code
          state.formData.couponDiscount = discount
          state.formData.couponType = type
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
      },

      removeCoupon: () => {
        set((state) => {
          state.formData.couponCode = undefined
          state.formData.couponDiscount = undefined
          state.formData.couponType = undefined
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
      },

      setLoyaltyPoints: (points, value) => {
        set((state) => {
          state.formData.loyaltyPointsToRedeem = points
          state.formData.loyaltyPointsValue = value
          state.formData.lastUpdatedAt = new Date().toISOString()
        })
        get().recalculatePricing()
      },

      // Airspace & Weather
      setAirspaceStatus: (status, warnings) => set((state) => {
        state.formData.airspaceStatus = status
        state.formData.airspaceWarnings = warnings
      }),

      setWeatherForecast: (forecast) => set((state) => {
        state.formData.weatherForecast = forecast
      }),

      setTravelFee: (fee, distance, duration) => {
        set((state) => {
          state.formData.travelFee = fee
          state.formData.travelDistance = distance
          state.formData.travelDuration = duration
        })
        get().recalculatePricing()
      },

      // Smart recommendations based on package and property
      calculateRecommendations: () => set((state) => {
        const { packageKey, sqftTier, propertySqft } = state.formData
        const recommendations: string[] = []

        // Recommend based on package
        if (packageKey === 'essentials') {
          recommendations.push('social-reel') // Essentials doesn't include video
          recommendations.push('rush-delivery')
        }

        if (packageKey === 'signature') {
          recommendations.push('aerial-video')
          recommendations.push('premium-staging')
        }

        // Recommend based on property size
        const sqft = propertySqft || (sqftTier === 'lt2000' ? 1800 : 3000)
        if (sqft > 3000) {
          recommendations.push('extra-staging')
          recommendations.push('exterior-drone')
        }

        // Always popular
        if (!state.formData.addons.some(a => a.id === 'rush-delivery')) {
          recommendations.push('rush-delivery')
        }

        // Deduplicate and filter already selected
        const selectedIds = state.formData.addons.map(a => a.id)
        state.recommendedAddons = [...new Set(recommendations)]
          .filter(id => !selectedIds.includes(id))
          .slice(0, 3)
      }),

      // Cart recovery
      markAsAbandoned: () => set({ isAbandoned: true }),
      markRecoveryEmailSent: () => set({ recoveryEmailSent: true }),

      // Recalculate pricing
      recalculatePricing: () => set((state) => {
        const baseCalc = calculateBookingTotal(state.formData)

        // Add travel fee
        const travelFee = state.formData.travelFee || 0

        // Calculate coupon discount
        let couponDiscount = 0
        if (state.formData.couponCode && state.formData.couponDiscount) {
          if (state.formData.couponType === 'percent') {
            couponDiscount = Math.round(baseCalc.subtotal * (state.formData.couponDiscount / 100))
          } else {
            couponDiscount = state.formData.couponDiscount
          }
        }

        // Loyalty points value
        const loyaltyDiscount = state.formData.loyaltyPointsValue || 0

        const subtotal = baseCalc.subtotal + travelFee
        const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount)

        // Build breakdown
        const breakdown = [...baseCalc.breakdown]
        if (travelFee > 0) {
          breakdown.push({ name: 'Travel Fee', price: travelFee })
        }
        if (couponDiscount > 0) {
          breakdown.push({ name: `Discount (${state.formData.couponCode})`, price: -couponDiscount })
        }
        if (loyaltyDiscount > 0) {
          breakdown.push({ name: 'Loyalty Points', price: -loyaltyDiscount })
        }

        state.pricing = {
          packagePrice: baseCalc.packagePrice,
          addonsTotal: baseCalc.addonsTotal,
          travelFee,
          couponDiscount,
          loyaltyDiscount,
          subtotal,
          tax: 0,
          total,
          breakdown,
        }
      }),

      // Initialize session
      initSession: () => set((state) => {
        if (!state.formData.sessionId) {
          state.formData.sessionId = generateSessionId()
          state.formData.createdAt = new Date().toISOString()
        }
        state.formData.lastUpdatedAt = new Date().toISOString()

        // Capture UTM params from URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          state.formData.utmSource = params.get('utm_source') || undefined
          state.formData.utmMedium = params.get('utm_medium') || undefined
          state.formData.utmCampaign = params.get('utm_campaign') || undefined
        }
      }),

      // Reset store
      reset: () => set({
        currentStep: 0,
        formData: { ...initialFormData },
        isLoading: false,
        error: null,
        pricing: { ...initialPricing },
        recommendedAddons: [],
        isAbandoned: false,
        recoveryEmailSent: false,
      }),

      // Loading/Error
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    })),
    {
      name: 'asm-booking',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        pricing: state.pricing,
        recommendedAddons: state.recommendedAddons,
      }),
    }
  )
)

// Selectors for common derived state
export const useBookingProgress = () => {
  const currentStep = useBookingStore((s) => s.currentStep)
  return {
    currentStep,
    progress: ((currentStep + 1) / 5) * 100,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === 4,
  }
}

export const useBookingPricing = () => useBookingStore((s) => s.pricing)

export const useSelectedAddons = () => {
  const addons = useBookingStore((s) => s.formData.addons)
  return addons.map((addon) => {
    const config = LISTING_ADDONS.find((a) => a.id === addon.id)
    return { ...addon, config }
  })
}

export const useCanProceed = () => {
  const { currentStep, formData } = useBookingStore()

  switch (currentStep) {
    case 0: // Package
      return !!formData.packageKey && !!formData.sqftTier
    case 1: // Addons
      return true // Addons are optional
    case 2: // Property
      return !!(
        formData.propertyAddress &&
        formData.propertyCity &&
        formData.propertyZip
      )
    case 3: // Schedule
      return !!(formData.scheduledDate && formData.scheduledTime)
    case 4: // Payment
      return !!(
        formData.contactName &&
        formData.contactEmail &&
        formData.contactPhone
      )
    default:
      return false
  }
}
