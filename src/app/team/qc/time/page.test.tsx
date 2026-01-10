import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock redirect to throw like Next.js does
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

// Mock staff data function
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

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

// Mock auth middleware
const mockGetStaffAccess = vi.fn()
vi.mock('@/lib/auth/server-access', () => ({
  getStaffAccess: () => mockGetStaffAccess(),
  hasRequiredRole: (role: string, allowedRoles: string[]) => {
    // Auto-include admin and owner
    const fullAllowed = [...allowedRoles, 'admin', 'owner']
    return fullAllowed.includes(role)
  },
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
      mockGetStaffAccess.mockResolvedValue(null)

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/sign-in/staff')
    })

    it('redirects if user does not have QC role', async () => {
      mockGetStaffAccess.mockResolvedValue({
        id: 'staff-123',
        email: 'photo@example.com',
        role: 'photographer', // Not QC
        authUserId: 'auth-123',
      })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/team/qc')
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      mockGetStaffAccess.mockResolvedValue({
        id: 'staff-123',
        email: 'qc@example.com',
        role: 'qc',
        authUserId: 'auth-123',
      })
    })

    it('renders TimeClock component for QC staff', async () => {
      mockStaffData.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
        },
        error: null,
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByTestId('time-clock')).toBeInTheDocument()
    })

    it('allows admin access to time tracking', async () => {
      mockGetStaffAccess.mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
        authUserId: 'auth-456',
      })
      mockStaffData.mockResolvedValue({
        data: {
          id: 'admin-123',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
        },
        error: null,
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByTestId('time-clock')).toBeInTheDocument()
    })

    it('renders page title and description', async () => {
      mockStaffData.mockResolvedValue({
        data: {
          id: 'staff-123',
          name: 'John QC',
          email: 'qc@example.com',
          role: 'qc',
        },
        error: null,
      })

      const page = await QCTimePage()
      render(page)

      expect(screen.getByRole('heading', { name: /time tracking/i })).toBeInTheDocument()
    })

    it('redirects to login if staff record not found', async () => {
      mockStaffData.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(QCTimePage()).rejects.toThrow('REDIRECT:/sign-in/staff')
    })
  })
})
