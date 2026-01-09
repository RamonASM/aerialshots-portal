import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase admin client
const mockPayPeriodsData = vi.fn()
const mockStaffData = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'pay_periods') {
    return {
      select: vi.fn().mockReturnThis(),
      order: () => mockPayPeriodsData(),
    }
  }
  if (table === 'staff') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: () => mockStaffData(),
    }
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: () => Promise.resolve({ data: null, error: null }),
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
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
  // Note: Authentication is handled by the admin layout, not this page component

  beforeEach(() => {
    vi.clearAllMocks()
    // Default to empty data
    mockPayPeriodsData.mockResolvedValue({ data: [], error: null })
    mockStaffData.mockResolvedValue({ data: [], error: null })
  })

  describe('Rendering', () => {
    it('renders PayrollClient component', async () => {
      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('payroll-client')).toBeInTheDocument()
    })

    it('passes pay periods to client', async () => {
      const mockPeriods = [
        { id: 'period-1', status: 'open', start_date: '2024-01-01', end_date: '2024-01-14' },
        { id: 'period-2', status: 'closed', start_date: '2023-12-18', end_date: '2023-12-31' },
      ]

      mockPayPeriodsData.mockResolvedValue({ data: mockPeriods, error: null })

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('periods-count')).toHaveTextContent('2 periods')
    })

    it('passes hourly staff to client', async () => {
      const mockStaff = [
        { id: 'staff-1', name: 'Alice', email: 'alice@test.com', role: 'qc', hourly_rate: 15, payout_type: 'hourly' },
        { id: 'staff-2', name: 'Bob', email: 'bob@test.com', role: 'qc', hourly_rate: 15, payout_type: 'hourly' },
      ]

      mockStaffData.mockResolvedValue({ data: mockStaff, error: null })

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('staff-count')).toHaveTextContent('2 staff')
    })

    it('handles empty data gracefully', async () => {
      mockPayPeriodsData.mockResolvedValue({ data: null, error: null })
      mockStaffData.mockResolvedValue({ data: null, error: null })

      const page = await PayrollPage()
      render(page)

      expect(screen.getByTestId('periods-count')).toHaveTextContent('0 periods')
      expect(screen.getByTestId('staff-count')).toHaveTextContent('0 staff')
    })
  })
})
