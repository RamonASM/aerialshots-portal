import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()
    const { id } = await params

    const body = await request.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rule, error } = await (supabase as any)
      .from('notification_rules')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update rule error:', error)
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rule })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()
    const { id } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notification_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete rule error:', error)
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
