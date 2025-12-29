import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculateEvenSplit,
  calculatePercentageSplit,
  validateCustomSplit,
  createPortionPaymentIntent,
  getPaymentMethodDetails,
  formatCentsToDisplayAmount,
} from '@/lib/payments/split-payment'

interface CreateSplitPaymentBody {
  orderId: string
  splitType: 'even' | 'custom' | 'percentage'
  portions: Array<{
    amountCents?: number
    percentage?: number
  }>
}

interface ProcessPortionBody {
  splitPaymentId: string
  portionId: string
  paymentMethodId: string
}

// POST - Create a new split payment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateSplitPaymentBody = await request.json()

    if (!body.orderId || !body.splitType || !body.portions || body.portions.length < 2) {
      return NextResponse.json(
        { error: 'orderId, splitType, and at least 2 portions are required' },
        { status: 400 }
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_cents, contact_email, contact_name, payment_status')
      .eq('id', body.orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'succeeded') {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      )
    }

    // Calculate portions based on split type
    let calculatedPortions

    switch (body.splitType) {
      case 'even':
        calculatedPortions = calculateEvenSplit(order.total_cents, body.portions.length)
        break

      case 'percentage': {
        const percentages = body.portions.map((p) => p.percentage || 0)
        calculatedPortions = calculatePercentageSplit(order.total_cents, percentages)
        break
      }

      case 'custom': {
        const customPortions = body.portions.map((p) => ({
          amountCents: p.amountCents || 0,
          percentage: p.percentage,
        }))
        if (!validateCustomSplit(order.total_cents, customPortions)) {
          return NextResponse.json(
            { error: 'Custom portion amounts must equal the order total' },
            { status: 400 }
          )
        }
        calculatedPortions = customPortions
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid split type' }, { status: 400 })
    }

    // Get agent ID if user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!)
      .single()

    // Create split payment record
    const { data: splitPayment, error: splitError } = await supabase
      .from('split_payments')
      .insert({
        order_id: body.orderId,
        split_type: body.splitType,
        total_amount_cents: order.total_cents,
        status: 'pending',
        created_by: agent?.id || null,
      })
      .select()
      .single()

    if (splitError) {
      throw splitError
    }

    // Create payment portions
    const portionInserts = calculatedPortions.map((portion) => ({
      split_payment_id: splitPayment.id,
      amount_cents: portion.amountCents,
      percentage: portion.percentage,
      status: 'pending' as const,
    }))

    const { data: portions, error: portionsError } = await supabase
      .from('payment_portions')
      .insert(portionInserts)
      .select()

    if (portionsError) {
      throw portionsError
    }

    return NextResponse.json({
      splitPayment: {
        ...splitPayment,
        formattedTotal: formatCentsToDisplayAmount(order.total_cents),
      },
      portions: portions.map((p) => ({
        ...p,
        formattedAmount: formatCentsToDisplayAmount(p.amount_cents),
      })),
      message: 'Split payment created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating split payment:', error)
    return NextResponse.json(
      { error: 'Failed to create split payment' },
      { status: 500 }
    )
  }
}

// GET - Get split payment details for an order
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = request.nextUrl.searchParams.get('orderId')
    const splitPaymentId = request.nextUrl.searchParams.get('splitPaymentId')

    if (!orderId && !splitPaymentId) {
      return NextResponse.json(
        { error: 'orderId or splitPaymentId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('split_payments')
      .select('*')

    if (splitPaymentId) {
      query = query.eq('id', splitPaymentId)
    } else if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data: splitPayments, error } = await query

    if (error) {
      throw error
    }

    if (!splitPayments || splitPayments.length === 0) {
      return NextResponse.json({
        splitPayments: [],
        portions: [],
      })
    }

    // Get portions for all split payments
    const splitPaymentIds = splitPayments.map((sp) => sp.id)
    const { data: portions } = await supabase
      .from('payment_portions')
      .select('*')
      .in('split_payment_id', splitPaymentIds)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      splitPayments: splitPayments.map((sp) => ({
        ...sp,
        formattedTotal: formatCentsToDisplayAmount(sp.total_amount_cents),
      })),
      portions: (portions || []).map((p) => ({
        ...p,
        formattedAmount: formatCentsToDisplayAmount(p.amount_cents),
      })),
    })
  } catch (error) {
    console.error('Error fetching split payment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch split payment' },
      { status: 500 }
    )
  }
}

// PATCH - Process a payment portion
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ProcessPortionBody = await request.json()

    if (!body.splitPaymentId || !body.portionId || !body.paymentMethodId) {
      return NextResponse.json(
        { error: 'splitPaymentId, portionId, and paymentMethodId are required' },
        { status: 400 }
      )
    }

    // Get portion and split payment details
    const { data: portion, error: portionError } = await supabase
      .from('payment_portions')
      .select('*, split_payments(order_id, total_amount_cents)')
      .eq('id', body.portionId)
      .eq('split_payment_id', body.splitPaymentId)
      .single()

    if (portionError || !portion) {
      return NextResponse.json({ error: 'Payment portion not found' }, { status: 404 })
    }

    if (portion.status === 'succeeded') {
      return NextResponse.json(
        { error: 'This portion has already been paid' },
        { status: 400 }
      )
    }

    // Get order details for customer info
    const splitPaymentData = portion.split_payments as { order_id: string } | null
    if (!splitPaymentData) {
      return NextResponse.json({ error: 'Split payment not found' }, { status: 404 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('contact_email, contact_name')
      .eq('id', splitPaymentData.order_id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update portion status to processing
    await supabase
      .from('payment_portions')
      .update({ status: 'processing' })
      .eq('id', body.portionId)

    // Get payment method details
    const cardDetails = await getPaymentMethodDetails(body.paymentMethodId)

    // Process payment with Stripe
    const result = await createPortionPaymentIntent({
      portionId: body.portionId,
      splitPaymentId: body.splitPaymentId,
      amountCents: portion.amount_cents,
      paymentMethodId: body.paymentMethodId,
      customerEmail: order.contact_email,
      customerName: order.contact_name,
      description: `Split payment portion for order`,
    })

    if (result.success) {
      // Update portion as succeeded
      await supabase
        .from('payment_portions')
        .update({
          status: 'succeeded',
          payment_intent_id: result.paymentIntentId,
          payment_method_id: body.paymentMethodId,
          card_brand: cardDetails?.brand,
          card_last_four: cardDetails?.last4,
          processed_at: new Date().toISOString(),
        })
        .eq('id', body.portionId)

      // Check if all portions are now complete
      const { data: allPortions } = await supabase
        .from('payment_portions')
        .select('status')
        .eq('split_payment_id', body.splitPaymentId)

      const allComplete = allPortions?.every((p) => p.status === 'succeeded')

      if (allComplete) {
        // Update split payment status
        await supabase
          .from('split_payments')
          .update({ status: 'completed' })
          .eq('id', body.splitPaymentId)

        // Update order payment status
        await supabase
          .from('orders')
          .update({
            payment_status: 'succeeded',
            paid_at: new Date().toISOString(),
          })
          .eq('id', splitPaymentData.order_id)
      } else {
        // Update split payment to partial
        await supabase
          .from('split_payments')
          .update({ status: 'partial' })
          .eq('id', body.splitPaymentId)
      }

      return NextResponse.json({
        success: true,
        paymentIntentId: result.paymentIntentId,
        message: 'Payment portion processed successfully',
      })
    } else {
      // Update portion as failed
      await supabase
        .from('payment_portions')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('id', body.portionId)

      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing payment portion:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
