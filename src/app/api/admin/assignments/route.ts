import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'
import { handleApiError, badRequest, databaseError } from '@/lib/utils/errors'
import { sendNotification, isEmailConfigured, isSMSConfigured } from '@/lib/notifications'
import { z } from 'zod'

/**
 * Assignment request schema
 */
const assignmentSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  staff_id: z.string().uuid('Invalid staff ID'),
  role: z.enum(['photographer', 'editor']),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const batchAssignmentSchema = z.object({
  assignments: z.array(assignmentSchema).min(1, 'At least one assignment is required'),
})

/**
 * Get available staff for assignments
 * GET /api/admin/assignments
 *
 * Query params:
 * - role: 'photographer' | 'editor' | 'all'
 * - date: ISO date string (for photographer availability)
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'all'
    const date = searchParams.get('date')

    // Get staff with workload info
    let query = supabase
      .from('staff')
      .select('id, name, email, phone, role, is_active')
      .eq('is_active', true)
      .order('name')

    if (role !== 'all') {
      query = query.eq('role', role)
    } else {
      query = query.in('role', ['photographer', 'editor'])
    }

    const { data: staff, error: staffError } = await query

    if (staffError) {
      throw databaseError(staffError, 'fetching staff')
    }

    // Get workload for each staff member
    const staffWithWorkload = await Promise.all(
      (staff || []).map(async (s) => {
        let workload = 0
        let todayJobs = 0

        if (s.role === 'photographer') {
          // Get photographer assignments
          const { data: assignments } = await (supabase as any)
            .from('photographer_assignments')
            .select('id, scheduled_at, status')
            .eq('photographer_id', s.id)
            .in('status', ['pending', 'confirmed', 'in_progress'])

          workload = assignments?.length || 0

          // Count today's jobs
          const today = new Date().toISOString().split('T')[0]
          todayJobs = assignments?.filter((a: any) =>
            a.scheduled_at?.startsWith(today)
          ).length || 0

          // If specific date requested, count jobs for that date
          if (date) {
            todayJobs = assignments?.filter((a: any) =>
              a.scheduled_at?.startsWith(date)
            ).length || 0
          }
        } else if (s.role === 'editor') {
          // Get editor assignments
          const { data: assignments } = await (supabase as any)
            .from('editor_assignments')
            .select('id, status')
            .eq('editor_id', s.id)
            .in('status', ['pending', 'in_progress'])

          workload = assignments?.length || 0
        }

        return {
          ...s,
          workload,
          todayJobs,
        }
      })
    )

    // Sort by workload (least busy first)
    staffWithWorkload.sort((a, b) => a.workload - b.workload)

    return NextResponse.json({
      staff: staffWithWorkload,
      total: staffWithWorkload.length,
    })
  })
}

/**
 * Create assignment(s)
 * POST /api/admin/assignments
 *
 * Single assignment:
 * { listing_id, staff_id, role, scheduled_at?, notes? }
 *
 * Batch assignment:
 * { assignments: [{ listing_id, staff_id, role, ... }, ...] }
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const staff = await requireStaffAccess(['admin', 'qc'])
    const supabase = createAdminClient()

    const body = await request.json()

    // Check if batch or single assignment
    const isBatch = 'assignments' in body

    let assignments: z.infer<typeof assignmentSchema>[]

    if (isBatch) {
      const result = batchAssignmentSchema.safeParse(body)
      if (!result.success) {
        throw badRequest(result.error.issues[0].message)
      }
      assignments = result.data.assignments
    } else {
      const result = assignmentSchema.safeParse(body)
      if (!result.success) {
        throw badRequest(result.error.issues[0].message)
      }
      assignments = [result.data]
    }

    const results: { success: boolean; listing_id: string; error?: string }[] = []

    for (const assignment of assignments) {
      try {
        // Verify staff exists and has correct role
        const { data: targetStaff, error: staffError } = await supabase
          .from('staff')
          .select('id, name, email, phone, role, is_active')
          .eq('id', assignment.staff_id)
          .single()

        if (staffError || !targetStaff) {
          results.push({
            success: false,
            listing_id: assignment.listing_id,
            error: 'Staff member not found',
          })
          continue
        }

        if (!targetStaff.is_active) {
          results.push({
            success: false,
            listing_id: assignment.listing_id,
            error: 'Staff member is not active',
          })
          continue
        }

        if (targetStaff.role !== assignment.role) {
          results.push({
            success: false,
            listing_id: assignment.listing_id,
            error: `Staff member is a ${targetStaff.role}, not a ${assignment.role}`,
          })
          continue
        }

        // Verify listing exists
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id, address, ops_status')
          .eq('id', assignment.listing_id)
          .single()

        if (listingError || !listing) {
          results.push({
            success: false,
            listing_id: assignment.listing_id,
            error: 'Listing not found',
          })
          continue
        }

        // Update listing with assignment
        const updateData: Record<string, any> = {}

        if (assignment.role === 'photographer') {
          updateData.photographer_id = assignment.staff_id
          if (assignment.scheduled_at) {
            updateData.scheduled_at = assignment.scheduled_at
          }
        } else if (assignment.role === 'editor') {
          updateData.editor_id = assignment.staff_id
        }

        const { error: updateError } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', assignment.listing_id)

        if (updateError) {
          results.push({
            success: false,
            listing_id: assignment.listing_id,
            error: updateError.message,
          })
          continue
        }

        // Log the assignment
        await (supabase as any).from('ops_activity_log').insert({
          listing_id: assignment.listing_id,
          actor_id: staff.id,
          actor_type: 'staff',
          action: `${assignment.role}_assigned`,
          details: {
            staff_id: assignment.staff_id,
            staff_name: targetStaff.name,
            notes: assignment.notes,
          },
        }).catch(() => {
          // Activity log is optional
        })

        // Send notification to assigned staff (async, don't block)
        if (isEmailConfigured() || isSMSConfigured()) {
          const notificationType = assignment.role === 'photographer'
            ? 'photographer_assigned'
            : 'editor_assigned'

          // Determine channel based on role and available configs
          let channel: 'email' | 'sms' | 'both' = 'email'
          if (assignment.role === 'photographer' && isSMSConfigured() && targetStaff.phone) {
            channel = isEmailConfigured() ? 'both' : 'sms'
          }

          sendNotification({
            type: notificationType as any,
            recipient: {
              name: targetStaff.name,
              email: targetStaff.email,
              phone: targetStaff.phone || undefined,
            },
            channel,
            data: {
              listingAddress: listing.address,
              listingId: listing.id,
              scheduledAt: assignment.scheduled_at,
              assignedBy: staff.name,
            },
          }).catch((err) => {
            console.error('Failed to send assignment notification:', err)
          })
        }

        results.push({
          success: true,
          listing_id: assignment.listing_id,
        })
      } catch (err) {
        results.push({
          success: false,
          listing_id: assignment.listing_id,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    })
  })
}
