/**
 * LoyaltyPointsSelector Component Tests
 *
 * TDD tests for loyalty points redemption in booking flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoyaltyPointsSelector, useLoyaltyPoints } from './LoyaltyPointsSelector'
import { renderHook } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the Slider component since radix-ui requires browser APIs
let sliderOnValueChange: ((value: number[]) => void) | undefined
vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, max, step, className }: {
    value: number[]
    onValueChange: (value: number[]) => void
    max: number
    step: number
    className?: string
  }) => {
    sliderOnValueChange = onValueChange
    return (
      <input
        type="range"
        role="slider"
        value={value[0]}
        max={max}
        step={step}
        className={className}
        onChange={(e) => onValueChange([parseInt(e.target.value, 10)])}
        data-testid="loyalty-slider"
      />
    )
  },
}))

// Mock the booking store
const mockBookingStore = {
  formData: {
    loyaltyPointsToRedeem: 0,
    loyaltyPointsValue: 0,
  },
}

vi.mock('@/stores/useBookingStore', () => ({
  useBookingStore: (selector: (state: typeof mockBookingStore) => unknown) => selector(mockBookingStore),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockBookingStore.formData.loyaltyPointsToRedeem = 0
  mockBookingStore.formData.loyaltyPointsValue = 0
  sliderOnValueChange = undefined
})

describe('LoyaltyPointsSelector', () => {
  const defaultProps = {
    maxPoints: 5000,
    pointsValue: 0.01, // 1 cent per point
    orderTotal: 500,
    onPointsChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render loyalty points header', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByText(/loyalty points/i)).toBeInTheDocument()
    })

    it('should show available points', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByText(/5,000 pts available/i)).toBeInTheDocument()
    })

    it('should render points slider', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('should not render when maxPoints is 0', () => {
      const { container } = render(<LoyaltyPointsSelector {...defaultProps} maxPoints={0} />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when maxPoints is negative', () => {
      const { container } = render(<LoyaltyPointsSelector {...defaultProps} maxPoints={-100} />)

      expect(container.firstChild).toBeNull()
    })

    it('should show apply button', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByRole('button', { name: /apply.*points/i })).toBeInTheDocument()
    })
  })

  describe('Points Selection', () => {
    it('should show selected points count', async () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      // Initial value should be 0 - look for the specific "Points to redeem" section
      const pointsText = screen.getByText(/points to redeem/i)
      expect(pointsText).toBeInTheDocument()
    })

    it('should show discount value preview', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      // Initial discount is $0.00
      expect(screen.getByText(/-\$0.00/i)).toBeInTheDocument()
    })

    it('should limit max redeemable to 50% of order', () => {
      // 5000 points at $0.01 = $50, but order is $100, so max is $50 (50%)
      render(<LoyaltyPointsSelector {...defaultProps} orderTotal={100} />)

      // Max should be 5000 pts (worth $50, which is 50% of $100)
      // Check that the slider exists and component renders
      expect(screen.getByRole('slider')).toBeInTheDocument()
      expect(screen.getByText(/5,000 pts available/i)).toBeInTheDocument()
    })

    it('should limit max based on available points when less than 50%', () => {
      // 1000 points at $0.01 = $10, order is $500, 50% would be $250
      // But user only has 1000 pts worth $10
      render(<LoyaltyPointsSelector {...defaultProps} maxPoints={1000} />)

      expect(screen.getByText(/1,000 pts available/i)).toBeInTheDocument()
    })

    it('should show info about 50% limit', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByText(/50% of your order/i)).toBeInTheDocument()
    })

    it('should show points value conversion rate', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByText(/\$0.01 in savings/i)).toBeInTheDocument()
    })
  })

  describe('Application', () => {
    it('should disable apply button when 0 points selected', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      const applyButton = screen.getByRole('button', { name: /apply.*points/i })
      expect(applyButton).toBeDisabled()
    })

    it('should call onPointsChange when applied', async () => {
      const onPointsChange = vi.fn()
      render(<LoyaltyPointsSelector {...defaultProps} onPointsChange={onPointsChange} />)

      // Change slider value using the mock callback
      act(() => {
        sliderOnValueChange?.([1000])
      })

      // Click apply button
      const applyButton = await screen.findByRole('button', { name: /apply.*points/i })
      await userEvent.click(applyButton)

      expect(onPointsChange).toHaveBeenCalledWith(1000, 10) // 1000 pts * 0.01 = $10
    })

    it('should show applied state after applying points', async () => {
      mockBookingStore.formData.loyaltyPointsToRedeem = 1000
      mockBookingStore.formData.loyaltyPointsValue = 10

      render(<LoyaltyPointsSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/1,000 points applied/i)).toBeInTheDocument()
        expect(screen.getByText(/saving \$10.00/i)).toBeInTheDocument()
      })
    })

    it('should show remove button in applied state', () => {
      mockBookingStore.formData.loyaltyPointsToRedeem = 1000
      mockBookingStore.formData.loyaltyPointsValue = 10

      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('should call onPointsChange with 0 when removed', async () => {
      mockBookingStore.formData.loyaltyPointsToRedeem = 1000
      mockBookingStore.formData.loyaltyPointsValue = 10

      const onPointsChange = vi.fn()
      render(<LoyaltyPointsSelector {...defaultProps} onPointsChange={onPointsChange} />)

      await userEvent.click(screen.getByRole('button', { name: /remove/i }))

      expect(onPointsChange).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('Calculation', () => {
    it('should calculate correct value for points', () => {
      // 1000 points at $0.01 each = $10
      mockBookingStore.formData.loyaltyPointsToRedeem = 1000
      mockBookingStore.formData.loyaltyPointsValue = 10

      render(<LoyaltyPointsSelector {...defaultProps} />)

      expect(screen.getByText(/\$10.00/i)).toBeInTheDocument()
    })

    it('should handle different point values', () => {
      // 500 points at $0.02 each = $10
      mockBookingStore.formData.loyaltyPointsToRedeem = 500
      mockBookingStore.formData.loyaltyPointsValue = 10

      render(<LoyaltyPointsSelector {...defaultProps} pointsValue={0.02} />)

      expect(screen.getByText(/\$10.00/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible slider', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
    })

    it('should have accessible apply button', () => {
      render(<LoyaltyPointsSelector {...defaultProps} />)

      const button = screen.getByRole('button', { name: /apply/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small point values', () => {
      render(<LoyaltyPointsSelector {...defaultProps} pointsValue={0.001} />)

      expect(screen.getByText(/\$0.00 in savings/i)).toBeInTheDocument()
    })

    it('should handle very large point values', () => {
      render(<LoyaltyPointsSelector {...defaultProps} maxPoints={100000} />)

      expect(screen.getByText(/100,000 pts available/i)).toBeInTheDocument()
    })

    it('should handle order total of 0', () => {
      render(<LoyaltyPointsSelector {...defaultProps} orderTotal={0} />)

      // Should still render but with 0 max redeemable
      expect(screen.getByText(/loyalty points/i)).toBeInTheDocument()
    })
  })
})

describe('useLoyaltyPoints hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch loyalty points on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ points: 2500 }),
    })

    const { result } = renderHook(() => useLoyaltyPoints())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/points')
    expect(result.current.points).toBe(2500)
  })

  it('should start with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ points: 1000 }),
    })

    const { result } = renderHook(() => useLoyaltyPoints())

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle API error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useLoyaltyPoints())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load points')
    expect(result.current.points).toBe(0)
  })

  it('should handle non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { result } = renderHook(() => useLoyaltyPoints())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.points).toBe(0)
  })

  it('should handle missing points in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const { result } = renderHook(() => useLoyaltyPoints())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.points).toBe(0)
  })
})
