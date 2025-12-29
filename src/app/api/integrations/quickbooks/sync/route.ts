import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QuickBooksClient } from '@/lib/integrations/quickbooks/client'
import { apiLogger, formatError } from '@/lib/logger'
import { z } from 'zod'

interface QuickBooksSettings {
  connected: boolean
  realm_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  refresh_expiry: string
}

interface InvoiceData {
  id: string
  amount: number
  due_date: string
  status: string
  quickbooks_invoice_id: string | null
  agent: { id: string; name: string; email: string; phone?: string; company?: string } | null
  order: { id: string; address: string } | null
}

interface InvoiceItem {
  description: string
  amount: number
  quantity: number | null
}

interface InvoiceSyncStatus {
  id: string
  amount: number
  status: string
  quickbooks_invoice_id: string | null
  quickbooks_synced_at: string | null
  created_at: string
}

const SyncInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
})

/**
 * POST /api/integrations/quickbooks/sync
 * Sync a specific invoice to QuickBooks
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff || !['admin', 'owner'].includes(staff.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request
    const rawBody = await request.json()
    const parseResult = SyncInvoiceSchema.safeParse(rawBody)

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { invoiceId } = parseResult.data

    // Get QuickBooks settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings, error: settingsError } = await (supabase as any)
      .from('integration_settings')
      .select('value')
      .eq('key', 'quickbooks')
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'QuickBooks not connected. Please connect first.' },
        { status: 400 }
      )
    }

    const qbSettings = settings.value as QuickBooksSettings

    if (!qbSettings.connected || !qbSettings.access_token) {
      return NextResponse.json(
        { error: 'QuickBooks not connected. Please reconnect.' },
        { status: 400 }
      )
    }

    // Check if refresh token is expired
    if (new Date(qbSettings.refresh_expiry) < new Date()) {
      return NextResponse.json(
        { error: 'QuickBooks connection expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Get invoice with agent and order details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoiceData, error: invoiceError } = await (supabase as any)
      .from('invoices')
      .select(`
        id,
        amount,
        due_date,
        status,
        quickbooks_invoice_id,
        agent:agents(id, name, email, phone, company),
        order:orders(id, address)
      `)
      .eq('id', invoiceId)
      .single()

    const invoice = invoiceData as InvoiceData | null

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if already synced
    if (invoice.quickbooks_invoice_id) {
      return NextResponse.json({
        success: true,
        message: 'Invoice already synced to QuickBooks',
        quickbooksInvoiceId: invoice.quickbooks_invoice_id,
      })
    }

    // Initialize QuickBooks client with stored credentials
    const qbClient = new QuickBooksClient({
      realmId: qbSettings.realm_id,
      accessToken: qbSettings.access_token,
      refreshToken: qbSettings.refresh_token,
    })

    // Check if token needs refresh
    if (new Date(qbSettings.token_expiry) < new Date()) {
      try {
        const newTokens = await qbClient.refreshAccessToken()

        // Update stored tokens
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('integration_settings')
          .update({
            value: {
              ...qbSettings,
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'quickbooks')
      } catch (refreshError) {
        apiLogger.error({ error: formatError(refreshError) }, 'Failed to refresh QuickBooks token')
        return NextResponse.json(
          { error: 'Failed to refresh QuickBooks token. Please reconnect.' },
          { status: 400 }
        )
      }
    }

    // Get invoice line items if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lineItemsData } = await (supabase as any)
      .from('invoice_items')
      .select('description, amount, quantity')
      .eq('invoice_id', invoiceId)

    const lineItems = lineItemsData as InvoiceItem[] | null

    // Sync to QuickBooks
    const agent = invoice.agent
    const order = invoice.order

    const syncResult = await qbClient.syncInvoice({
      id: invoice.id,
      amount: invoice.amount,
      due_date: invoice.due_date,
      agent: {
        name: agent?.name || 'Unknown',
        email: agent?.email || '',
        phone: agent?.phone,
        company: agent?.company,
      },
      order: order ? { address: order.address } : undefined,
      services: lineItems?.map((item) => ({
        name: item.description,
        price: item.amount,
        quantity: item.quantity || 1,
      })),
    })

    // Update invoice with QuickBooks ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('invoices')
      .update({
        quickbooks_invoice_id: syncResult.quickbooksInvoiceId,
        quickbooks_customer_id: syncResult.quickbooksCustomerId,
        quickbooks_synced_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    apiLogger.info({
      invoiceId,
      quickbooksInvoiceId: syncResult.quickbooksInvoiceId,
      staffEmail: user.email,
    }, 'Invoice synced to QuickBooks')

    return NextResponse.json({
      success: true,
      message: 'Invoice synced to QuickBooks successfully',
      quickbooksInvoiceId: syncResult.quickbooksInvoiceId,
      quickbooksCustomerId: syncResult.quickbooksCustomerId,
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'QuickBooks sync error')
    return NextResponse.json({ error: 'Failed to sync invoice' }, { status: 500 })
  }
}

/**
 * GET /api/integrations/quickbooks/sync
 * Get sync status for recent invoices
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify staff authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify staff role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get recent invoices with sync status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoicesData, error: invoicesError } = await (supabase as any)
      .from('invoices')
      .select('id, amount, status, quickbooks_invoice_id, quickbooks_synced_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const invoices = invoicesData as InvoiceSyncStatus[] | null

    if (invoicesError) {
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    const syncedCount = invoices?.filter((i) => i.quickbooks_invoice_id).length || 0
    const unsyncedCount = invoices?.filter((i) => !i.quickbooks_invoice_id).length || 0

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      summary: {
        total: invoices?.length || 0,
        synced: syncedCount,
        unsynced: unsyncedCount,
      },
    })
  } catch (error) {
    apiLogger.error({ error: formatError(error) }, 'QuickBooks sync status error')
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}
