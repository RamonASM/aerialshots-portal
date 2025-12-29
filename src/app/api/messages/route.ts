import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ClientMessageInsert = Database['public']['Tables']['client_messages']['Insert']

/**
 * POST /api/messages
 * Create a new message (public for sellers via share_link_id, auth required for agents)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      listing_id,
      share_link_id,
      content,
      sender_name,
      sender_email,
      attachments,
    } = body

    // Validate required fields
    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Determine sender type
    let senderType: 'seller' | 'agent' | 'admin' = 'seller'
    let senderId: string | null = null
    let senderNameFinal = sender_name || 'Anonymous'
    let senderEmailFinal = sender_email || null

    // Check if authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user is agent
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name, email')
        .eq('email', user.email!)
        .single()

      if (agent) {
        senderType = 'agent'
        senderId = agent.id
        senderNameFinal = agent.name
        senderEmailFinal = agent.email
      } else {
        // Check if user is staff/admin
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name, email, role')
          .eq('email', user.email!)
          .single()

        if (staff) {
          senderType = 'admin'
          senderId = staff.id
          senderNameFinal = staff.name
          senderEmailFinal = staff.email
        }
      }
    } else {
      // For unauthenticated users (sellers), validate share link
      if (!share_link_id) {
        return NextResponse.json(
          { error: 'share_link_id is required for unauthenticated users' },
          { status: 400 }
        )
      }

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

      // Require name and email for sellers
      if (!sender_name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      }
    }

    // Create message
    const messageData: ClientMessageInsert = {
      listing_id,
      share_link_id: share_link_id || null,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderNameFinal,
      sender_email: senderEmailFinal,
      content: content.trim(),
      attachments: attachments || [],
    }

    const { data: message, error: insertError } = await supabase
      .from('client_messages')
      .insert(messageData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating message:', insertError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message,
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/messages
 * Get messages for a listing (auth required for agents/staff, or share_link_id for sellers)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const listing_id = searchParams.get('listing_id')
    const share_link_id = searchParams.get('share_link_id')
    const unread_only = searchParams.get('unread_only') === 'true'

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // For unauthenticated users, require share_link_id
      if (!share_link_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Validate share link
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

    // Build query
    let query = supabase
      .from('client_messages')
      .select('*')
      .eq('listing_id', listing_id)
      .order('created_at', { ascending: true })

    if (unread_only) {
      query = query.is('read_at', null)
    }

    const { data: messages, error: listError } = await query

    if (listError) {
      console.error('Error fetching messages:', listError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    })

  } catch (error) {
    console.error('Messages list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/messages
 * Mark messages as read (auth required)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message_ids, listing_id, mark_all } = body

    if (!listing_id && !message_ids?.length) {
      return NextResponse.json(
        { error: 'Either listing_id with mark_all, or message_ids is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('client_messages')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)

    if (mark_all && listing_id) {
      // Mark all unread messages for a listing
      query = query.eq('listing_id', listing_id)
    } else if (message_ids?.length) {
      // Mark specific messages as read
      query = query.in('id', message_ids)
    }

    const { data: updated, error: updateError } = await query.select()

    if (updateError) {
      console.error('Error marking messages as read:', updateError)
      return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: updated?.length || 0,
    })

  } catch (error) {
    console.error('Messages update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
