import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import {
  handleApiError,
  badRequest,
  resourceConflict,
  databaseError,
} from '@/lib/utils/errors'
import { z } from 'zod'

/**
 * Valid staff roles
 */
const VALID_ROLES = ['admin', 'photographer', 'qc', 'va', 'editor'] as const
type StaffRole = (typeof VALID_ROLES)[number]

/**
 * Staff creation schema
 */
const createStaffSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(VALID_ROLES, {
    message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
  }),
  phone: z.string().optional(),
})

/**
 * List all staff members
 * GET /api/admin/staff
 *
 * Requires admin role
 */
export async function GET() {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require admin role
    await requireStaff(supabase, 'admin')

    // Fetch all staff members
    const { data: staffList, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw databaseError(error, 'fetching staff')
    }

    return NextResponse.json({ staff: staffList })
  })
}

/**
 * Create a new staff member
 * POST /api/admin/staff
 *
 * Requires admin role
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require admin role
    await requireStaff(supabase, 'admin')

    const body = await request.json()

    // Validate request body
    const result = createStaffSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      throw badRequest(firstError.message)
    }

    const { email, name, role, phone } = result.data
    const normalizedEmail = email.toLowerCase()

    // Check if staff already exists
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existingStaff) {
      throw resourceConflict('Staff member', 'A staff member with this email already exists')
    }

    // Create staff member
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert({
        email: normalizedEmail,
        name,
        role: role as StaffRole,
        phone: phone || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      throw databaseError(error, 'creating staff member')
    }

    return NextResponse.json({ staff: newStaff }, { status: 201 })
  })
}
