import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/staff - List all staff members
export async function GET() {
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

  // Fetch all staff members
  const { data: staffList, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }

  return NextResponse.json({ staff: staffList })
}

// POST /api/admin/staff - Create a new staff member
export async function POST(request: NextRequest) {
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
    const { email, name, role, phone } = body

    // Validate required fields
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'photographer', 'qc', 'va', 'editor']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if staff already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingStaff) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 }
      )
    }

    // Create staff member
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert({
        email: email.toLowerCase(),
        name,
        role,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating staff:', error)
      return NextResponse.json(
        { error: 'Failed to create staff member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ staff: newStaff }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
