import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

// POST /api/admin/integrations/zapier/test - Test a webhook
export async function POST(request: Request) {
  try {
    await requireStaffAccess(['admin'])

    const body = await request.json()
    const { webhook_id, webhook_url } = body

    if (!webhook_url && !webhook_id) {
      return NextResponse.json(
        { error: 'Either webhook_id or webhook_url is required' },
        { status: 400 }
      )
    }

    let url = webhook_url
    let secretKey = 'test-secret'

    // If webhook_id provided, get the URL from database
    if (webhook_id) {
      const adminSupabase = createAdminClient()
      // Use type cast since zapier_webhooks is a new table
      const { data: webhook } = await (adminSupabase as any)
        .from('zapier_webhooks')
        .select('webhook_url, secret_key')
        .eq('id', webhook_id)
        .single()

      if (!webhook) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
      }

      url = webhook.webhook_url
      secretKey = webhook.secret_key
    }

    // Send test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from ASM Portal',
        test_id: crypto.randomUUID(),
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': secretKey,
        'X-Webhook-Event': 'test',
        'X-Webhook-Timestamp': testPayload.timestamp,
      },
      body: JSON.stringify(testPayload),
    })

    const responseBody = await response.text().catch(() => '')

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseBody: responseBody.slice(0, 500),
    })
  } catch (error) {
    console.error('Zapier webhook test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
    })
  }
}
