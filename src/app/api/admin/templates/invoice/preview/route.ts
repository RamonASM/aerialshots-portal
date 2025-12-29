import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePDF, InvoiceData, InvoiceTemplate } from '@/lib/pdf/invoice-generator'

// POST - Generate a preview PDF with sample data
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

    const template: InvoiceTemplate = await request.json()

    // Create sample invoice data for preview
    const sampleInvoice: InvoiceData = {
      invoiceNumber: 'INV-2024-PREVIEW',
      invoiceDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      ),
      customerName: 'Jane Smith',
      customerEmail: 'jane.smith@example.com',
      customerPhone: '(555) 123-4567',
      customerAddress: '456 Oak Avenue, Suite 100',
      propertyAddress: '123 Maple Street, Cityville, FL 32801',
      items: [
        {
          description: 'Photography Package - Essentials',
          quantity: 1,
          unitPrice: 39900,
          total: 39900,
        },
        {
          description: 'Drone Aerial Photography',
          quantity: 1,
          unitPrice: 14900,
          total: 14900,
        },
        {
          description: 'Zillow 3D Home Tour',
          quantity: 1,
          unitPrice: 9900,
          total: 9900,
        },
        {
          description: '2D Floor Plan',
          quantity: 1,
          unitPrice: 7500,
          total: 7500,
        },
      ],
      subtotal: 72200,
      total: 72200,
      amountPaid: 0,
      amountDue: 72200,
      paymentLink: 'https://portal.aerialshots.media/pay/sample-order-id',
      notes: 'This is a sample invoice preview. Actual invoices will include real order data.',
      template,
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(sampleInvoice)

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="invoice-preview.pdf"',
      },
    })
  } catch (error) {
    console.error('Error generating invoice preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
