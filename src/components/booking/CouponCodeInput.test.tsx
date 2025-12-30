/**
 * CouponCodeInput Component Tests
 *
 * TDD tests for coupon code validation and application
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CouponCodeInput } from './CouponCodeInput'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the booking store
const mockBookingStore = {
  formData: {
    couponCode: null as string | null,
  },
  pricing: {
    couponDiscount: 0,
  },
}

vi.mock('@/stores/useBookingStore', () => ({
  useBookingStore: (selector: (state: typeof mockBookingStore) => unknown) => selector(mockBookingStore),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockBookingStore.formData.couponCode = null
  mockBookingStore.pricing.couponDiscount = 0
})

describe('CouponCodeInput', () => {
  const defaultProps = {
    subtotal: 500,
    onApply: vi.fn(),
    onRemove: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render coupon input field', () => {
      render(<CouponCodeInput {...defaultProps} />)

      expect(screen.getByPlaceholderText(/coupon code/i)).toBeInTheDocument()
    })

    it('should render apply button', () => {
      render(<CouponCodeInput {...defaultProps} />)

      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
    })

    it('should show applied state when coupon is active', () => {
      mockBookingStore.formData.couponCode = 'SAVE20'
      mockBookingStore.pricing.couponDiscount = 100

      render(<CouponCodeInput {...defaultProps} />)

      expect(screen.getByText('SAVE20')).toBeInTheDocument()
      expect(screen.getByText(/saving \$100/i)).toBeInTheDocument()
    })

    it('should uppercase input as user types', async () => {
      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'summer2024')

      expect(input).toHaveValue('SUMMER2024')
    })
  })

  describe('Validation', () => {
    it('should show error for empty code submission', async () => {
      render(<CouponCodeInput {...defaultProps} />)
      const applyButton = screen.getByRole('button', { name: /apply/i })

      // Button should be disabled when input is empty
      expect(applyButton).toBeDisabled()
    })

    it('should validate coupon with API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 20,
          type: 'percent',
          message: 'Valid coupon',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'SAVE20')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'SAVE20',
            subtotal: 500,
          }),
        })
      })
    })

    it('should call onApply with valid coupon details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 20,
          type: 'percent',
          message: 'Valid coupon',
        }),
      })

      const onApply = vi.fn()
      render(<CouponCodeInput {...defaultProps} onApply={onApply} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'SAVE20')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith('SAVE20', 20, 'percent')
      })
    })

    it('should show error for invalid coupon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          message: 'Coupon has expired',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'EXPIRED')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(screen.getByText(/coupon has expired/i)).toBeInTheDocument()
      })
    })

    it('should show error for minimum order requirement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 50,
          type: 'fixed',
          message: 'Valid coupon',
          minOrder: 1000,
        }),
      })

      render(<CouponCodeInput {...defaultProps} subtotal={500} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'BIGORDER')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(screen.getByText(/minimum order of \$1000 required/i)).toBeInTheDocument()
      })
    })

    it('should show loading state while validating', async () => {
      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'LOADING')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      // Should show loading spinner
      expect(screen.getByRole('button')).toBeDisabled()

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ valid: true, discount: 10, type: 'percent' }),
      })
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'ERROR')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to validate coupon/i)).toBeInTheDocument()
      })
    })

    it('should allow Enter key to submit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 15,
          type: 'percent',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'ENTER15{Enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Removal', () => {
    it('should show remove button when coupon is applied', () => {
      mockBookingStore.formData.couponCode = 'SAVE20'
      mockBookingStore.pricing.couponDiscount = 100

      render(<CouponCodeInput {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('should call onRemove when remove button clicked', async () => {
      mockBookingStore.formData.couponCode = 'SAVE20'
      mockBookingStore.pricing.couponDiscount = 100

      const onRemove = vi.fn()
      render(<CouponCodeInput {...defaultProps} onRemove={onRemove} />)

      await userEvent.click(screen.getByRole('button', { name: /remove/i }))

      expect(onRemove).toHaveBeenCalled()
    })

    it('should clear error when typing after error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          message: 'Invalid code',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'INVALID')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid code/i)).toBeInTheDocument()
      })

      // Type new code - error should clear
      await userEvent.clear(input)
      await userEvent.type(input, 'NEW')

      expect(screen.queryByText(/invalid code/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible input label', () => {
      render(<CouponCodeInput {...defaultProps} />)

      const input = screen.getByPlaceholderText(/coupon code/i)
      expect(input).toBeVisible()
    })

    it('should announce errors to screen readers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          message: 'Expired coupon',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'EXPIRED')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        // Error should be visible for all users
        expect(screen.getByText(/expired coupon/i)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should trim whitespace from code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 10,
          type: 'percent',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, '  TRIM  ')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'TRIM',
            subtotal: 500,
          }),
        })
      })
    })

    it('should handle fixed discount type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          discount: 50,
          type: 'fixed',
        }),
      })

      const onApply = vi.fn()
      render(<CouponCodeInput {...defaultProps} onApply={onApply} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'FLAT50')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith('FLAT50', 50, 'fixed')
      })
    })

    it('should handle server error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          message: 'Server error',
        }),
      })

      render(<CouponCodeInput {...defaultProps} />)
      const input = screen.getByPlaceholderText(/coupon code/i)

      await userEvent.type(input, 'ERROR')
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })
    })
  })
})
