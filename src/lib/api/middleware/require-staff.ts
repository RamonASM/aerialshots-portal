/**
 * Require Staff Middleware
 *
 * Verifies the current user is staff (has @aerialshots.media email)
 */

import { createClient } from '@/lib/supabase/server'

export interface StaffUser {
  id: string
  email: string
  role?: string
  name?: string
}

/**
 * Verify the current session user is staff
 * @throws Error if not authenticated or not staff
 */
export async function requireStaff(): Promise<StaffUser> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: Not authenticated')
  }

  // Check if email is staff domain
  const email = user.email || ''
  if (!email.endsWith('@aerialshots.media')) {
    throw new Error('Unauthorized: Not staff')
  }

  // Get staff record by email
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, email, role, name')
    .eq('email', email)
    .maybeSingle()

  if (staffError) {
    console.error('Staff lookup error:', staffError)
    throw new Error('Unauthorized: Staff lookup failed')
  }

  // If no staff record, create one (self-registration for @aerialshots.media emails)
  if (!staff) {
    const { data: newStaff, error: insertError } = await supabase
      .from('staff')
      .insert({
        email,
        role: 'staff',
        name: email.split('@')[0],
      })
      .select('id, email, role, name')
      .single()

    if (insertError || !newStaff) {
      throw new Error('Unauthorized: Failed to create staff record')
    }

    return newStaff as StaffUser
  }

  return staff as StaffUser
}
