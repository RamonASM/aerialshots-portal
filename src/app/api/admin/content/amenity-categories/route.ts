/**
 * Amenity Categories API
 *
 * List amenity categories
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET() {
  try {
    await requireStaffAccess()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('amenity_categories')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Error fetching amenity categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }

  return NextResponse.json({ categories: data || [] })
}
