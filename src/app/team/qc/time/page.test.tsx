import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock redirect to throw like Next.js does
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
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

// Mock TimeClock component
vi.mock('@/components/team/TimeClock', () => ({
  TimeClock: () => (
    <div data-testid="time-clock">Time Clock Component</div>
  ),
}))

// Import after mocks
import QCTimePage from './page'

describe('QCTimePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('redirects to login if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/staff-login')
    })

    it('redirects if user is not found in staff table', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'unknown@example.com' } },
      })
      mockSingle.mockResolvedValue({ data: null })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/staff-login')
    })

    it('redirects if user does not have QC role', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'photo@example.com' } },
      })
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John Photographer',
          email: 'photo@example.com',
          role: 'photographer', // Not QC
          team_role: null,
          payout_type: '1099',
          hourly_rate: null,
        },
      })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/team/qc')
    })

    it('redirects if payout_type is not hourly', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'qc@example.com' } },
      })
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
          team_role: null,
          payout_type: '1099', // Not hourly
          hourly_rate: null,
        },
      })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/team/qc')
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'qc@example.com' } },
      })
    })

    it('renders TimeClock component for QC staff with hourly payout', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
          team_role: null,
          payout_type: 'hourly',
          hourly_rate: 5.50,
        },
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByTestId('time-clock')).toBeInTheDocument()
    })

    it('renders warning when hourly_rate is not configured', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
          team_role: null,
          payout_type: 'hourly',
          hourly_rate: null, // Not configured
        },
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByText(/hourly rate not configured/i)).toBeInTheDocument()
    })

    it('allows admin access to time tracking', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          team_role: null,
          payout_type: 'hourly',
          hourly_rate: 10.00,
        },
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByTestId('time-clock')).toBeInTheDocument()
    })

    it('renders page title and description', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
          team_role: null,
          payout_type: 'hourly',
          hourly_rate: 5.50,
        },
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByRole('heading', { name: /time tracking/i })).toBeInTheDocument()
    })
  })
})
