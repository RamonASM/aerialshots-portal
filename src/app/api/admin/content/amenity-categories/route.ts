/**
 * Amenity Categories API
 *
 * List amenity categories
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('amenity_categories')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Error fetching amenity categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }

  return NextResponse.json({ categories: data || [] })
}
