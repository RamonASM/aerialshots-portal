import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

// GET - Fetch invoice template (default or by agent)
export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    // Get the default template (agent_id is null for global template)
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .is('agent_id', null)
      .eq('is_default', true)
      .maybeSingle()

    if (error) {
      console.error('[Invoice Template] Lookup error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ template: null }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching invoice template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice template' },
      { status: 500 }
    )
  }
}

// POST - Create new invoice template
export async function POST(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    // Remove id if present (let database generate it)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...templateData } = body

    // Create the template
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .insert({
        ...templateData,
        agent_id: null, // Global template
        is_default: true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice template:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice template' },
      { status: 500 }
    )
  }
}

// PATCH - Update invoice template
export async function PATCH(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Update the template
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Invoice Template] Update error:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating invoice template:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice template' },
      { status: 500 }
    )
  }
}
