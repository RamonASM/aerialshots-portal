import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock redirect to throw like Next.js does
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
const mockGetUser = vi.fn()
const mockStaffData = vi.fn()

// Create a chainable mock that returns the configured staff data
const createMockChain = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: () => mockStaffData(),
  maybeSingle: () => mockStaffData(),
  order: vi.fn().mockReturnThis(),
})

const mockFrom = vi.fn(() => createMockChain())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// Mock Supabase admin client (used by getStaffAccess -> lookupStaffOrPartner)
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Mock StripeConnectCard
vi.mock('@/components/team/StripeConnectCard', () => ({
  StripeConnectCard: ({ staffId }: { staffId: string }) => (
    <div data-testid="stripe-connect-card" data-staff-id={staffId}>
      Stripe Connect Card
    </div>
  ),
}))

// Import after mocks
import PhotographerSettingsPage from './page'

describe('PhotographerSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('redirects to login if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      mockStaffData.mockResolvedValue({ data: null, error: null })

      await expect(
        PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('REDIRECT:/sign-in/staff')
    })

    it('redirects if user is not a photographer', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'john@example.com' } },
      })
      mockStaffData.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John',
          email: 'john@example.com',
          role: 'videographer', // Not a photographer
          team_role: null,
          is_active: true,
        },
        error: null,
      })

      await expect(
        PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('REDIRECT:/sign-in/staff')
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'photo@example.com' } },
      })
      mockStaffData.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John Photographer',
          email: 'photo@example.com',
          phone: '555-1234',
          role: 'photographer',
          team_role: null,
          is_active: true,
          skills: ['Real Estate', 'Drone'],
          certifications: ['FAA Part 107'],
          payout_type: '1099',
          default_payout_percent: 40,
        },
        error: null,
      })
    })

    it('renders profile card with staff info', async () => {
      const page = await PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      render(page)

      expect(screen.getByText('John Photographer')).toBeInTheDocument()
      expect(screen.getByText('photo@example.com')).toBeInTheDocument()
    })

    it('renders StripeConnectCard component', async () => {
      const page = await PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      render(page)

      expect(screen.getByTestId('stripe-connect-card')).toBeInTheDocument()
    })

    it('renders skills badges', async () => {
      const page = await PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      render(page)

      expect(screen.getByText('Real Estate')).toBeInTheDocument()
      expect(screen.getByText('Drone')).toBeInTheDocument()
    })

    it('renders certifications badges', async () => {
      const page = await PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      render(page)

      expect(screen.getByText('FAA Part 107')).toBeInTheDocument()
    })
  })

  describe('Success message', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'photo@example.com' } },
      })
      mockStaffData.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John Photographer',
          email: 'photo@example.com',
          role: 'photographer',
          team_role: null,
          is_active: true,
          skills: [],
          certifications: [],
          payout_type: '1099',
          default_payout_percent: 40,
        },
        error: null,
      })
    })

    it('shows success message when ?connect=success', async () => {
      const page = await PhotographerSettingsPage({
        searchParams: Promise.resolve({ connect: 'success' }),
      })
      render(page)

      expect(screen.getByText(/successfully connected/i)).toBeInTheDocument()
    })
  })
})
