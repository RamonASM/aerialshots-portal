import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/listings/merge - Merge two listings
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { primary_listing_id, merged_listing_id, reason } = body

    if (!primary_listing_id || !merged_listing_id) {
      return NextResponse.json(
        { error: 'Both primary_listing_id and merged_listing_id are required' },
        { status: 400 }
      )
    }

    if (primary_listing_id === merged_listing_id) {
      return NextResponse.json(
        { error: 'Cannot merge a listing with itself' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Verify both listings exist
    const { data: primaryListing } = await adminSupabase
      .from('listings')
      .select('id, address, agent_id')
      .eq('id', primary_listing_id)
      .single()

    const { data: mergedListing } = await adminSupabase
      .from('listings')
      .select('id, address, agent_id')
      .eq('id', merged_listing_id)
      .single()

    if (!primaryListing || !mergedListing) {
      return NextResponse.json(
        { error: 'One or both listings not found' },
        { status: 404 }
      )
    }

    // Get services from merged listing (use type cast for table not in generated types)
    const { data: mergedServices } = await (adminSupabase as any)
      .from('order_services')
      .select('*')
      .eq('listing_id', merged_listing_id)

    // Get media from merged listing
    const { data: mergedMedia } = await adminSupabase
      .from('media_assets')
      .select('id')
      .eq('listing_id', merged_listing_id)

    // Move services from merged listing to primary listing
    if (mergedServices && mergedServices.length > 0) {
      await (adminSupabase as any)
        .from('order_services')
        .update({ listing_id: primary_listing_id })
        .eq('listing_id', merged_listing_id)
    }

    // Move media from merged listing to primary listing
    if (mergedMedia && mergedMedia.length > 0) {
      await adminSupabase
        .from('media_assets')
        .update({ listing_id: primary_listing_id })
        .eq('listing_id', merged_listing_id)
    }

    // Move photographer assignments
    await adminSupabase
      .from('photographer_assignments')
      .update({ listing_id: primary_listing_id })
      .eq('listing_id', merged_listing_id)

    // Move any messages
    await (adminSupabase as any)
      .from('client_messages')
      .update({ listing_id: primary_listing_id })
      .eq('listing_id', merged_listing_id)

    // Create merge record (use type cast for new table)
    const { data: mergeRecord, error: mergeError } = await (adminSupabase as any)
      .from('merged_orders')
      .insert({
        primary_listing_id,
        merged_listing_id,
        merged_by: staff.id,
        reason: reason || 'Orders merged by admin',
        merged_services: mergedServices || [],
        merged_media_count: mergedMedia?.length || 0,
      })
      .select()
      .single()

    if (mergeError) {
      throw mergeError
    }

    // Mark merged listing as inactive/merged
    await adminSupabase
      .from('listings')
      .update({
        ops_status: 'cancelled',
        notes: `Merged into listing ${primary_listing_id}`,
      })
      .eq('id', merged_listing_id)

    return NextResponse.json({
      success: true,
      merge: mergeRecord,
      stats: {
        services_moved: mergedServices?.length || 0,
        media_moved: mergedMedia?.length || 0,
        primary_listing: primaryListing,
        merged_listing: mergedListing,
      },
    })
  } catch (error) {
    console.error('Error merging listings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/listings/merge - Get merge history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const listing_id = searchParams.get('listing_id')

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Build query (use type cast for new table)
    let query = (adminSupabase as any)
      .from('merged_orders')
      .select(`
        id,
        primary_listing_id,
        merged_listing_id,
        merged_at,
        reason,
        merged_services,
        merged_media_count,
        merged_by
      `)
      .order('merged_at', { ascending: false })

    if (listing_id) {
      query = query.or(`primary_listing_id.eq.${listing_id},merged_listing_id.eq.${listing_id}`)
    }

    const { data: merges, error } = await query.limit(50)

    if (error) {
      throw error
    }

    return NextResponse.json({ merges })
  } catch (error) {
    console.error('Error fetching merge history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/listings/merge - Undo a merge (restore merged listing)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mergeId = searchParams.get('id')

    if (!mergeId) {
      return NextResponse.json({ error: 'Merge ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is staff
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Get merge record (use type cast for new table)
    const { data: merge } = await (adminSupabase as any)
      .from('merged_orders')
      .select('*')
      .eq('id', mergeId)
      .single()

    if (!merge) {
      return NextResponse.json({ error: 'Merge record not found' }, { status: 404 })
    }

    // Restore the merged listing
    await adminSupabase
      .from('listings')
      .update({
        ops_status: 'pending',
        notes: 'Restored after merge undo',
      })
      .eq('id', merge.merged_listing_id)

    // Move services back (based on stored merged_services)
    if (merge.merged_services && merge.merged_services.length > 0) {
      const serviceIds = merge.merged_services.map((s: any) => s.id)
      await (adminSupabase as any)
        .from('order_services')
        .update({ listing_id: merge.merged_listing_id })
        .in('id', serviceIds)
    }

    // Delete merge record
    await (adminSupabase as any)
      .from('merged_orders')
      .delete()
      .eq('id', mergeId)

    return NextResponse.json({
      success: true,
      message: 'Merge undone. Services restored to original listing.',
      restored_listing_id: merge.merged_listing_id,
    })
  } catch (error) {
    console.error('Error undoing merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
