import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query - orders act as invoices
    let query = supabase
      .from('orders')
      .select(`
        id,
        service_type,
        package_name,
        subtotal_cents,
        discount_cents,
        tax_cents,
        total_cents,
        property_address,
        property_city,
        property_state,
        contact_name,
        contact_email,
        status,
        payment_status,
        payment_intent_id,
        paid_at,
        created_at,
        agent:agents(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Map payment_status to invoice status for filtering
    // pending/processing -> pending, succeeded -> paid, failed -> overdue
    if (status !== 'all') {
      if (status === 'pending') {
        query = query.in('payment_status', ['pending', 'processing'])
      } else if (status === 'paid') {
        query = query.eq('payment_status', 'succeeded')
      } else if (status === 'overdue') {
        query = query.eq('payment_status', 'failed')
      } else if (status === 'void') {
        query = query.in('payment_status', ['cancelled', 'refunded'])
      }
    }

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,property_address.ilike.%${search}%`)
    }

    const { data: orders, count, error } = await query

    if (error) throw error

    // Get stats from all orders
    const { data: allOrders } = await supabase
      .from('orders')
      .select('total_cents, payment_status')

    const pendingOrders = allOrders?.filter(o => o.payment_status === 'pending' || o.payment_status === 'processing') || []
    const paidOrders = allOrders?.filter(o => o.payment_status === 'succeeded') || []
    const overdueOrders = allOrders?.filter(o => o.payment_status === 'failed') || []

    const stats = {
      totalPending: pendingOrders.length,
      totalPaid: paidOrders.length,
      totalOverdue: overdueOrders.length,
      pendingAmount: pendingOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
      paidAmount: paidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
      overdueAmount: overdueOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
    }

    // Transform orders to invoice format expected by the page
    const invoices = (orders || []).map(order => {
      // Map payment_status to invoice status
      let invoiceStatus: 'pending' | 'paid' | 'overdue' | 'void' | 'partial' = 'pending'
      if (order.payment_status === 'succeeded') {
        invoiceStatus = 'paid'
      } else if (order.payment_status === 'failed') {
        invoiceStatus = 'overdue'
      } else if (order.payment_status === 'cancelled' || order.payment_status === 'refunded') {
        invoiceStatus = 'void'
      }

      // Calculate due date (14 days from order creation)
      const dueDate = new Date(order.created_at || new Date())
      dueDate.setDate(dueDate.getDate() + 14)

      return {
        id: order.id,
        order_id: order.id,
        agent_id: order.agent?.id || '',
        amount: (order.total_cents || 0) / 100,
        status: invoiceStatus,
        due_date: dueDate.toISOString(),
        paid_at: order.paid_at,
        payment_method: order.payment_intent_id ? 'stripe' : null,
        created_at: order.created_at,
        order: {
          id: order.id,
          address: `${order.property_address}, ${order.property_city}, ${order.property_state}`,
        },
        agent: order.agent ? {
          name: order.agent.name || 'Unknown',
          email: order.agent.email || '',
          company: '',
        } : null,
      }
    })

    return NextResponse.json({
      invoices,
      stats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
