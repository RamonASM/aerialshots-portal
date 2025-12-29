import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiLogger, formatError } from '@/lib/logger'

interface CreditPackage {
  id: string
  name: string
  description: string | null
  credit_amount: number
  price_cents: number
  discount_percent: number
  is_popular: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * GET /api/credits/packages
 * Get available credit packages for purchase
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Cast to any since credit_packages table isn't in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: packages, error } = await (supabase as any)
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      apiLogger.error({ error: formatError(error) }, 'Error fetching credit packages')
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }

    // Add computed fields for display
    const packagesWithDisplay = (packages as CreditPackage[] | null)?.map((pkg) => ({
      ...pkg,
      price_dollars: pkg.price_cents / 100,
      price_per_credit: (pkg.price_cents / 100 / pkg.credit_amount).toFixed(3),
      savings_amount: pkg.discount_percent > 0
        ? (pkg.credit_amount * (pkg.discount_percent / 100)).toFixed(2)
        : null,
    }))

    return NextResponse.json({
      success: true,
      packages: packagesWithDisplay || [],
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Credit packages fetch error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
