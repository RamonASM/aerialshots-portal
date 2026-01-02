import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import {
  generateInvoicePDF,
  formatOrderForInvoice,
  InvoiceTemplate,
} from '@/lib/pdf/invoice-generator'

// Rate limit: 20 PDF generations per minute (prevent DOS via CPU-intensive generation)
const RATE_LIMIT_CONFIG = { limit: 20, windowSeconds: 60 }

// GET - Download invoice PDF for a generated invoice or order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting by user ID (PDF generation is CPU-intensive)
    const rateLimitResult = checkRateLimit(`invoice-pdf:${user.id}`, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many PDF requests. Please wait before generating more.' },
        { status: 429 }
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Try to find a generated invoice first
    const { data: generatedInvoice } = await supabase
      .from('generated_invoices')
      .select('*, orders(*), invoice_templates(*)')
      .eq('id', id)
      .single()

    let invoiceNumber: string
    let order: {
      id: string
      contact_name: string
      contact_email: string
      contact_phone?: string
      property_address?: string
      services: Array<{ name: string; price_cents: number }>
      total_cents: number
      created_at: string
      payment_status?: string
      paid_at?: string
    }
    let template: InvoiceTemplate | undefined

    if (generatedInvoice) {
      // Use the generated invoice data
      invoiceNumber = generatedInvoice.invoice_number
      const orderData = generatedInvoice.orders as Record<string, unknown>
      if (!orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Transform services to the expected format
      const rawServices = (orderData.services || []) as Array<{ name?: string; price_cents?: number }>
      const services = rawServices.map((s) => ({
        name: s.name || '',
        price_cents: s.price_cents || 0,
      }))

      order = {
        id: orderData.id as string,
        contact_name: (orderData.contact_name as string) || 'Customer',
        contact_email: (orderData.contact_email as string) || '',
        contact_phone: orderData.contact_phone as string | undefined,
        property_address: orderData.property_address as string | undefined,
        services,
        total_cents: (orderData.total_cents as number) || 0,
        created_at: orderData.created_at as string,
        payment_status: orderData.payment_status as string | undefined,
        paid_at: orderData.paid_at as string | undefined,
      }
      template = generatedInvoice.invoice_templates as InvoiceTemplate | undefined
    } else {
      // Check if it's an order ID directly
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError || !orderData) {
        return NextResponse.json({ error: 'Invoice or order not found' }, { status: 404 })
      }

      // Check authorization - staff or order owner
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('email', user.email!)
        .eq('is_active', true)
        .single()

      let agent = null
      if (orderData.agent_id) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('email', user.email!)
          .eq('id', orderData.agent_id)
          .single()
        agent = agentData
      }

      if (!staff && !agent) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Generate a temporary invoice number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      invoiceNumber = `INV-${dateStr}-${orderData.id.slice(0, 6).toUpperCase()}`

      // Parse services from order
      const services = (orderData.services || []) as Array<{
        name: string
        price_cents: number
      }>

      order = {
        id: orderData.id,
        contact_name: orderData.contact_name || 'Customer',
        contact_email: orderData.contact_email || '',
        contact_phone: orderData.contact_phone ?? undefined,
        property_address: orderData.property_address ?? undefined,
        services,
        total_cents: orderData.total_cents || 0,
        created_at: orderData.created_at || new Date().toISOString(),
        payment_status: orderData.payment_status ?? undefined,
        paid_at: orderData.paid_at ?? undefined,
      }

      // Get default template
      const { data: defaultTemplate } = await supabase
        .from('invoice_templates')
        .select('*')
        .is('agent_id', null)
        .eq('is_default', true)
        .single()

      template = defaultTemplate as InvoiceTemplate | undefined
    }

    // Generate the invoice PDF
    const invoiceData = formatOrderForInvoice(order, invoiceNumber, template)
    const pdfBuffer = await generateInvoicePDF(invoiceData)

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}

// POST - Create a new generated invoice record and return PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySupabase = supabase as any

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting by user ID (PDF generation is CPU-intensive)
    const rateLimitResult = checkRateLimit(`invoice-pdf:${user.id}`, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: 'Too many PDF requests. Please wait before generating more.' },
        { status: 429 }
      )
      Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get order details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body = await request.json()
    const { template_id, due_date, notes } = body

    // Get template if specified
    let template: InvoiceTemplate | undefined
    if (template_id) {
      const { data: templateData } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('id', template_id)
        .single()

      template = templateData as InvoiceTemplate | undefined
    } else {
      // Get default template
      const { data: defaultTemplate } = await supabase
        .from('invoice_templates')
        .select('*')
        .is('agent_id', null)
        .eq('is_default', true)
        .single()

      template = defaultTemplate as InvoiceTemplate | undefined
    }

    // Create generated invoice record (invoice_number is auto-generated by trigger)
    const { data: generatedInvoice, error: invoiceError } = await anySupabase
      .from('generated_invoices')
      .insert({
        order_id: orderId,
        template_id: template_id || null,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: due_date || null,
        status: 'draft',
        internal_notes: notes || null,
        created_by: staff.id,
      })
      .select('*')
      .single()

    if (invoiceError) {
      throw invoiceError
    }

    // Parse services from order
    const services = (orderData.services || []) as Array<{
      name: string
      price_cents: number
    }>

    const order = {
      id: orderData.id,
      contact_name: orderData.contact_name || 'Customer',
      contact_email: orderData.contact_email || '',
      contact_phone: orderData.contact_phone ?? undefined,
      property_address: orderData.property_address ?? undefined,
      services,
      total_cents: orderData.total_cents || 0,
      created_at: orderData.created_at || new Date().toISOString(),
      payment_status: orderData.payment_status ?? undefined,
      paid_at: orderData.paid_at ?? undefined,
    }

    // Generate the invoice PDF
    const invoiceData = formatOrderForInvoice(
      order,
      generatedInvoice.invoice_number,
      template
    )
    const pdfBuffer = await generateInvoicePDF(invoiceData)

    // Update the generated invoice with PDF generation timestamp
    await anySupabase
      .from('generated_invoices')
      .update({ pdf_generated_at: new Date().toISOString() })
      .eq('id', generatedInvoice.id)

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 201,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${generatedInvoice.invoice_number}.pdf"`,
        'X-Invoice-Id': generatedInvoice.id,
        'X-Invoice-Number': generatedInvoice.invoice_number,
      },
    })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
