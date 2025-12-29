import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ClientFeedbackInsert = Database['public']['Tables']['client_feedback']['Insert']

/**
 * POST /api/feedback
 * Submit client feedback (public - uses share_link_id for auth)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      listing_id,
      share_link_id,
      rating,
      feedback_text,
      category,
      submitted_by_name,
      submitted_by_email,
      is_public,
    } = body

    // Validate required fields
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Get agent_id from listing
    let agentId: string | null = null
    const { data: listing } = await supabase
      .from('listings')
      .select('agent_id')
      .eq('id', listing_id)
      .single()

    if (listing?.agent_id) {
      agentId = listing.agent_id
    }

    // Validate share link if provided
    if (share_link_id) {
      const { data: shareLink, error: linkError } = await supabase
        .from('share_links')
        .select('id, is_active, expires_at, listing_id')
        .eq('id', share_link_id)
        .single()

      if (linkError || !shareLink) {
        return NextResponse.json({ error: 'Invalid share link' }, { status: 400 })
      }

      if (!shareLink.is_active) {
        return NextResponse.json({ error: 'This link is no longer active' }, { status: 410 })
      }

      if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
        return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
      }

      if (shareLink.listing_id !== listing_id) {
        return NextResponse.json({ error: 'Listing ID does not match share link' }, { status: 400 })
      }
    }

    // Check for existing feedback from same email
    if (submitted_by_email) {
      const { data: existingFeedback } = await supabase
        .from('client_feedback')
        .select('id')
        .eq('listing_id', listing_id)
        .eq('submitted_by_email', submitted_by_email)
        .single()

      if (existingFeedback) {
        // Update existing feedback
        const { data: updated, error: updateError } = await supabase
          .from('client_feedback')
          .update({
            rating,
            feedback_text: feedback_text || null,
            category: category || null,
            submitted_by_name: submitted_by_name || null,
            is_public: is_public ?? false,
          })
          .eq('id', existingFeedback.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating feedback:', updateError)
          return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          feedback: updated,
          message: 'Feedback updated',
        })
      }
    }

    // Create new feedback
    const feedbackData: ClientFeedbackInsert = {
      listing_id,
      share_link_id: share_link_id || null,
      agent_id: agentId,
      rating,
      feedback_text: feedback_text || null,
      category: category || null,
      submitted_by_name: submitted_by_name || null,
      submitted_by_email: submitted_by_email || null,
      is_public: is_public ?? false,
    }

    const { data: feedback, error: insertError } = await supabase
      .from('client_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating feedback:', insertError)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback,
      message: 'Feedback submitted',
    })

  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/feedback
 * Get feedback for a listing or agent (auth required for agents/staff)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const listing_id = searchParams.get('listing_id')
    const agent_id = searchParams.get('agent_id')
    const public_only = searchParams.get('public_only') === 'true'

    // Check authentication for non-public queries
    if (!public_only) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Build query
    let query = supabase
      .from('client_feedback')
      .select(`
        *,
        listing:listings(id, address, city, state)
      `)
      .order('created_at', { ascending: false })

    if (listing_id) {
      query = query.eq('listing_id', listing_id)
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (public_only) {
      query = query.eq('is_public', true)
    }

    const { data: feedback, error: listError } = await query

    if (listError) {
      console.error('Error fetching feedback:', listError)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    // Calculate aggregate stats
    const ratings = feedback?.map(f => f.rating) || []
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null

    const ratingCounts = {
      1: ratings.filter(r => r === 1).length,
      2: ratings.filter(r => r === 2).length,
      3: ratings.filter(r => r === 3).length,
      4: ratings.filter(r => r === 4).length,
      5: ratings.filter(r => r === 5).length,
    }

    return NextResponse.json({
      success: true,
      feedback: feedback || [],
      stats: {
        total: ratings.length,
        average: averageRating ? Math.round(averageRating * 10) / 10 : null,
        counts: ratingCounts,
      },
    })

  } catch (error) {
    console.error('Feedback list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
