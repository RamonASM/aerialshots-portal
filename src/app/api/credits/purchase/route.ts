import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/payments/stripe'
import { z } from 'zod'
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
}

// Zod schema for purchase request
const PurchaseSchema = z.object({
  packageId: z.string().uuid('Invalid package ID'),
})

/**
 * GET /api/credits/purchase
 * Get available credit packages for purchase
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch active credit packages
    const { data: packagesData, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    const packages = packagesData as CreditPackage[] | null

    if (error) {
      apiLogger.error({ error: formatError(error) }, 'Error fetching credit packages')
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }

    // Add computed fields for display
    const packagesWithDisplay = packages?.map((pkg) => ({
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

/**
 * POST /api/credits/purchase
 * Create a Stripe checkout session for credit package purchase
 * Supports both card and ACH (bank transfer) payments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Require authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get agent profile
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, email, credit_balance')
      .eq('email', user.email)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 })
    }

    // Parse and validate request
    const rawBody = await request.json()
    const parseResult = PurchaseSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { packageId } = parseResult.data

    // Get package from database
    const { data: selectedPackageData, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single()

    const selectedPackage = selectedPackageData as CreditPackage | null

    if (pkgError || !selectedPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const stripe = getStripe()

    // Create Stripe checkout session
    // Support both card and ACH (bank transfer) payments
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${selectedPackage.name} - ${selectedPackage.credit_amount} Credits`,
              description: selectedPackage.description || `Credit package for Aerial Shots Media services`,
            },
            unit_amount: selectedPackage.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.aerialshots.media'}/dashboard/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://portal.aerialshots.media'}/dashboard/credits?canceled=true`,
      customer_email: agent.email,
      metadata: {
        type: 'credit_purchase',
        agent_id: agent.id,
        agent_name: agent.name,
        package_id: packageId,
        package_name: selectedPackage.name,
        credit_amount: selectedPackage.credit_amount.toString(),
      },
      payment_intent_data: {
        metadata: {
          type: 'credit_purchase',
          agent_id: agent.id,
          package_id: packageId,
          credit_amount: selectedPackage.credit_amount.toString(),
        },
      },
    })

    apiLogger.info({
      agentId: agent.id,
      packageId,
      packageName: selectedPackage.name,
      creditAmount: selectedPackage.credit_amount,
      sessionId: session.id,
    }, 'Credit purchase checkout session created')

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'Credit purchase error')
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
