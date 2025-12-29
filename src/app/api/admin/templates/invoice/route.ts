import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch invoice template (default or by agent)
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
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get the default template (agent_id is null for global template)
    const { data: template, error } = await supabase
      .from('invoice_templates')
      .select('*')
      .is('agent_id', null)
      .eq('is_default', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error
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
      .single()

    if (error) {
      throw error
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
