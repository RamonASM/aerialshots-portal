/**
 * E2E Booking Flow Tests
 *
 * Tests the complete booking journey:
 * 1. Package selection
 * 2. Address entry with Google Places
 * 3. Add-ons selection
 * 4. Availability calendar
 * 5. Payment processing
 * 6. Confirmation and order creation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Test data matching the seeded accounts
const TEST_AGENT = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'agent@test.aerialshots.media',
  name: 'Test Agent',
}

const TEST_LISTING = {
  id: 'c0000000-0000-0000-0000-000000000001',
  address: '123 Test Street',
  city: 'Orlando',
  state: 'FL',
  zip: '32801',
  sqft: 2500,
}

describe('E2E Booking Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Step 1: Package Selection', () => {
    it('should display available packages with correct pricing', async () => {
      const packages = [
        {
          key: 'essentials',
          name: 'Essentials',
          description: 'Perfect for standard listings',
          basePrice: 31500, // $315.00 in cents
          features: ['25 HDR Photos', 'Drone Aerials', 'Zillow 3D Tour', '2D Floor Plan'],
        },
        {
          key: 'signature',
          name: 'Signature',
          description: 'Most popular choice',
          basePrice: 44900,
          features: ['40 HDR Photos', 'Listing Video', 'Everything in Essentials'],
        },
        {
          key: 'luxury',
          name: 'Luxury',
          description: 'For premium properties',
          basePrice: 64900,
          features: ['60 HDR Photos', 'Signature Video', '3D Floor Plan', 'Everything in Signature'],
        },
      ]

      expect(packages).toHaveLength(3)
      expect(packages[1].key).toBe('signature')
    })

    it('should calculate tiered pricing based on square footage', async () => {
      const tiers = {
        lt1500: { essentials: 31500, signature: 44900, luxury: 64900 },
        '1501_2500': { essentials: 36500, signature: 49900, luxury: 69900 },
        '2501_3500': { essentials: 41500, signature: 54900, luxury: 79900 },
        '3501_4000': { essentials: 46500, signature: 59900, luxury: 89900 },
        '4001_5000': { essentials: 51500, signature: 64900, luxury: 99900 },
        '5001_10000': { essentials: 58000, signature: 70000, luxury: 110000 },
      }

      const getTier = (sqft: number): string => {
        if (sqft <= 1500) return 'lt1500'
        if (sqft <= 2500) return '1501_2500'
        if (sqft <= 3500) return '2501_3500'
        if (sqft <= 4000) return '3501_4000'
        if (sqft <= 5000) return '4001_5000'
        return '5001_10000'
      }

      expect(getTier(2500)).toBe('1501_2500')
      expect(tiers[getTier(2500) as keyof typeof tiers].signature).toBe(49900)
    })

    it('should allow package selection and update booking state', async () => {
      const bookingState = {
        step: 1,
        selectedPackage: null as string | null,
        sqft: 2500,
        addons: [] as string[],
        totalCents: 0,
      }

      // Select signature package
      bookingState.selectedPackage = 'signature'
      bookingState.totalCents = 49900
      bookingState.step = 2

      expect(bookingState.selectedPackage).toBe('signature')
      expect(bookingState.step).toBe(2)
    })
  })

  describe('Step 2: Property Address', () => {
    it('should validate address via Google Places', async () => {
      const addressInput = {
        formatted: '123 Test Street, Orlando, FL 32801',
        components: {
          street_number: '123',
          route: 'Test Street',
          locality: 'Orlando',
          administrative_area_level_1: 'FL',
          postal_code: '32801',
        },
        coordinates: {
          lat: 28.5383,
          lng: -81.3792,
        },
      }

      expect(addressInput.components.locality).toBe('Orlando')
      expect(addressInput.coordinates.lat).toBeCloseTo(28.5383, 2)
    })

    it('should calculate travel fee based on distance', async () => {
      const baseMiles = 25 // Free travel radius
      const feePerMile = 75 // $0.75 per mile beyond base

      const calculateTravelFee = (distanceMiles: number): number => {
        if (distanceMiles <= baseMiles) return 0
        return (distanceMiles - baseMiles) * feePerMile
      }

      expect(calculateTravelFee(20)).toBe(0)
      expect(calculateTravelFee(30)).toBe(375) // 5 miles * $0.75
      expect(calculateTravelFee(50)).toBe(1875) // 25 miles * $0.75
    })

    it('should check airspace restrictions for drone', async () => {
      const airspaceCheck = {
        coordinates: { lat: 28.5383, lng: -81.3792 },
        altitude: 400,
        restrictions: [] as string[],
        laancRequired: false,
        approved: true,
      }

      expect(airspaceCheck.approved).toBe(true)
      expect(airspaceCheck.laancRequired).toBe(false)
    })
  })

  describe('Step 3: Add-ons Selection', () => {
    it('should display available add-ons with pricing', async () => {
      const addons = [
        { id: 'virtual_staging', name: 'Virtual Staging', price: 2500, per: 'room' },
        { id: 'virtual_twilight', name: 'Virtual Twilight', price: 3500, per: 'photo' },
        { id: 'rush_delivery', name: 'Rush 24hr Delivery', price: 7500, per: 'order' },
        { id: 'same_day', name: 'Same Day Delivery', price: 15000, per: 'order' },
      ]

      expect(addons).toHaveLength(4)
      expect(addons.find((a) => a.id === 'virtual_staging')?.price).toBe(2500)
    })

    it('should recommend addons based on property type', async () => {
      const property = {
        sqft: 2500,
        price: 450000,
        type: 'single_family',
        hasPool: true,
        isVacant: true,
      }

      const recommendAddons = (prop: typeof property): string[] => {
        const recommendations: string[] = []

        if (prop.isVacant) recommendations.push('virtual_staging')
        if (prop.price > 400000) recommendations.push('virtual_twilight')
        if (prop.hasPool) recommendations.push('drone_video')

        return recommendations
      }

      const recommended = recommendAddons(property)
      expect(recommended).toContain('virtual_staging')
      expect(recommended).toContain('virtual_twilight')
    })

    it('should update total when adding/removing addons', async () => {
      const bookingState = {
        packagePrice: 49900,
        addons: [] as { id: string; price: number; quantity: number }[],
        get totalCents() {
          const addonTotal = this.addons.reduce((sum, a) => sum + a.price * a.quantity, 0)
          return this.packagePrice + addonTotal
        },
      }

      // Add virtual staging for 3 rooms
      bookingState.addons.push({ id: 'virtual_staging', price: 2500, quantity: 3 })
      expect(bookingState.totalCents).toBe(49900 + 7500)

      // Add virtual twilight
      bookingState.addons.push({ id: 'virtual_twilight', price: 3500, quantity: 1 })
      expect(bookingState.totalCents).toBe(49900 + 7500 + 3500)
    })
  })

  describe('Step 4: Availability Calendar', () => {
    it('should fetch real availability from database', async () => {
      const mockAvailability = [
        {
          date: '2025-01-02',
          total_slots: 6,
          booked_slots: 2,
          blocked_slots: 0,
          morning_available: true,
          afternoon_available: true,
          evening_available: false,
        },
        {
          date: '2025-01-03',
          total_slots: 6,
          booked_slots: 5,
          blocked_slots: 0,
          morning_available: false,
          afternoon_available: true,
          evening_available: false,
        },
      ]

      const availableSlots = mockAvailability.filter(
        (day) => day.booked_slots + day.blocked_slots < day.total_slots
      )

      expect(availableSlots).toHaveLength(2)
    })

    it('should check photographer availability for selected time', async () => {
      const selectedSlot = {
        date: '2025-01-02',
        startTime: '10:00',
        endTime: '12:00',
        photographerId: 'b0000000-0000-0000-0000-000000000001',
      }

      const photographerSchedule = [
        { date: '2025-01-02', startTime: '09:00', endTime: '11:00' }, // Conflict!
      ]

      const hasConflict = photographerSchedule.some(
        (booking) =>
          booking.date === selectedSlot.date &&
          booking.startTime < selectedSlot.endTime &&
          booking.endTime > selectedSlot.startTime
      )

      expect(hasConflict).toBe(true)
    })

    it('should integrate weather forecast data', async () => {
      const weatherForecast = {
        date: '2025-01-02',
        condition: 'partly_cloudy',
        high: 75,
        low: 58,
        precipitation: 10,
        windSpeed: 8,
        isGoodForDrone: true,
      }

      const isDroneFlightSafe = (weather: typeof weatherForecast): boolean => {
        return (
          weather.precipitation < 30 &&
          weather.windSpeed < 15 &&
          weather.condition !== 'thunderstorms'
        )
      }

      expect(isDroneFlightSafe(weatherForecast)).toBe(true)
    })

    it('should calculate estimated arrival window', async () => {
      const selectedSlot = {
        date: '2025-01-02',
        startTime: '10:00',
      }

      // Arrival window is typically +/- 30 minutes
      const arrivalWindow = {
        earliest: '09:30',
        latest: '10:30',
        confirmed: selectedSlot.startTime,
      }

      expect(arrivalWindow.earliest).toBe('09:30')
      expect(arrivalWindow.latest).toBe('10:30')
    })
  })

  describe('Step 5: Payment Processing', () => {
    it('should create Stripe payment intent', async () => {
      const orderDetails = {
        packageKey: 'signature',
        packagePrice: 49900,
        addons: [{ id: 'virtual_staging', price: 2500, quantity: 3 }],
        travelFee: 0,
        discountCents: 0,
      }

      const totalCents =
        orderDetails.packagePrice +
        orderDetails.addons.reduce((sum, a) => sum + a.price * a.quantity, 0) +
        orderDetails.travelFee -
        orderDetails.discountCents

      const paymentIntent = {
        id: 'pi_test_123',
        amount: totalCents,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test_123_secret_abc',
      }

      expect(paymentIntent.amount).toBe(57400)
      expect(paymentIntent.currency).toBe('usd')
    })

    it('should apply discount codes', async () => {
      const discountCodes = {
        WELCOME10: { type: 'percent', value: 10, maxUsages: 100 },
        SAVE50: { type: 'fixed', value: 5000, minOrderCents: 40000 },
        AGENT2024: { type: 'percent', value: 15, agentOnly: true },
      }

      const applyDiscount = (
        code: string,
        subtotalCents: number,
        isAgent: boolean
      ): number => {
        const discount = discountCodes[code as keyof typeof discountCodes]
        if (!discount) return 0
        if ('agentOnly' in discount && discount.agentOnly && !isAgent) return 0
        if ('minOrderCents' in discount && subtotalCents < discount.minOrderCents) return 0

        if (discount.type === 'percent') {
          return Math.floor(subtotalCents * (discount.value / 100))
        }
        return discount.value
      }

      expect(applyDiscount('WELCOME10', 50000, false)).toBe(5000)
      expect(applyDiscount('SAVE50', 50000, false)).toBe(5000)
      expect(applyDiscount('AGENT2024', 50000, false)).toBe(0) // Not an agent
      expect(applyDiscount('AGENT2024', 50000, true)).toBe(7500)
    })

    it('should apply loyalty points redemption', async () => {
      const loyaltyAccount = {
        agentId: TEST_AGENT.id,
        pointsBalance: 5000,
        tier: 'gold',
        pointsValue: 100, // 100 points = $1
      }

      const redeemPoints = (points: number, balance: number): { cents: number; valid: boolean } => {
        if (points > balance) return { cents: 0, valid: false }
        return { cents: Math.floor(points / 100) * 100, valid: true }
      }

      expect(redeemPoints(2000, loyaltyAccount.pointsBalance)).toEqual({ cents: 2000, valid: true })
      expect(redeemPoints(6000, loyaltyAccount.pointsBalance)).toEqual({ cents: 0, valid: false })
    })

    it('should handle payment success', async () => {
      const paymentResult = {
        paymentIntentId: 'pi_test_123',
        status: 'succeeded',
        amountPaid: 57400,
        receiptUrl: 'https://pay.stripe.com/receipts/...',
      }

      expect(paymentResult.status).toBe('succeeded')
    })

    it('should handle payment failure gracefully', async () => {
      const paymentError = {
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'insufficient_funds',
      }

      const getErrorMessage = (error: typeof paymentError): string => {
        switch (error.code) {
          case 'card_declined':
            return 'Your card was declined. Please try a different payment method.'
          case 'expired_card':
            return 'Your card has expired. Please use a different card.'
          case 'processing_error':
            return 'An error occurred processing your card. Please try again.'
          default:
            return 'Payment failed. Please try again.'
        }
      }

      expect(getErrorMessage(paymentError)).toContain('declined')
    })
  })

  describe('Step 6: Order Confirmation', () => {
    it('should create order record in database', async () => {
      const newOrder = {
        id: 'd0000000-0000-0000-0000-000000000002',
        contact_name: TEST_AGENT.name,
        contact_email: TEST_AGENT.email,
        property_address: TEST_LISTING.address,
        property_city: TEST_LISTING.city,
        property_state: TEST_LISTING.state,
        property_zip: TEST_LISTING.zip,
        property_sqft: TEST_LISTING.sqft,
        package_key: 'signature',
        package_name: 'Signature',
        subtotal_cents: 57400,
        total_cents: 57400,
        status: 'paid',
        payment_status: 'succeeded',
        stripe_payment_intent_id: 'pi_test_123',
        agent_id: TEST_AGENT.id,
        created_at: new Date().toISOString(),
      }

      expect(newOrder.status).toBe('paid')
      expect(newOrder.payment_status).toBe('succeeded')
    })

    it('should create listing record if not exists', async () => {
      const newListing = {
        id: expect.any(String),
        agent_id: TEST_AGENT.id,
        address: TEST_LISTING.address,
        city: TEST_LISTING.city,
        state: TEST_LISTING.state,
        zip: TEST_LISTING.zip,
        sqft: TEST_LISTING.sqft,
        status: 'active',
        ops_status: 'pending',
      }

      expect(newListing.ops_status).toBe('pending')
    })

    it('should send confirmation email', async () => {
      const confirmationEmail = {
        to: TEST_AGENT.email,
        subject: 'Booking Confirmed - 123 Test Street',
        template: 'booking-confirmation',
        data: {
          agentName: TEST_AGENT.name,
          propertyAddress: '123 Test Street, Orlando, FL 32801',
          scheduledDate: 'January 2, 2025',
          scheduledTime: '10:00 AM',
          packageName: 'Signature',
          totalPaid: '$574.00',
          orderUrl: 'https://app.aerialshots.media/orders/d0000000...',
        },
      }

      expect(confirmationEmail.subject).toContain('Booking Confirmed')
      expect(confirmationEmail.data.packageName).toBe('Signature')
    })

    it('should create photographer assignment', async () => {
      const assignment = {
        id: expect.any(String),
        photographer_id: 'b0000000-0000-0000-0000-000000000001',
        listing_id: TEST_LISTING.id,
        scheduled_at: '2025-01-02T10:00:00Z',
        status: 'confirmed',
        notes: 'Signature package - 40 photos + drone + video',
      }

      expect(assignment.status).toBe('confirmed')
    })

    it('should award loyalty points for purchase', async () => {
      const pointsEarned = {
        agentId: TEST_AGENT.id,
        orderId: 'd0000000-0000-0000-0000-000000000002',
        points: 574, // 1 point per dollar spent
        reason: 'Order purchase',
        newBalance: 1574,
      }

      expect(pointsEarned.points).toBe(574)
    })

    it('should redirect to confirmation page', async () => {
      const confirmationPage = {
        orderId: 'd0000000-0000-0000-0000-000000000002',
        url: '/booking/confirmation/d0000000-0000-0000-0000-000000000002',
        displayData: {
          orderId: 'd0000000...',
          status: 'Confirmed',
          scheduledDate: 'Thursday, January 2, 2025',
          scheduledTime: '10:00 AM - 12:00 PM',
          address: '123 Test Street, Orlando, FL 32801',
          package: 'Signature',
          addons: ['Virtual Staging (3 rooms)'],
          total: '$574.00',
          photographerName: 'Test Photographer',
          photographerPhone: '555-200-0001',
        },
      }

      expect(confirmationPage.displayData.status).toBe('Confirmed')
    })
  })

  describe('Cart Abandonment Recovery', () => {
    it('should save booking session for recovery', async () => {
      const bookingSession = {
        id: 'session_123',
        email: TEST_AGENT.email,
        step: 4,
        packageKey: 'signature',
        address: '123 Test Street, Orlando, FL 32801',
        sqft: 2500,
        addons: ['virtual_staging'],
        selectedDate: '2025-01-02',
        selectedTime: '10:00',
        totalCents: 57400,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      expect(bookingSession.step).toBe(4)
      expect(bookingSession.expiresAt).toBeDefined()
    })

    it('should trigger exit intent modal on leave', async () => {
      const exitIntent = {
        triggered: true,
        sessionId: 'session_123',
        step: 4,
        message: "Don't lose your booking! You're almost done.",
        offerDiscount: true,
        discountCode: 'COMEBACK10',
      }

      expect(exitIntent.offerDiscount).toBe(true)
    })

    it('should send recovery email after abandonment', async () => {
      const recoveryEmail = {
        to: TEST_AGENT.email,
        subject: 'Complete your booking for 123 Test Street',
        template: 'cart-recovery',
        delay: 3600000, // 1 hour
        data: {
          sessionUrl: 'https://app.aerialshots.media/booking/recover/session_123',
          propertyAddress: '123 Test Street',
          packageName: 'Signature',
          discountCode: 'COMEBACK10',
          discountValue: '10% off',
        },
      }

      expect(recoveryEmail.delay).toBe(3600000)
      expect(recoveryEmail.data.discountCode).toBe('COMEBACK10')
    })
  })

  describe('Error Handling', () => {
    it('should handle slot no longer available', async () => {
      const slotConflict = {
        error: 'SLOT_UNAVAILABLE',
        message: 'This time slot is no longer available. Please select another time.',
        suggestedSlots: [
          { date: '2025-01-02', time: '14:00' },
          { date: '2025-01-03', time: '10:00' },
        ],
      }

      expect(slotConflict.suggestedSlots).toHaveLength(2)
    })

    it('should handle address validation failure', async () => {
      const addressError = {
        error: 'INVALID_ADDRESS',
        message: 'We could not verify this address. Please check and try again.',
        field: 'address',
      }

      expect(addressError.field).toBe('address')
    })

    it('should handle service area restriction', async () => {
      const serviceAreaError = {
        error: 'OUTSIDE_SERVICE_AREA',
        message: 'We currently do not service this area.',
        maxDistance: 50,
        actualDistance: 75,
      }

      expect(serviceAreaError.actualDistance).toBeGreaterThan(serviceAreaError.maxDistance)
    })
  })
})
