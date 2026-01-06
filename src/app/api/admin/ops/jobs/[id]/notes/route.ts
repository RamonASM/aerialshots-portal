import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

type NoteType = 'general' | 'internal' | 'client_visible' | 'photographer' | 'editor' | 'qc' | 'scheduling' | 'issue' | 'resolution'

interface NoteInput {
  content: string
  note_type?: NoteType
  is_pinned?: boolean
  is_important?: boolean
  mentions?: string[]
  attachments?: { url: string; name: string; type: string }[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const noteType = searchParams.get('note_type')
    const pinnedOnly = searchParams.get('pinned_only') === 'true'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('job_notes')
      .select(`
        *,
        author:staff!job_notes_author_id_fkey(id, name, email, avatar_url)
      `)
      .eq('listing_id', listingId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (noteType) {
      query = query.eq('note_type', noteType as NoteType)
    }

    if (pinnedOnly) {
      query = query.eq('is_pinned', true)
    }

    const { data: notes, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ notes: [] })
      }
      throw error
    }

    // Get note counts by type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allNotes } = await (supabase as any)
      .from('job_notes')
      .select('note_type')
      .eq('listing_id', listingId)

    const typeCounts: Record<string, number> = {}
    allNotes?.forEach((n: { note_type: string }) => {
      typeCounts[n.note_type] = (typeCounts[n.note_type] || 0) + 1
    })

    return NextResponse.json({
      notes: notes || [],
      counts: {
        total: allNotes?.length || 0,
        byType: typeCounts,
      },
    })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body: NoteInput = await request.json()

    if (!body.content) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    // Create note
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: note, error } = await (supabase as any)
      .from('job_notes')
      .insert({
        listing_id: listingId,
        author_id: access.id,
        content: body.content,
        note_type: body.note_type || 'general',
        is_pinned: body.is_pinned || false,
        is_important: body.is_important || false,
        mentions: body.mentions || [],
        attachments: body.attachments || [],
      })
      .select(`
        *,
        author:staff!job_notes_author_id_fkey(id, name, email, avatar_url)
      `)
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          note: {
            id: crypto.randomUUID(),
            listing_id: listingId,
            author_id: access.id,
            content: body.content,
            note_type: body.note_type || 'general',
            is_pinned: body.is_pinned || false,
            is_important: body.is_important || false,
            created_at: new Date().toISOString(),
          },
        }, { status: 201 })
      }
      throw error
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    if (!body.note_id) {
      return NextResponse.json(
        { error: 'note_id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.content !== undefined) {
      updateData.content = body.content
      updateData.edited_at = new Date().toISOString()
    }
    if (body.note_type !== undefined) updateData.note_type = body.note_type
    if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned
    if (body.is_important !== undefined) updateData.is_important = body.is_important

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: note, error } = await (supabase as any)
      .from('job_notes')
      .update(updateData)
      .eq('id', body.note_id)
      .eq('listing_id', listingId)
      .select(`
        *,
        author:staff!job_notes_author_id_fkey(id, name, email, avatar_url)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('note_id')

    if (!noteId) {
      return NextResponse.json(
        { error: 'note_id is required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_notes')
      .delete()
      .eq('id', noteId)
      .eq('listing_id', listingId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
