import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
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
      .eq('email', user.email!)
      .eq('is_active', true)
      .single()

    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get filter parameters
    const { searchParams } = new URL(request.url)
    const photographerId = searchParams.get('photographer_id')

    // Build query for ready_for_qc and in_qc listings
    let query = supabase
      .from('listings')
      .select(`
        id,
        address,
        city,
        state,
        ops_status,
        is_rush,
        scheduled_at,
        delivered_at,
        updated_at,
        photographer_id,
        media_assets (
          id,
          qc_status
        )
      `)
      .in('ops_status', ['ready_for_qc', 'in_qc'])
      .order('is_rush', { ascending: false })
      .order('updated_at', { ascending: true })

    if (photographerId) {
      query = query.eq('photographer_id', photographerId)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      throw listingsError
    }

    // Get unique photographer IDs
    const photographerIds = [...new Set(listings?.map(l => l.photographer_id).filter(Boolean) as string[])]

    // Get photographer/staff details
    const { data: photographers } = photographerIds.length > 0
      ? await supabase
          .from('staff')
          .select('id, name')
          .in('id', photographerIds)
      : { data: [] }

    // Calculate priority score and time metrics for each listing
    const priorityQueue = listings?.map(listing => {
      const now = new Date()
      const updatedAt = new Date(listing.updated_at)
      const hoursWaiting = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60))

      // Calculate priority score
      // Rush jobs get +100, hours waiting adds points
      let priorityScore = hoursWaiting
      if (listing.is_rush) {
        priorityScore += 100
      }
      if (listing.ops_status === 'in_qc') {
        priorityScore += 50 // Boost in-progress items
      }

      // Determine priority level
      let priorityLevel: 'high' | 'medium' | 'low'
      if (listing.is_rush && hoursWaiting > 2) {
        priorityLevel = 'high'
      } else if (hoursWaiting > 4) {
        priorityLevel = 'medium'
      } else {
        priorityLevel = 'low'
      }

      const photographer = photographers?.find(p => p.id === listing.photographer_id)

      return {
        ...listing,
        photographer,
        priorityScore,
        priorityLevel,
        hoursWaiting,
      }
    }) || []

    // Sort by priority score (highest first)
    priorityQueue.sort((a, b) => b.priorityScore - a.priorityScore)

    return NextResponse.json({
      queue: priorityQueue,
      total: priorityQueue.length,
    })
  } catch (error) {
    console.error('Error fetching QC queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
