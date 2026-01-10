import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toCents } from '@/lib/payments/stripe'
import {
  sendOrderConfirmationEmail,
  sendOrderNotificationEmail,
} from '@/lib/email/resend'
import { executeWorkflow } from '@/lib/agents/orchestrator'
import { apiLogger, formatError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
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

      // Airspace check (from booking flow)
      airspaceCheckId,
      airspaceStatus,
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

    // Create order and listing atomically via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('create_order_and_listing', {
      p_agent_id: agentId || null,
      p_service_type: serviceType,
      p_package_key: packageKey,
      p_package_name: packageName,
      p_sqft_tier: sqftTier,
      p_services: addons,
      p_subtotal_cents: subtotalCents,
      p_discount_cents: 0,
      p_tax_cents: 0,
      p_total_cents: subtotalCents,
      p_property_address: propertyAddress,
      p_property_city: propertyCity,
      p_property_state: propertyState,
      p_property_zip: propertyZip,
      p_property_sqft: propertySqft,
      p_property_beds: propertyBeds,
      p_property_baths: propertyBaths,
      p_contact_name: contactName,
      p_contact_email: contactEmail,
      p_contact_phone: contactPhone,
      p_scheduled_at: scheduledAt,
      p_payment_intent_id: paymentIntentId,
      p_payment_status: 'pending',
      p_special_instructions: specialInstructions
    }) as { data: { order: { id: string; status: string; total_cents: number }; listing: { id: string } } | null; error: Error | null }

    if (error || !data) {
      apiLogger.error({ ...formatError(error) }, 'Atomic order creation error')
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    const { order, listing } = data

    // Update order with airspace check if provided
    if (airspaceCheckId || airspaceStatus) {
      const updateData: Record<string, unknown> = {}
      if (airspaceCheckId) {
        updateData.airspace_check_id = airspaceCheckId
      }
      // Set drone_approved based on airspace status
      if (airspaceStatus === 'clear') {
        updateData.drone_approved = true
      } else if (airspaceStatus === 'restricted') {
        updateData.drone_approved = false
      }
      // Update the order with airspace info (don't fail order if this fails)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any)
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
        .then(({ error: updateError }: { error: Error | null }) => {
          if (updateError) {
            apiLogger.warn({ orderId: order.id, ...formatError(updateError) }, 'Failed to update order with airspace info')
          }
        })
    }

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

    apiLogger.info({ orderId: order.id, listingId: listing.id }, 'Created order and listing atomically')

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
        listing_id: listing.id,
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
    const supabase = createAdminClient()
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
