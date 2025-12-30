/**
 * Community Amenities API
 *
 * CRUD operations for community amenities library
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import { z } from 'zod'

const amenitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  communityId: z.string().uuid().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  proximityRadiusMiles: z.number().optional(),
  imageUrl: z.string().url().optional(),
  hoursOfOperation: z.record(z.string(), z.string()).optional(),
  accessType: z.enum(['public', 'residents', 'members', 'private']).optional(),
  tags: z.array(z.string()).optional(),
})

// GET - List amenities
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const communityId = searchParams.get('communityId')
  const categoryId = searchParams.get('categoryId')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '1.0'
  const search = searchParams.get('search')

  const supabase = await createClient()

  // If searching by proximity, use the function
  if (lat && lng) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('find_nearby_amenities', {
      p_lat: parseFloat(lat),
      p_lng: parseFloat(lng),
      p_radius_miles: parseFloat(radius),
      p_category_id: categoryId || null,
    })

    if (error) {
      console.error('Error finding nearby amenities:', error)
      return NextResponse.json({ error: 'Failed to find amenities' }, { status: 500 })
    }

    return NextResponse.json({ amenities: data || [] })
  }

  // Standard query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('community_amenities')
    .select(`
      *,
      category:amenity_categories(id, name, slug, icon)
    `)
    .order('name')

  if (communityId) {
    query = query.eq('community_id', communityId)
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching amenities:', error)
    return NextResponse.json({ error: 'Failed to fetch amenities' }, { status: 500 })
  }

  return NextResponse.json({ amenities: data || [] })
}

// POST - Create amenity (staff only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const body = await request.json()
    const parsed = amenitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      categoryId,
      communityId,
      address,
      lat,
      lng,
      proximityRadiusMiles,
      imageUrl,
      hoursOfOperation,
      accessType,
      tags,
    } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('community_amenities')
      .insert({
        name,
        description,
        category_id: categoryId,
        community_id: communityId,
        address,
        lat,
        lng,
        proximity_radius_miles: proximityRadiusMiles,
        image_url: imageUrl,
        hours_of_operation: hoursOfOperation,
        access_type: accessType,
        tags,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating amenity:', error)
      return NextResponse.json({ error: 'Failed to create amenity' }, { status: 500 })
    }

    return NextResponse.json({ amenity: data }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// PUT - Update amenity (staff only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Amenity ID is required' }, { status: 400 })
    }

    const parsed = amenitySchema.partial().safeParse(updateData)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.name) updates.name = parsed.data.name
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.categoryId) updates.category_id = parsed.data.categoryId
    if (parsed.data.communityId) updates.community_id = parsed.data.communityId
    if (parsed.data.address !== undefined) updates.address = parsed.data.address
    if (parsed.data.lat !== undefined) updates.lat = parsed.data.lat
    if (parsed.data.lng !== undefined) updates.lng = parsed.data.lng
    if (parsed.data.proximityRadiusMiles !== undefined)
      updates.proximity_radius_miles = parsed.data.proximityRadiusMiles
    if (parsed.data.imageUrl !== undefined) updates.image_url = parsed.data.imageUrl
    if (parsed.data.hoursOfOperation !== undefined)
      updates.hours_of_operation = parsed.data.hoursOfOperation
    if (parsed.data.accessType !== undefined) updates.access_type = parsed.data.accessType
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('community_amenities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating amenity:', error)
      return NextResponse.json({ error: 'Failed to update amenity' }, { status: 500 })
    }

    return NextResponse.json({ amenity: data })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// DELETE - Remove amenity (staff only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireStaff(supabase)

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Amenity ID is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('community_amenities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting amenity:', error)
      return NextResponse.json({ error: 'Failed to delete amenity' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}
