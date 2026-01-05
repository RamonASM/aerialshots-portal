import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymentIntent } from '@/lib/payments/stripe'

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded'

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description: string
  quantity?: number
  unit_price?: number
  amount: number
}

/**
 * Invoice
 */
export interface Invoice {
  id: string
  invoice_number: string
  agent_id: string
  listing_id?: string
  listing_address?: string
  amount: number
  status: InvoiceStatus
  line_items?: InvoiceLineItem[]
  due_date: string
  days_overdue?: number
  paid_at?: string
  payment_intent_id?: string
  payment_method?: string
  custom_notes?: string
  brokerage_info?: {
    name: string
    address?: string
    license?: string
  }
  created_at: string
}

/**
 * Bulk payment calculation result
 */
export interface BulkPaymentTotal {
  invoice_count: number
  subtotal: number
  processing_fee?: number
  late_fees?: number
  total: number
}

/**
 * Bulk payment result
 */
export interface BulkPaymentResult {
  success: boolean
  client_secret?: string
  payment_intent_id?: string
  total_amount?: number
  error?: string
}

/**
 * Invoice history options
 */
export interface InvoiceHistoryOptions {
  limit?: number
  offset?: number
  status?: InvoiceStatus
  date_from?: string
  date_to?: string
}

/**
 * Processing fee percentage (2.9% + $0.30 for Stripe)
 */
const PROCESSING_FEE_PERCENT = 0.029
const PROCESSING_FEE_FIXED = 0.30

/**
 * Late fee settings
 */
const LATE_FEE_PERCENT_PER_DAY = 0.001 // 0.1% per day
const LATE_FEE_MAX_PERCENT = 0.10 // 10% maximum

/**
 * Get all unpaid invoices for an agent
 */
export async function getUnpaidInvoices(agentId: string): Promise<Invoice[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('agent_id', agentId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true })
      .returns<Invoice[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Invoices] Error getting unpaid invoices:', error)
    return []
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('*, agent:agents(*)')
      .eq('id', invoiceId)
      .single()
      .returns<Invoice>()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[Invoices] Error getting invoice:', error)
    return null
  }
}

/**
 * Calculate total for bulk payment
 */
export function calculateBulkPaymentTotal(
  invoices: Invoice[],
  options: {
    include_processing_fee?: boolean
    include_late_fees?: boolean
  } = {}
): BulkPaymentTotal {
  const { include_processing_fee = false, include_late_fees = false } = options

  if (invoices.length === 0) {
    return {
      invoice_count: 0,
      subtotal: 0,
      total: 0,
    }
  }

  const subtotal = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  // Calculate late fees
  let lateFees = 0
  if (include_late_fees) {
    for (const invoice of invoices) {
      if (invoice.status === 'overdue' && invoice.days_overdue) {
        const feePercent = Math.min(
          invoice.days_overdue * LATE_FEE_PERCENT_PER_DAY,
          LATE_FEE_MAX_PERCENT
        )
        lateFees += invoice.amount * feePercent
      }
    }
  }

  // Calculate processing fee
  let processingFee = 0
  if (include_processing_fee) {
    const baseAmount = subtotal + lateFees
    processingFee = baseAmount * PROCESSING_FEE_PERCENT + PROCESSING_FEE_FIXED
  }

  const total = subtotal + lateFees + processingFee

  return {
    invoice_count: invoices.length,
    subtotal,
    processing_fee: processingFee > 0 ? Math.round(processingFee * 100) / 100 : undefined,
    late_fees: lateFees > 0 ? Math.round(lateFees * 100) / 100 : undefined,
    total: Math.round(total * 100) / 100,
  }
}

/**
 * Create payment intent for bulk invoice payment
 */
export async function createBulkPaymentIntent(params: {
  agent_id: string
  invoice_ids: string[]
  include_processing_fee?: boolean
}): Promise<BulkPaymentResult> {
  const { agent_id, invoice_ids, include_processing_fee = false } = params

  try {
    const supabase = createAdminClient()

    // Get invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .in('id', invoice_ids)
      .returns<Invoice[]>()

    if (!invoices || invoices.length === 0) {
      return {
        success: false,
        error: 'No invoices found.',
      }
    }

    // Verify all invoices belong to agent
    const unauthorized = invoices.some((inv) => inv.agent_id !== agent_id)
    if (unauthorized) {
      return {
        success: false,
        error: 'One or more invoices are unauthorized.',
      }
    }

    // Check for already paid invoices
    const alreadyPaid = invoices.some((inv) => inv.status === 'paid')
    if (alreadyPaid) {
      return {
        success: false,
        error: 'One or more invoices are already paid.',
      }
    }

    // Calculate total
    const totals = calculateBulkPaymentTotal(invoices, {
      include_processing_fee,
      include_late_fees: true,
    })

    // Create Stripe payment intent
    const paymentResult = await createPaymentIntent({
      amount: Math.round(totals.total * 100), // Convert to cents
      metadata: {
        type: 'bulk_invoice_payment',
        agent_id,
        invoice_ids: invoice_ids.join(','),
        invoice_count: String(invoices.length),
      },
    })

    if (!paymentResult.success) {
      return {
        success: false,
        error: 'Failed to create payment intent.',
      }
    }

    return {
      success: true,
      client_secret: paymentResult.clientSecret,
      payment_intent_id: paymentResult.paymentIntentId,
      total_amount: totals.total,
    }
  } catch (error) {
    console.error('[Invoices] Error creating bulk payment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Mark invoices as paid
 */
export async function markInvoicesPaid(params: {
  invoice_ids: string[]
  payment_intent_id: string
  payment_method: string
}): Promise<{
  success: boolean
  updated_count?: number
  error?: string
}> {
  const { invoice_ids, payment_intent_id, payment_method } = params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_intent_id,
        payment_method,
      })
      .in('id', invoice_ids)
      .select('id')
      .returns<Array<{ id: string }>>()

    if (error) {
      return {
        success: false,
        error: 'Failed to update invoices.',
      }
    }

    return {
      success: true,
      updated_count: data?.length || 0,
    }
  } catch (error) {
    console.error('[Invoices] Error marking invoices paid:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get invoice history for an agent
 */
export async function getInvoiceHistory(
  agentId: string,
  options: InvoiceHistoryOptions = {}
): Promise<{
  invoices: Invoice[]
  total_count: number
}> {
  const { limit = 20, offset = 0, status, date_from, date_to } = options

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    const { data, count, error } = await query.returns<Invoice[]>()

    if (error || !data) {
      return { invoices: [], total_count: 0 }
    }

    return {
      invoices: data,
      total_count: count || data.length,
    }
  } catch (error) {
    console.error('[Invoices] Error getting history:', error)
    return { invoices: [], total_count: 0 }
  }
}

/**
 * Generate PDF for an invoice
 */
export async function generateInvoicePdf(
  invoiceId: string,
  options: {
    include_brokerage?: boolean
    include_custom_notes?: boolean
  } = {}
): Promise<{
  success: boolean
  pdf_url?: string
  error?: string
}> {
  try {
    const invoice = await getInvoiceById(invoiceId)

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found.',
      }
    }

    // In a real implementation, this would generate a PDF
    // For now, we'll return a placeholder URL
    const pdfUrl = `https://app.aerialshots.media/api/invoices/${invoiceId}/pdf`

    return {
      success: true,
      pdf_url: pdfUrl,
    }
  } catch (error) {
    console.error('[Invoices] Error generating PDF:', error)
    return {
      success: false,
      error: 'Failed to generate PDF.',
    }
  }
}

/**
 * Get invoice summary for agent dashboard
 */
export async function getInvoiceSummary(agentId: string): Promise<{
  unpaid_count: number
  unpaid_total: number
  overdue_count: number
  overdue_total: number
  paid_this_month: number
  paid_this_year: number
}> {
  try {
    const supabase = createAdminClient()

    // Get unpaid invoices
    const { data: unpaid } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('agent_id', agentId)
      .in('status', ['pending', 'overdue'])
      .returns<Array<{ amount: number; status: string }>>()

    const unpaidInvoices = unpaid || []
    const overdueInvoices = unpaidInvoices.filter((inv) => inv.status === 'overdue')

    // Get paid this month/year
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

    const { data: paidThisMonth } = await supabase
      .from('invoices')
      .select('amount')
      .eq('agent_id', agentId)
      .eq('status', 'paid')
      .gte('paid_at', monthStart)
      .returns<Array<{ amount: number }>>()

    const { data: paidThisYear } = await supabase
      .from('invoices')
      .select('amount')
      .eq('agent_id', agentId)
      .eq('status', 'paid')
      .gte('paid_at', yearStart)
      .returns<Array<{ amount: number }>>()

    return {
      unpaid_count: unpaidInvoices.length,
      unpaid_total: unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      overdue_count: overdueInvoices.length,
      overdue_total: overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      paid_this_month: (paidThisMonth || []).reduce((sum, inv) => sum + inv.amount, 0),
      paid_this_year: (paidThisYear || []).reduce((sum, inv) => sum + inv.amount, 0),
    }
  } catch (error) {
    console.error('[Invoices] Error getting summary:', error)
    return {
      unpaid_count: 0,
      unpaid_total: 0,
      overdue_count: 0,
      overdue_total: 0,
      paid_this_month: 0,
      paid_this_year: 0,
    }
  }
}
