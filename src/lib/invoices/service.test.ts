import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUnpaidInvoices,
  getInvoiceById,
  calculateBulkPaymentTotal,
  createBulkPaymentIntent,
  markInvoicesPaid,
  getInvoiceHistory,
  generateInvoicePdf,
  type Invoice,
  type InvoiceStatus,
  type BulkPaymentResult,
} from './service'

// Mock Supabase admin client
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}))

// Mock Stripe
vi.mock('@/lib/payments/stripe', () => ({
  createPaymentIntent: vi.fn(() =>
    Promise.resolve({
      success: true,
      clientSecret: 'pi_test_secret',
      paymentIntentId: 'pi_test_123',
    })
  ),
}))

// Helper to create fully chainable mock
const createChain = (finalResult: unknown) => {
  const createNestedChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'is', 'in', 'contains',
      'gte', 'gt', 'lt', 'lte',
      'order', 'limit', 'range',
      'single', 'maybeSingle', 'rpc'
    ]
    methods.forEach((method) => {
      chain[method] = () => {
        if (method === 'single' || method === 'maybeSingle') {
          return Promise.resolve(finalResult)
        }
        return createNestedChain()
      }
    })
    chain.then = (resolve: (value: unknown) => void) => Promise.resolve(finalResult).then(resolve)
    return chain
  }
  return createNestedChain()
}

describe('Invoice Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  describe('getUnpaidInvoices', () => {
    it('should return all unpaid invoices for an agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'inv-1',
              agent_id: 'agent-1',
              amount: 299.00,
              status: 'pending',
              due_date: '2025-01-15',
              listing_address: '123 Main St',
            },
            {
              id: 'inv-2',
              agent_id: 'agent-1',
              amount: 449.00,
              status: 'pending',
              due_date: '2025-01-20',
              listing_address: '456 Oak Ave',
            },
          ],
          error: null,
        })
      )

      const invoices = await getUnpaidInvoices('agent-1')

      expect(invoices.length).toBe(2)
      expect(invoices[0].status).toBe('pending')
    })

    it('should return empty array when no unpaid invoices', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [],
          error: null,
        })
      )

      const invoices = await getUnpaidInvoices('agent-1')

      expect(invoices.length).toBe(0)
    })

    it('should include overdue invoices', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'inv-1',
              amount: 299.00,
              status: 'overdue',
              due_date: '2025-01-01',
            },
          ],
          error: null,
        })
      )

      const invoices = await getUnpaidInvoices('agent-1')

      expect(invoices[0].status).toBe('overdue')
    })
  })

  describe('getInvoiceById', () => {
    it('should return invoice details', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: {
            id: 'inv-1',
            agent_id: 'agent-1',
            amount: 299.00,
            status: 'pending',
            line_items: [
              { description: 'Photo Package', amount: 249.00 },
              { description: 'Rush Fee', amount: 50.00 },
            ],
          },
          error: null,
        })
      )

      const invoice = await getInvoiceById('inv-1')

      expect(invoice).not.toBeNull()
      expect(invoice?.line_items?.length).toBe(2)
    })

    it('should return null for invalid invoice', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: null,
          error: { code: 'PGRST116' },
        })
      )

      const invoice = await getInvoiceById('invalid-id')

      expect(invoice).toBeNull()
    })
  })

  describe('calculateBulkPaymentTotal', () => {
    it('should calculate total for multiple invoices', () => {
      const invoices: Invoice[] = [
        { id: 'inv-1', amount: 299.00, status: 'pending' } as Invoice,
        { id: 'inv-2', amount: 449.00, status: 'pending' } as Invoice,
        { id: 'inv-3', amount: 199.00, status: 'pending' } as Invoice,
      ]

      const result = calculateBulkPaymentTotal(invoices)

      expect(result.subtotal).toBe(947.00)
      expect(result.total).toBe(947.00)
      expect(result.invoice_count).toBe(3)
    })

    it('should apply processing fee if configured', () => {
      const invoices: Invoice[] = [
        { id: 'inv-1', amount: 100.00, status: 'pending' } as Invoice,
      ]

      const result = calculateBulkPaymentTotal(invoices, { include_processing_fee: true })

      expect(result.processing_fee).toBeGreaterThan(0)
      expect(result.total).toBeGreaterThan(100.00)
    })

    it('should handle empty invoice list', () => {
      const result = calculateBulkPaymentTotal([])

      expect(result.subtotal).toBe(0)
      expect(result.total).toBe(0)
      expect(result.invoice_count).toBe(0)
    })
  })

  describe('createBulkPaymentIntent', () => {
    it('should create Stripe payment intent for multiple invoices', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', amount: 299.00, status: 'pending', agent_id: 'agent-1' },
            { id: 'inv-2', amount: 449.00, status: 'pending', agent_id: 'agent-1' },
          ],
          error: null,
        })
      )

      const result = await createBulkPaymentIntent({
        agent_id: 'agent-1',
        invoice_ids: ['inv-1', 'inv-2'],
      })

      expect(result.success).toBe(true)
      expect(result.client_secret).toBeDefined()
      expect(result.total_amount).toBe(748.00)
    })

    it('should fail if any invoice is already paid', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', amount: 299.00, status: 'paid', agent_id: 'agent-1' }, // Already paid
            { id: 'inv-2', amount: 449.00, status: 'pending', agent_id: 'agent-1' },
          ],
          error: null,
        })
      )

      const result = await createBulkPaymentIntent({
        agent_id: 'agent-1',
        invoice_ids: ['inv-1', 'inv-2'],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already paid')
    })

    it('should fail if invoice belongs to different agent', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', amount: 299.00, status: 'pending', agent_id: 'agent-2' },
          ],
          error: null,
        })
      )

      const result = await createBulkPaymentIntent({
        agent_id: 'agent-1',
        invoice_ids: ['inv-1'],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('unauthorized')
    })
  })

  describe('markInvoicesPaid', () => {
    it('should mark multiple invoices as paid', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', status: 'paid' },
            { id: 'inv-2', status: 'paid' },
          ],
          error: null,
        })
      )

      const result = await markInvoicesPaid({
        invoice_ids: ['inv-1', 'inv-2'],
        payment_intent_id: 'pi_test_123',
        payment_method: 'card',
      })

      expect(result.success).toBe(true)
      expect(result.updated_count).toBe(2)
    })

    it('should record payment details', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            {
              id: 'inv-1',
              status: 'paid',
              paid_at: '2025-01-06T10:00:00Z',
              payment_intent_id: 'pi_test_123',
            },
          ],
          error: null,
        })
      )

      const result = await markInvoicesPaid({
        invoice_ids: ['inv-1'],
        payment_intent_id: 'pi_test_123',
        payment_method: 'card',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('getInvoiceHistory', () => {
    it('should return paginated invoice history', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', status: 'paid', amount: 299.00 },
            { id: 'inv-2', status: 'paid', amount: 449.00 },
            { id: 'inv-3', status: 'pending', amount: 199.00 },
          ],
          error: null,
        })
      )

      const history = await getInvoiceHistory('agent-1', { limit: 10, offset: 0 })

      expect(history.invoices.length).toBe(3)
    })

    it('should filter by status', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', status: 'paid', amount: 299.00 },
            { id: 'inv-2', status: 'paid', amount: 449.00 },
          ],
          error: null,
        })
      )

      const history = await getInvoiceHistory('agent-1', { status: 'paid' })

      expect(history.invoices.every((inv) => inv.status === 'paid')).toBe(true)
    })

    it('should filter by date range', async () => {
      mockSupabaseFrom.mockReturnValue(
        createChain({
          data: [
            { id: 'inv-1', created_at: '2025-01-05', amount: 299.00 },
          ],
          error: null,
        })
      )

      const history = await getInvoiceHistory('agent-1', {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      })

      expect(history.invoices.length).toBe(1)
    })
  })
})

describe('Invoice PDF Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(createChain({ data: null, error: null }))
  })

  it('should generate PDF with invoice details', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'inv-1',
          invoice_number: 'ASM-2025-0001',
          amount: 299.00,
          line_items: [
            { description: 'Photo Package', amount: 249.00 },
            { description: 'Rush Fee', amount: 50.00 },
          ],
          agent: {
            name: 'John Agent',
            email: 'john@realty.com',
            brokerage: 'Best Realty',
          },
        },
        error: null,
      })
    )

    const result = await generateInvoicePdf('inv-1')

    expect(result.success).toBe(true)
    expect(result.pdf_url).toBeDefined()
  })

  it('should include custom template settings', async () => {
    mockSupabaseFrom.mockReturnValue(
      createChain({
        data: {
          id: 'inv-1',
          amount: 299.00,
          custom_notes: 'Thank you for your business!',
          brokerage_info: {
            name: 'Best Realty',
            address: '100 Main St',
            license: 'BRK-12345',
          },
        },
        error: null,
      })
    )

    const result = await generateInvoicePdf('inv-1', {
      include_brokerage: true,
      include_custom_notes: true,
    })

    expect(result.success).toBe(true)
  })
})

describe('Invoice Calculations', () => {
  it('should calculate late fees for overdue invoices', () => {
    const invoices: Invoice[] = [
      {
        id: 'inv-1',
        amount: 100.00,
        status: 'overdue',
        due_date: '2025-01-01',
        days_overdue: 15,
      } as Invoice,
    ]

    const result = calculateBulkPaymentTotal(invoices, { include_late_fees: true })

    expect(result.late_fees).toBeGreaterThan(0)
  })

  it('should cap late fees at maximum percentage', () => {
    const invoices: Invoice[] = [
      {
        id: 'inv-1',
        amount: 100.00,
        status: 'overdue',
        due_date: '2024-01-01', // Very overdue
        days_overdue: 365,
      } as Invoice,
    ]

    const result = calculateBulkPaymentTotal(invoices, { include_late_fees: true })

    // Late fees should be capped (e.g., at 10% of invoice amount)
    expect(result.late_fees).toBeLessThanOrEqual(10.00)
  })
})
