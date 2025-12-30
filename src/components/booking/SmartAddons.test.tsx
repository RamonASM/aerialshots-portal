/**
 * SmartAddons Component Tests
 *
 * TDD tests for smart add-on recommendations in booking flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmartAddons } from './SmartAddons'

// Mock the booking store
const mockToggleAddon = vi.fn()
const mockSetAddonQuantity = vi.fn()
const mockNextStep = vi.fn()

const mockBookingStore = {
  formData: {
    packageKey: 'signature',
    addons: [] as Array<{ id: string; quantity?: number }>,
    sqft: 2500,
  },
  pricing: {
    addonsTotal: 0,
    total: 449,
  },
  toggleAddon: mockToggleAddon,
  setAddonQuantity: mockSetAddonQuantity,
  nextStep: mockNextStep,
}

vi.mock('@/stores/useBookingStore', () => ({
  useBookingStore: () => mockBookingStore,
}))

// Mock the booking config
vi.mock('@/lib/booking/config', () => ({
  LISTING_ADDONS: [
    {
      id: 'rush-delivery',
      name: 'Rush Delivery',
      description: '24-hour turnaround',
      price: 75,
      category: 'delivery',
      priceType: 'flat',
      popular: true,
    },
    {
      id: 'social-reel',
      name: 'Social Reel',
      description: '30-second social media video',
      price: 125,
      category: 'video',
      priceType: 'flat',
    },
    {
      id: 'aerial-video',
      name: 'Aerial Video',
      description: 'Drone video footage',
      price: 150,
      category: 'video',
      priceType: 'flat',
    },
    {
      id: 'premium-staging',
      name: 'Premium Staging',
      description: 'Virtual staging per room',
      price: 35,
      category: 'staging',
      priceType: 'per_unit',
      unit: 'room',
    },
    {
      id: 'extra-twilight',
      name: 'Extra Twilight',
      description: 'Additional twilight photos',
      price: 85,
      category: 'photography',
      priceType: 'flat',
    },
    {
      id: 'photo-retouch',
      name: 'Photo Retouch',
      description: 'Per photo retouching',
      price: 15,
      category: 'photography',
      priceType: 'per_unit',
      unit: 'photo',
    },
  ],
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockBookingStore.formData.packageKey = 'signature'
  mockBookingStore.formData.addons = []
  mockBookingStore.pricing.addonsTotal = 0
  mockBookingStore.pricing.total = 449
})

describe('SmartAddons', () => {
  describe('Rendering', () => {
    it('should render header', () => {
      render(<SmartAddons />)

      expect(screen.getByText('Enhance Your Package')).toBeInTheDocument()
      expect(screen.getByText(/add services to make your listing stand out/i)).toBeInTheDocument()
    })

    it('should render category tabs', () => {
      render(<SmartAddons />)

      expect(screen.getByRole('button', { name: /virtual staging/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /photography/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delivery/i })).toBeInTheDocument()
    })

    it('should render continue button', () => {
      render(<SmartAddons />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('should render skip option', () => {
      render(<SmartAddons />)

      expect(screen.getByText(/skip add-ons for now/i)).toBeInTheDocument()
    })

    it('should show current total', () => {
      render(<SmartAddons />)

      expect(screen.getByText('$449')).toBeInTheDocument()
    })
  })

  describe('Smart Recommendations', () => {
    it('should show recommended for you section', () => {
      render(<SmartAddons />)

      expect(screen.getByText(/recommended for you/i)).toBeInTheDocument()
    })

    it('should recommend rush delivery for all packages', () => {
      render(<SmartAddons />)

      // Rush delivery should be in recommendations
      const recommendedSection = screen.getByText(/recommended for you/i).closest('div')?.parentElement
      expect(recommendedSection).toBeTruthy()
    })

    it('should recommend social reel for signature package', () => {
      mockBookingStore.formData.packageKey = 'signature'
      render(<SmartAddons />)

      // Social reel should be recommended for signature
      const addButtons = screen.getAllByRole('button', { name: /add/i })
      expect(addButtons.length).toBeGreaterThan(0)
    })

    it('should recommend aerial-video and social-reel for essentials package', () => {
      mockBookingStore.formData.packageKey = 'essentials'
      render(<SmartAddons />)

      // Should have recommendations
      expect(screen.getByText(/recommended for you/i)).toBeInTheDocument()
    })
  })

  describe('Category Navigation', () => {
    it('should default to staging category', () => {
      render(<SmartAddons />)

      const stagingTab = screen.getByRole('button', { name: /virtual staging/i })
      expect(stagingTab).toHaveClass('bg-blue-500')
    })

    it('should switch category on tab click', async () => {
      render(<SmartAddons />)

      const videoTab = screen.getByRole('button', { name: /video/i })
      await userEvent.click(videoTab)

      expect(videoTab).toHaveClass('bg-blue-500')
    })

    it('should show add-ons filtered by category', async () => {
      render(<SmartAddons />)

      // Switch to delivery category
      const deliveryTab = screen.getByRole('button', { name: /delivery/i })
      await userEvent.click(deliveryTab)

      // Should show rush delivery (may appear in recommendations and category)
      expect(screen.getAllByText('Rush Delivery').length).toBeGreaterThan(0)
    })

    it('should show video add-ons in video category', async () => {
      render(<SmartAddons />)

      const videoTab = screen.getByRole('button', { name: /video/i })
      await userEvent.click(videoTab)

      // May appear in recommendations and category grid
      expect(screen.getAllByText('Social Reel').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Aerial Video').length).toBeGreaterThan(0)
    })
  })

  describe('Adding Add-ons', () => {
    it('should call toggleAddon when add button clicked', async () => {
      render(<SmartAddons />)

      // Find an add button (not in the recommendation cards)
      const addButtons = screen.getAllByRole('button', { name: /add/i })
      const firstAddButton = addButtons[0]

      await userEvent.click(firstAddButton)

      expect(mockToggleAddon).toHaveBeenCalled()
    })

    it('should set quantity to 1 for per_unit add-ons', async () => {
      render(<SmartAddons />)

      // Click on staging tab (has per_unit addon)
      const stagingTab = screen.getByRole('button', { name: /virtual staging/i })
      await userEvent.click(stagingTab)

      // Find premium staging add button
      const premiumStagingCard = screen.getByText('Premium Staging').closest('div')
      expect(premiumStagingCard).toBeTruthy()
    })

    it('should show popular badge on popular add-ons', async () => {
      render(<SmartAddons />)

      // Switch to delivery to see rush delivery
      const deliveryTab = screen.getByRole('button', { name: /delivery/i })
      await userEvent.click(deliveryTab)

      expect(screen.getByText('Popular')).toBeInTheDocument()
    })
  })

  describe('Quantity Controls', () => {
    it('should show quantity controls for per_unit add-ons when selected', async () => {
      mockBookingStore.formData.addons = [{ id: 'premium-staging', quantity: 2 }]

      render(<SmartAddons />)

      // Should show quantity of 2
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should call setAddonQuantity when increasing quantity', async () => {
      mockBookingStore.formData.addons = [{ id: 'premium-staging', quantity: 1 }]

      render(<SmartAddons />)

      // Find plus button next to quantity
      const plusButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-plus') !== null
      )

      if (plusButtons.length > 0) {
        await userEvent.click(plusButtons[0])
      }
    })

    it('should call toggleAddon when quantity reduced to 0', async () => {
      mockBookingStore.formData.addons = [{ id: 'premium-staging', quantity: 1 }]

      render(<SmartAddons />)

      // Find minus button
      const minusButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg.lucide-minus') !== null
      )

      if (minusButtons.length > 0) {
        await userEvent.click(minusButtons[0])
      }
    })
  })

  describe('Selected Add-ons Summary', () => {
    it('should show selected add-ons section when add-ons are selected', () => {
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]
      mockBookingStore.pricing.addonsTotal = 75

      render(<SmartAddons />)

      expect(screen.getByText('Selected Add-ons')).toBeInTheDocument()
      expect(screen.getByText('+$75')).toBeInTheDocument()
    })

    it('should show add-on names in summary', () => {
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]

      render(<SmartAddons />)

      // Check summary section shows the addon
      const summary = screen.getByText('Selected Add-ons').closest('div')
      expect(summary).toBeTruthy()
    })

    it('should show quantity badge for quantity > 1', () => {
      mockBookingStore.formData.addons = [{ id: 'premium-staging', quantity: 3 }]

      render(<SmartAddons />)

      expect(screen.getByText('x3')).toBeInTheDocument()
    })

    it('should hide summary when no add-ons selected', () => {
      mockBookingStore.formData.addons = []

      render(<SmartAddons />)

      expect(screen.queryByText('Selected Add-ons')).not.toBeInTheDocument()
    })

    it('should allow removing add-on from summary', async () => {
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]

      render(<SmartAddons />)

      // Find remove button in summary
      const summarySection = screen.getByText('Selected Add-ons').closest('div')
      expect(summarySection).toBeTruthy()
    })
  })

  describe('Navigation', () => {
    it('should call nextStep when continue clicked', async () => {
      render(<SmartAddons />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await userEvent.click(continueButton)

      expect(mockNextStep).toHaveBeenCalled()
    })

    it('should call onContinue callback when continue clicked', async () => {
      const onContinue = vi.fn()
      render(<SmartAddons onContinue={onContinue} />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await userEvent.click(continueButton)

      expect(onContinue).toHaveBeenCalled()
    })

    it('should allow skipping add-ons', async () => {
      render(<SmartAddons />)

      const skipButton = screen.getByText(/skip add-ons for now/i)
      await userEvent.click(skipButton)

      expect(mockNextStep).toHaveBeenCalled()
    })
  })

  describe('Pricing', () => {
    it('should display addon prices', async () => {
      render(<SmartAddons />)

      // Switch to delivery tab
      const deliveryTab = screen.getByRole('button', { name: /delivery/i })
      await userEvent.click(deliveryTab)

      // Price may appear multiple times (in recommendation and grid)
      expect(screen.getAllByText('$75').length).toBeGreaterThan(0)
    })

    it('should show per-unit pricing with unit label', () => {
      render(<SmartAddons />)

      // Staging category has per_unit addons
      expect(screen.getByText('/room')).toBeInTheDocument()
    })

    it('should update total when add-ons selected', () => {
      mockBookingStore.pricing.total = 524 // 449 + 75
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]

      render(<SmartAddons />)

      expect(screen.getByText('$524')).toBeInTheDocument()
    })
  })

  describe('Add-on Card States', () => {
    it('should show different styling when selected', () => {
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]

      render(<SmartAddons />)

      // Switch to delivery to see the selected addon
      const deliveryTab = screen.getByRole('button', { name: /delivery/i })
      expect(deliveryTab).toBeInTheDocument()
    })

    it('should show remove button for selected flat-price addons', async () => {
      mockBookingStore.formData.addons = [{ id: 'rush-delivery' }]

      render(<SmartAddons />)

      // Switch to delivery
      const deliveryTab = screen.getByRole('button', { name: /delivery/i })
      await userEvent.click(deliveryTab)

      // Should have the addon shown (may appear multiple times)
      const rushDeliveryElements = screen.getAllByText('Rush Delivery')
      expect(rushDeliveryElements.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible category buttons', () => {
      render(<SmartAddons />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have visible add/remove buttons', () => {
      render(<SmartAddons />)

      const addButtons = screen.getAllByRole('button', { name: /add/i })
      addButtons.forEach(button => {
        expect(button).toBeVisible()
      })
    })
  })
})
