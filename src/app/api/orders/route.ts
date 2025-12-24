import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toCents } from '@/lib/payments/stripe'
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationEmail,
} from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      // Service info
      serviceType,
      packageKey,
      packageName,
      sqftTier,
      addons = [],

      // Property info
      propertyAddress,
      propertyCity,
      propertyState = 'FL',
      propertyZip,
      propertySqft,
      propertyBeds,
      propertyBaths,

      // Contact info
      contactName,
      contactEmail,
      contactPhone,
      specialInstructions,

      // Scheduling
      scheduledDate,
      scheduledTime,

      // Pricing
      totalCents,

      // Payment
      paymentIntentId,

      // Agent ID (if logged in)
      agentId,
    } = body

    // Validate required fields
    if (!serviceType || !packageKey || !packageName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Combine date and time for scheduled_at
    let scheduledAt = null
    if (scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':')
      const date = new Date(scheduledDate)
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      scheduledAt = date.toISOString()
    }

    // Calculate subtotal from package and addons
    const subtotalCents = totalCents || 0

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        agent_id: agentId || null,
        service_type: serviceType,
        package_key: packageKey,
        package_name: packageName,
        sqft_tier: sqftTier,
        services: addons,
        subtotal_cents: subtotalCents,
        discount_cents: 0,
        tax_cents: 0,
        total_cents: subtotalCents,
        property_address: propertyAddress,
        property_city: propertyCity,
        property_state: propertyState,
        property_zip: propertyZip,
        property_sqft: propertySqft,
        property_beds: propertyBeds,
        property_baths: propertyBaths,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        scheduled_at: scheduledAt,
        status: 'pending',
        payment_intent_id: paymentIntentId,
        payment_status: 'pending',
        special_instructions: specialInstructions,
      })
      .select()
      .single()

    if (error) {
      console.error('Order creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Send confirmation emails (don't block on these)
    const fullAddress = [propertyAddress, propertyCity, propertyState, propertyZip]
      .filter(Boolean)
      .join(', ')

    // Send emails in parallel, but don't fail the order if emails fail
    Promise.all([
      sendOrderConfirmationEmail({
        to: contactEmail,
        customerName: contactName,
        orderId: order.id,
        packageName,
        propertyAddress: fullAddress || undefined,
        scheduledDate: scheduledAt || undefined,
        total: subtotalCents / 100,
      }),
      sendOrderNotificationEmail({
        orderId: order.id,
        customerName: contactName,
        customerEmail: contactEmail,
        customerPhone: contactPhone,
        packageName,
        propertyAddress: fullAddress || undefined,
        scheduledDate: scheduledAt || undefined,
        total: subtotalCents / 100,
      }),
    ]).catch((emailError) => {
      console.error('Failed to send order emails:', emailError)
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total: order.total_cents,
      },
    })
  } catch (error) {
    console.error('Order API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get orders for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build query
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by agent if specified
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Orders fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
