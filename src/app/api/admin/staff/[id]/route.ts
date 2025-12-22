import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/staff/[id] - Get a single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is staff
  const { data: currentStaff } = await supabase
    .from('staff')
    .select('role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!currentStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch staff member
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !staff) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  return NextResponse.json({ staff })
}

// PUT /api/admin/staff/[id] - Update a staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is staff with admin role
  const { data: currentStaff } = await supabase
    .from('staff')
    .select('role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!currentStaff || currentStaff.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, role, phone, is_active } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (is_active !== undefined) updateData.is_active = is_active

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['admin', 'photographer', 'qc', 'va', 'editor']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.role = role
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update staff member
    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating staff:', error)
      return NextResponse.json(
        { error: 'Failed to update staff member' },
        { status: 500 }
      )
    }

    if (!updatedStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ staff: updatedStaff })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// DELETE /api/admin/staff/[id] - Delete a staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is staff with admin role
  const { data: currentStaff } = await supabase
    .from('staff')
    .select('id, role')
    .eq('email', user.email!)
    .eq('is_active', true)
    .single()

  if (!currentStaff || currentStaff.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Prevent self-deletion
  if (currentStaff.id === id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account' },
      { status: 400 }
    )
  }

  // Delete staff member
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
