import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StripeConnectCard } from './StripeConnectCard'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('StripeConnectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('renders loading spinner while fetching account status', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<StripeConnectCard staffId="staff-123" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('No Connect account', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hasAccount: false,
          staff: {
            id: 'staff-123',
            name: 'John Photographer',
            email: 'john@example.com',
            payoutType: '1099',
            payoutPercent: 40,
          },
        }),
      })
    })

    it('renders "Set Up Payouts" button when no Connect account exists', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set up payouts/i })).toBeInTheDocument()
      })
    })

    it('shows payout percentage info', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/40%/)).toBeInTheDocument()
      })
    })

    it('calls POST endpoint when setup button clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hasAccount: false,
            staff: { id: 'staff-123', name: 'John', email: 'john@example.com', payoutType: '1099', payoutPercent: 40 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            accountId: 'acct_123',
            onboardingUrl: 'https://connect.stripe.com/onboard/123',
          }),
        })

      // Mock window.location.href
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any

      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set up payouts/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /set up payouts/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/connect/staff/account', {
          method: 'POST',
        })
      })

      // Restore
      window.location = originalLocation
    })
  })

  describe('Pending onboarding', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hasAccount: true,
          staff: {
            id: 'staff-123',
            name: 'John Photographer',
            email: 'john@example.com',
            payoutType: '1099',
            payoutPercent: 40,
          },
          connect: {
            accountId: 'acct_123',
            status: 'pending',
            payoutsEnabled: false,
            chargesEnabled: false,
            detailsSubmitted: false,
          },
        }),
      })
    })

    it('renders "Complete Setup" button when account created but not completed', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument()
      })
    })

    it('shows pending status badge', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/pending/i)).toBeInTheDocument()
      })
    })
  })

  describe('Active account (payouts enabled)', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hasAccount: true,
          staff: {
            id: 'staff-123',
            name: 'John Photographer',
            email: 'john@example.com',
            payoutType: '1099',
            payoutPercent: 40,
          },
          connect: {
            accountId: 'acct_123',
            status: 'active',
            payoutsEnabled: true,
            chargesEnabled: true,
            detailsSubmitted: true,
            dashboardUrl: 'https://connect.stripe.com/express/acct_123',
          },
        }),
      })
    })

    it('renders "Payouts Active" badge when fully enabled', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/payouts active/i)).toBeInTheDocument()
      })
    })

    it('renders dashboard link when payouts enabled', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /stripe dashboard/i })).toHaveAttribute(
          'href',
          'https://connect.stripe.com/express/acct_123'
        )
      })
    })

    it('shows active status with green styling', async () => {
      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        const badge = screen.getByText(/payouts active/i)
        expect(badge.className).toContain('green')
      })
    })
  })

  describe('Error handling', () => {
    it('handles fetch error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('handles API error response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      })

      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument()
      })
    })
  })

  describe('Non-eligible staff', () => {
    it('shows message when staff is not 1099 contractor', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          hasAccount: false,
          staff: {
            id: 'staff-123',
            name: 'John Employee',
            email: 'john@example.com',
            payoutType: 'w2',
            payoutPercent: null,
          },
        }),
      })

      render(<StripeConnectCard staffId="staff-123" />)

      await waitFor(() => {
        expect(screen.getByText(/w2 employees/i)).toBeInTheDocument()
      })
    })
  })

  describe('onSetup callback', () => {
    it('calls onSetup callback when setup initiated successfully', async () => {
      const onSetup = vi.fn()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hasAccount: false,
            staff: { id: 'staff-123', name: 'John', email: 'john@example.com', payoutType: '1099', payoutPercent: 40 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            accountId: 'acct_123',
            onboardingUrl: 'https://connect.stripe.com/onboard/123',
          }),
        })

      // Mock window.location.href
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any

      render(<StripeConnectCard staffId="staff-123" onSetup={onSetup} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /set up payouts/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /set up payouts/i }))

      await waitFor(() => {
        expect(onSetup).toHaveBeenCalledWith('acct_123')
      })

      // Restore
      window.location = originalLocation
    })
  })
})
