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
const mockOrder = vi.fn()
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}))

mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })
mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder })
mockOrder.mockReturnValue({ data: [] })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// Mock PayrollClient
vi.mock('./PayrollClient', () => ({
  PayrollClient: ({
    payPeriods,
    staffWithTimesheets
  }: {
    payPeriods: { id: string; status: string }[];
    staffWithTimesheets: { name: string }[]
  }) => (
    <div data-testid="payroll-client">
      <div data-testid="periods-count">{payPeriods.length} periods</div>
      <div data-testid="staff-count">{staffWithTimesheets.length} staff</div>
      {payPeriods.map((p) => (
        <div key={p.id} data-testid={`period-${p.id}`} data-status={p.status}>
          Period {p.id}
        </div>
      ))}
    </div>
  ),
}))

// Import after mocks
import PayrollPage from './page'

describe('AdminPayrollPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('redirects to login if not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      await expect(PayrollPage()).rejects.toThrow('REDIRECT:/login')
    })

    it('redirects to dashboard if not staff', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'unknown@example.com' } },
      })
      mockSingle.mockResolvedValue({ data: null })

      await expect(PayrollPage()).rejects.toThrow('REDIRECT:/dashboard')
    })

    it('redirects to dashboard if not admin', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'photo@example.com' } },
      })
      mockSingle.mockResolvedValue({
        data: {
          id: 'staff-123',
          role: 'photographer', // Not admin
        },
      })

      await expect(PayrollPage()).rejects.toThrow('REDIRECT:/dashboard')
    })
  })

  describe('Rendering', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'admin@aerialshots.media' } },
      })
    })

    it('renders PayrollClient when admin is authenticated', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'admin-123',
          role: 'admin',
        },
      })
      mockOrder.mockResolvedValue({ data: [] })

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('payroll-client')).toBeInTheDocument()
    })

    it('passes pay periods to client', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'admin-123',
          role: 'admin',
        },
      })

      // Mock pay periods query
      const mockPeriods = [
        { id: 'period-1', status: 'open', start_date: '2024-01-01', end_date: '2024-01-14' },
        { id: 'period-2', status: 'closed', start_date: '2023-12-18', end_date: '2023-12-31' },
      ]

      mockOrder.mockImplementation(() => ({
        data: mockPeriods,
        eq: mockEq,
      }))

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('periods-count')).toHaveTextContent('2 periods')
    })

    it('includes staff with hourly payout type', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'admin-123',
          role: 'admin',
        },
      })

      // Mock staff query for hourly workers
      const mockStaff = [
        { id: 'qc-1', name: 'QC Worker 1', payout_type: 'hourly' },
        { id: 'qc-2', name: 'QC Worker 2', payout_type: 'hourly' },
      ]

      // Chain mock for different queries
      let callCount = 0
      mockOrder.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Pay periods
          return { data: [], eq: mockEq }
        }
        // Staff
        return { data: mockStaff, eq: mockEq }
      })

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('staff-count')).toHaveTextContent('2 staff')
    })
  })
})
