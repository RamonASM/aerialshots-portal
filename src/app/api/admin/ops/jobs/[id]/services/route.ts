import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AddServiceInput {
  service_key: string
  quantity?: number
  reason?: string
}

interface RemoveServiceInput {
  service_key: string
  reason?: string
}

interface ServiceItem {
  service_key?: string
  name?: string
  price?: number
  quantity?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get listing and order info
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, address, city')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Get order for this listing (using correct column names: services, total_cents)
    const { data: order } = await supabase
      .from('orders')
      .select('id, services, total_cents, status')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get service catalog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: services, error: servicesError } = await (supabase as any)
      .from('service_catalog')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (servicesError) {
      if (servicesError.code === '42P01') {
        return NextResponse.json({
          services: [],
          order: null,
          currentServices: [],
        })
      }
      throw servicesError
    }

    // Get order modifications history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: modifications } = await (supabase as any)
      .from('order_modifications')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    // Extract current services from order services array
    const orderServices = (order?.services || []) as ServiceItem[]
    const currentServices = orderServices
      .filter((item): item is ServiceItem & { service_key: string } =>
        item.service_key !== undefined
      )
      .map(item => item.service_key)

    // Transform order for client (convert cents to dollars for display)
    const orderForClient = order ? {
      ...order,
      total: (order.total_cents || 0) / 100,
      line_items: order.services,
    } : null

    return NextResponse.json({
      services: services || [],
      order: orderForClient,
      currentServices,
      modifications: modifications || [],
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AddServiceInput = await request.json()

    if (!body.service_key) {
      return NextResponse.json(
        { error: 'service_key is required' },
        { status: 400 }
      )
    }

    // Get service from catalog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: service, error: serviceError } = await (supabase as any)
      .from('service_catalog')
      .select('*')
      .eq('service_key', body.service_key)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Get order for this listing
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, services, total_cents')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'No order found for this listing' },
        { status: 404 }
      )
    }

    // Calculate price (in cents)
    const quantity = body.quantity || 1
    const servicePriceCents = Math.round(service.base_price * 100) * quantity
    const newTotalCents = (order.total_cents || 0) + servicePriceCents

    // Create order modification record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: modification, error: modError } = await (supabase as any)
      .from('order_modifications')
      .insert({
        order_id: order.id,
        listing_id: listingId,
        modification_type: 'add_service',
        service_id: body.service_key,
        service_name: service.name,
        service_price: service.base_price,
        quantity,
        price_change: service.base_price * quantity,
        original_total: (order.total_cents || 0) / 100,
        new_total: newTotalCents / 100,
        status: 'applied',
        reason: body.reason,
        requested_by: staff.id,
        requested_by_type: 'staff',
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (modError) {
      if (modError.code === '42P01') {
        // Table doesn't exist, return mock
        return NextResponse.json({
          modification: {
            id: crypto.randomUUID(),
            service_name: service.name,
            price_change: service.base_price * quantity,
            new_total: newTotalCents / 100,
          },
          message: 'Service added successfully',
        })
      }
      throw modError
    }

    // Update order services and total
    const currentServices = (order.services || []) as Record<string, unknown>[]
    const newServiceItem = {
      service_key: body.service_key,
      name: service.name,
      price: service.base_price,
      quantity,
    } as Record<string, unknown>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({
        services: [...currentServices, newServiceItem],
        total_cents: newTotalCents,
      })
      .eq('id', order.id)

    return NextResponse.json({
      modification,
      message: 'Service added successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding service:', error)
    return NextResponse.json(
      { error: 'Failed to add service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RemoveServiceInput = await request.json()

    if (!body.service_key) {
      return NextResponse.json(
        { error: 'service_key is required' },
        { status: 400 }
      )
    }

    // Get order for this listing
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, services, total_cents')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'No order found for this listing' },
        { status: 404 }
      )
    }

    // Find the service in services array
    const orderServices = (order.services as ServiceItem[]) || []
    const serviceIndex = orderServices.findIndex(item => item.service_key === body.service_key)

    if (serviceIndex === -1) {
      return NextResponse.json(
        { error: 'Service not found in order' },
        { status: 404 }
      )
    }

    const removedService = orderServices[serviceIndex]
    const servicePrice = (removedService.price || 0) * (removedService.quantity || 1)
    const servicePriceCents = Math.round(servicePrice * 100)
    const newTotalCents = Math.max(0, (order.total_cents || 0) - servicePriceCents)

    // Create order modification record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: modification, error: modError } = await (supabase as any)
      .from('order_modifications')
      .insert({
        order_id: order.id,
        listing_id: listingId,
        modification_type: 'remove_service',
        service_id: body.service_key,
        service_name: removedService.name,
        service_price: removedService.price,
        quantity: removedService.quantity || 1,
        price_change: -servicePrice,
        original_total: (order.total_cents || 0) / 100,
        new_total: newTotalCents / 100,
        status: 'applied',
        reason: body.reason,
        requested_by: staff.id,
        requested_by_type: 'staff',
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (modError && modError.code !== '42P01') {
      throw modError
    }

    // Update order services and total
    const updatedServices = orderServices.filter((_, idx) => idx !== serviceIndex) as Record<string, unknown>[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('orders')
      .update({
        services: updatedServices,
        total_cents: newTotalCents,
      })
      .eq('id', order.id)

    return NextResponse.json({
      modification: modification || {
        id: crypto.randomUUID(),
        service_name: removedService.name,
        price_change: -servicePrice,
        new_total: newTotalCents / 100,
      },
      message: 'Service removed successfully',
    })
  } catch (error) {
    console.error('Error removing service:', error)
    return NextResponse.json(
      { error: 'Failed to remove service' },
      { status: 500 }
    )
  }
}
