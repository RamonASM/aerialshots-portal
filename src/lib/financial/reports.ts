import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Payment record
 */
export interface Payment {
  id: string
  agent_id: string
  amount: number
  status: 'succeeded' | 'pending' | 'failed' | 'refunded'
  payment_method?: string
  stripe_payment_intent_id?: string
  invoice_id?: string
  invoice?: {
    invoice_number: string
    listing_address?: string
  }
  created_at: string
}

/**
 * Revenue summary
 */
export interface RevenueSummary {
  total_spent: number
  ytd_spent: number
  avg_order_value: number
  total_orders: number
  last_payment_date?: string
}

/**
 * Tax report
 */
export interface TaxReport {
  agent_id: string
  year: number
  total_payments: number
  payment_count: number
  quarterly_breakdown: {
    Q1: number
    Q2: number
    Q3: number
    Q4: number
  }
  generated_at: string
}

/**
 * Monthly breakdown
 */
export interface MonthlyBreakdown {
  month: number
  month_name: string
  total: number
  order_count: number
}

/**
 * Top client data
 */
export interface TopClient {
  agent_id: string
  agent?: { name: string }
  total_spent: number
  order_count: number
}

/**
 * Payment history options
 */
interface PaymentHistoryOptions {
  limit?: number
  offset?: number
  status?: 'succeeded' | 'pending' | 'failed' | 'refunded'
  date_from?: string
  date_to?: string
}

/**
 * Get payment history for an agent
 */
export async function getPaymentHistory(
  agentId: string,
  options: PaymentHistoryOptions = {}
): Promise<{
  payments: Payment[]
  total: number
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*, invoice:invoices(invoice_number, listing_address)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false }) as {
        data: Payment[] | null
        error: Error | null
      }

    if (error || !data) {
      return { payments: [], total: 0 }
    }

    return {
      payments: data,
      total: data.length,
    }
  } catch (error) {
    console.error('[Financial] Error getting payment history:', error)
    return { payments: [], total: 0 }
  }
}

/**
 * Get revenue summary for an agent
 */
export async function getRevenueSummary(agentId: string): Promise<RevenueSummary | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('amount, status, created_at')
      .eq('agent_id', agentId)
      .eq('status', 'succeeded') as {
        data: Array<{ amount: number; status: string; created_at: string }> | null
        error: Error | null
      }

    if (error) {
      return null
    }

    const payments = data || []
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Calculate totals
    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0)
    const ytdPayments = payments.filter((p) => new Date(p.created_at) >= yearStart)
    const ytdSpent = ytdPayments.reduce((sum, p) => sum + p.amount, 0)
    const avgOrderValue = payments.length > 0 ? totalSpent / payments.length : 0

    // Find last payment date
    const sortedPayments = [...payments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return {
      total_spent: Math.round(totalSpent * 100) / 100,
      ytd_spent: Math.round(ytdSpent * 100) / 100,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      total_orders: payments.length,
      last_payment_date: sortedPayments[0]?.created_at,
    }
  } catch (error) {
    console.error('[Financial] Error getting revenue summary:', error)
    return null
  }
}

/**
 * Generate tax report for a specific year
 */
export async function generateTaxReport(
  agentId: string,
  year: number
): Promise<TaxReport | null> {
  try {
    const supabase = createAdminClient()

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('amount, status, created_at')
      .eq('agent_id', agentId)
      .eq('status', 'succeeded')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd) as {
        data: Array<{ amount: number; status: string; created_at: string }> | null
        error: Error | null
      }

    if (error || !data) {
      return null
    }

    // Calculate quarterly breakdown
    const quarterly = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }

    data.forEach((payment) => {
      const month = new Date(payment.created_at).getMonth() + 1
      if (month <= 3) quarterly.Q1 += payment.amount
      else if (month <= 6) quarterly.Q2 += payment.amount
      else if (month <= 9) quarterly.Q3 += payment.amount
      else quarterly.Q4 += payment.amount
    })

    const totalPayments = data.reduce((sum, p) => sum + p.amount, 0)

    return {
      agent_id: agentId,
      year,
      total_payments: Math.round(totalPayments * 100) / 100,
      payment_count: data.length,
      quarterly_breakdown: {
        Q1: Math.round(quarterly.Q1 * 100) / 100,
        Q2: Math.round(quarterly.Q2 * 100) / 100,
        Q3: Math.round(quarterly.Q3 * 100) / 100,
        Q4: Math.round(quarterly.Q4 * 100) / 100,
      },
      generated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Financial] Error generating tax report:', error)
    return null
  }
}

/**
 * Get monthly breakdown for a year
 */
export async function getMonthlyBreakdown(
  agentId: string,
  year: number
): Promise<MonthlyBreakdown[]> {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  try {
    const supabase = createAdminClient()

    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('amount, status, created_at')
      .eq('agent_id', agentId)
      .eq('status', 'succeeded')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd) as {
        data: Array<{ amount: number; status: string; created_at: string }> | null
        error: Error | null
      }

    // Initialize all months with zero values
    const months: MonthlyBreakdown[] = monthNames.map((name, index) => ({
      month: index + 1,
      month_name: name,
      total: 0,
      order_count: 0,
    }))

    if (error || !data) {
      return months
    }

    // Aggregate by month
    data.forEach((payment) => {
      const month = new Date(payment.created_at).getMonth()
      months[month].total += payment.amount
      months[month].order_count += 1
    })

    // Round totals
    months.forEach((m) => {
      m.total = Math.round(m.total * 100) / 100
    })

    return months
  } catch (error) {
    console.error('[Financial] Error getting monthly breakdown:', error)
    return monthNames.map((name, index) => ({
      month: index + 1,
      month_name: name,
      total: 0,
      order_count: 0,
    }))
  }
}

/**
 * Export financial data
 */
export async function exportFinancialData(
  agentId: string,
  options: {
    format: 'csv' | 'json'
    date_from: string
    date_to: string
    include_summary?: boolean
  }
): Promise<{
  success: boolean
  data?: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*, invoice:invoices(invoice_number, listing_address)')
      .eq('agent_id', agentId)
      .gte('created_at', options.date_from)
      .lte('created_at', options.date_to)
      .order('created_at', { ascending: false }) as {
        data: Payment[] | null
        error: Error | null
      }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to fetch payment data.',
      }
    }

    if (options.format === 'csv') {
      // Generate CSV
      const header = 'Date,Invoice,Address,Amount,Status'
      const rows = data.map((p) => {
        const date = new Date(p.created_at).toLocaleDateString()
        const invoice = p.invoice?.invoice_number || ''
        const address = p.invoice?.listing_address || ''
        const amount = p.amount.toFixed(2)
        const status = p.status
        return `${date},${invoice},"${address}",${amount},${status}`
      })

      return {
        success: true,
        data: [header, ...rows].join('\n'),
      }
    } else {
      // Generate JSON
      const result: {
        payments: Payment[]
        summary?: {
          total: number
          count: number
          date_range: { from: string; to: string }
        }
      } = { payments: data }

      if (options.include_summary) {
        const total = data
          .filter((p) => p.status === 'succeeded')
          .reduce((sum, p) => sum + p.amount, 0)

        result.summary = {
          total: Math.round(total * 100) / 100,
          count: data.length,
          date_range: {
            from: options.date_from,
            to: options.date_to,
          },
        }
      }

      return {
        success: true,
        data: JSON.stringify(result, null, 2),
      }
    }
  } catch (error) {
    console.error('[Financial] Error exporting data:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get payments by date range
 */
export async function getPaymentsByDateRange(
  agentId: string,
  dateFrom: string,
  dateTo: string
): Promise<Payment[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .order('created_at', { ascending: false }) as {
        data: Payment[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Financial] Error getting payments by date range:', error)
    return []
  }
}

/**
 * Get top clients by spending (admin only)
 */
export async function getTopClients(options: {
  limit?: number
  period?: 'month' | 'quarter' | 'year' | 'all'
}): Promise<TopClient[]> {
  const { limit = 10, period = 'year' } = options

  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('payment_summaries')
      .select('agent_id, total_spent, order_count, agent:agents(name)')
      .order('total_spent', { ascending: false })
      .limit(limit) as {
        data: TopClient[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Financial] Error getting top clients:', error)
    return []
  }
}

/**
 * Get spending comparison (current period vs previous)
 */
export async function getSpendingComparison(
  agentId: string,
  period: 'month' | 'quarter' | 'year' = 'month'
): Promise<{
  current: number
  previous: number
  change_percent: number
} | null> {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    let currentStart: Date
    let previousStart: Date
    let previousEnd: Date

    if (period === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (period === 'quarter') {
      const currentQ = Math.floor(now.getMonth() / 3)
      currentStart = new Date(now.getFullYear(), currentQ * 3, 1)
      previousStart = new Date(now.getFullYear(), (currentQ - 1) * 3, 1)
      previousEnd = new Date(now.getFullYear(), currentQ * 3, 0)
    } else {
      currentStart = new Date(now.getFullYear(), 0, 1)
      previousStart = new Date(now.getFullYear() - 1, 0, 1)
      previousEnd = new Date(now.getFullYear() - 1, 11, 31)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentData } = await (supabase as any)
      .from('payments')
      .select('amount')
      .eq('agent_id', agentId)
      .eq('status', 'succeeded')
      .gte('created_at', currentStart.toISOString())
      .lte('created_at', now.toISOString()) as {
        data: Array<{ amount: number }> | null
      }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: previousData } = await (supabase as any)
      .from('payments')
      .select('amount')
      .eq('agent_id', agentId)
      .eq('status', 'succeeded')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString()) as {
        data: Array<{ amount: number }> | null
      }

    const current = (currentData || []).reduce((sum, p) => sum + p.amount, 0)
    const previous = (previousData || []).reduce((sum, p) => sum + p.amount, 0)

    const changePercent =
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0

    return {
      current: Math.round(current * 100) / 100,
      previous: Math.round(previous * 100) / 100,
      change_percent: Math.round(changePercent * 100) / 100,
    }
  } catch (error) {
    console.error('[Financial] Error getting spending comparison:', error)
    return null
  }
}
