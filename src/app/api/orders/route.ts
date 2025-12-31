import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toCents } from '@/lib/payments/stripe'
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationEmail,
} from '@/lib/email/resend'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { apiLogger, formatError } from '@/lib/logger'

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
      apiLogger.error({ ...formatError(error) }, 'Order creation error')
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Create a listing for this order (so shoot can be scheduled)
    let listingId: string | null = null
    try {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          agent_id: agentId || null,
          address: propertyAddress,
          city: propertyCity,
          state: propertyState,
          zip: propertyZip,
          sqft: propertySqft,
          beds: propertyBeds,
          baths: propertyBaths,
          ops_status: 'pending',
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          scheduled_at: scheduledAt,
          special_instructions: specialInstructions,
        })
        .select('id')
        .single()

      if (!listingError && listing) {
        listingId = listing.id

        // Link order to listing
        await supabase
          .from('orders')
          .update({ listing_id: listing.id })
          .eq('id', order.id)

        // Trigger new-listing workflow in background (don't block response)
        executeWorkflow('new-listing', {
          event: 'listing.created',
          listingId: listing.id,
          data: {
            agentId: agentId,
            address: propertyAddress,
            city: propertyCity,
            state: propertyState,
            zip: propertyZip,
            sqft: propertySqft,
            beds: propertyBeds,
            baths: propertyBaths,
            services: addons,
            isFirstOrder: false, // Could check order history
          },
        }).catch((workflowError) => {
          apiLogger.error({ listingId: listing.id, ...formatError(workflowError) }, 'Failed to trigger new-listing workflow')
        })

        apiLogger.info({ orderId: order.id, listingId: listing.id }, 'Created listing for order')
      } else {
        apiLogger.error({ orderId: order.id, ...formatError(listingError) }, 'Failed to create listing for order')
      }
    } catch (listingErr) {
      apiLogger.error({ orderId: order.id, ...formatError(listingErr) }, 'Error creating listing')
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
      apiLogger.error({ orderId: order.id, ...formatError(emailError) }, 'Failed to send order emails')
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        total: order.total_cents,
        listing_id: listingId,
      },
    })
  } catch (error) {
    apiLogger.error({ ...formatError(error) }, 'Order API error')
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
    const requestedAgentId = searchParams.get('agentId')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is staff (can view all orders)
    const isStaff = user.email?.endsWith('@aerialshots.media') || false

    // Get user's agent record
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    // Determine which agent_id to filter by
    let filterAgentId: string | null = null

    if (isStaff) {
      // Staff can optionally filter by agent, or see all if no filter
      filterAgentId = requestedAgentId
    } else if (agent) {
      // Non-staff users can ONLY see their own orders
      filterAgentId = agent.id
      // If they requested a different agent's orders, deny
      if (requestedAgentId && requestedAgentId !== agent.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot view other users orders' },
          { status: 403 }
        )
      }
    } else {
      // No agent record and not staff - return empty
      return NextResponse.json({ orders: [] })
    }

    // Build query
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filter (required for non-staff)
    if (filterAgentId) {
      query = query.eq('agent_id', filterAgentId)
    }

    const { data: orders, error } = await query

    if (error) {
      apiLogger.error({ ...formatError(error) }, 'Orders fetch error')
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })
  } catch (error) {
    apiLogger.error({ ...formatError(error) }, 'Orders API error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
