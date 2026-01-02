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
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}))

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ eq: mockEq, single: mockSingle })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
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

      await expect(
        PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('REDIRECT:/staff-login')
    })

    it('redirects if user is not a photographer', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'john@example.com' } },
      })
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John',
          email: 'john@example.com',
          role: 'videographer', // Not a photographer
          team_role: null,
        },
      })

      await expect(
        PhotographerSettingsPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('REDIRECT:/staff-login')
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'photo@example.com' } },
      })
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John Photographer',
          email: 'photo@example.com',
          phone: '555-1234',
          role: 'photographer',
          team_role: null,
          skills: ['Real Estate', 'Drone'],
          certifications: ['FAA Part 107'],
          payout_type: '1099',
          default_payout_percent: 40,
        },
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
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John Photographer',
          email: 'photo@example.com',
          role: 'photographer',
          team_role: null,
          skills: [],
          certifications: [],
          payout_type: '1099',
          default_payout_percent: 40,
        },
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
