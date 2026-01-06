import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error } = await (supabase as any)
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Only include fields that were provided
    if (body.name !== undefined) updates.name = body.name
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.body_html !== undefined) updates.body_html = body.body_html
    if (body.body_text !== undefined) updates.body_text = body.body_text
    if (body.category !== undefined) updates.category = body.category
    if (body.variables !== undefined) updates.variables = body.variables
    if (body.conditions !== undefined) updates.conditions = body.conditions
    if (body.is_active !== undefined) updates.is_active = body.is_active

    updates.updated_at = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error } = await (supabase as any)
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
