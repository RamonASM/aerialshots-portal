import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaffAccess, hasRequiredRole } from '@/lib/auth/server-access'
import {
  handleApiError,
  badRequest,
  resourceNotFound,
  databaseError,
  notAuthenticated,
  notAuthorized,
} from '@/lib/utils/errors'
import { z } from 'zod'

/**
 * Valid staff roles
 */
const VALID_ROLES = ['admin', 'photographer', 'qc', 'va', 'editor'] as const

/**
 * Staff update schema
 */
const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(VALID_ROLES).optional(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

/**
 * Get a single staff member
 * GET /api/admin/staff/[id]
 *
 * Requires staff authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id } = await params
    const access = await getStaffAccess()
    if (!access) {
      throw notAuthenticated()
    }

    const supabase = createAdminClient()

    // Fetch staff member
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !staff) {
      throw resourceNotFound('Staff member', id)
    }

    return NextResponse.json({ staff })
  })
}

/**
 * Update a staff member
 * PUT /api/admin/staff/[id]
 *
 * Requires admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id } = await params
    const access = await getStaffAccess()
    if (!access) {
      throw notAuthenticated()
    }
    if (!hasRequiredRole(access.role, ['admin'], true)) {
      throw notAuthorized('Admin access required', 'admin')
    }

    const supabase = createAdminClient()

    const body = await request.json()

    // Validate request body
    const result = updateStaffSchema.safeParse(body)
    if (!result.success) {
      const firstError = result.error.issues[0]
      throw badRequest(firstError.message)
    }

    const updateData = result.data

    if (Object.keys(updateData).length === 0) {
      throw badRequest('No valid fields to update')
    }

    // Update staff member
    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw databaseError(error, 'updating staff member')
    }

    if (!updatedStaff) {
      throw resourceNotFound('Staff member', id)
    }

    return NextResponse.json({ staff: updatedStaff })
  })
}

/**
 * Delete a staff member
 * DELETE /api/admin/staff/[id]
 *
 * Requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id } = await params
    const access = await getStaffAccess()
    if (!access) {
      throw notAuthenticated()
    }
    if (!hasRequiredRole(access.role, ['admin'], true)) {
      throw notAuthorized('Admin access required', 'admin')
    }

    const supabase = createAdminClient()

    // Prevent self-deletion
    if (access.id === id) {
      throw badRequest('You cannot delete your own account')
    }

    // Delete staff member
    const { error } = await supabase.from('staff').delete().eq('id', id)

    if (error) {
      throw databaseError(error, 'deleting staff member')
    }

    return NextResponse.json({ success: true })
  })
}
