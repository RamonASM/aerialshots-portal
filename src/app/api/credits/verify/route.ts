import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/payments/stripe'
import { z } from 'zod'

const VerifySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
})

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

    // Parse request
    const rawBody = await request.json()
    const parseResult = VerifySchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }

    const { sessionId } = parseResult.data

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        status: session.payment_status,
        message: 'Payment not completed',
      })
    }

    // Get metadata
    const metadata = session.metadata
    if (!metadata || metadata.type !== 'credit_purchase') {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400 })
    }

    const agentId = metadata.agent_id
    const credits = parseInt(metadata.credits || '0', 10)
    const packageId = metadata.package_id

    if (!agentId || credits <= 0) {
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 })
    }

    // Use admin client for database operations
    const adminSupabase = createAdminClient()

    // Check if this session was already fulfilled (idempotency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTxn } = await (adminSupabase as any)
      .from('credit_transactions')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single()

    if (existingTxn) {
      // Already fulfilled - return success without double-crediting
      return NextResponse.json({
        success: true,
        alreadyFulfilled: true,
        credits,
        message: 'Credits already added to your account',
      })
    }

    // Get current agent credits
    const { data: agent, error: agentError } = await adminSupabase
      .from('agents')
      .select('credit_balance, lifetime_credits')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const currentBalance = agent.credit_balance || 0
    const lifetimeCredits = agent.lifetime_credits || 0
    const newBalance = currentBalance + credits

    // Update agent credit balance
    const { error: updateError } = await adminSupabase
      .from('agents')
      .update({
        credit_balance: newBalance,
        lifetime_credits: lifetimeCredits + credits,
      })
      .eq('id', agentId)

    if (updateError) {
      console.error('Failed to update agent credits:', updateError)
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
    }

    // Log the credit transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any).from('credit_transactions').insert({
      agent_id: agentId,
      amount: credits,
      type: 'purchase',
      description: `Purchased ${credits} credits (${packageId} package)`,
      stripe_session_id: sessionId,
      balance_after: newBalance,
    })

    return NextResponse.json({
      success: true,
      credits,
      newBalance,
      message: `Successfully added ${credits} credits to your account`,
    })
  } catch (error) {
    console.error('Credit verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
