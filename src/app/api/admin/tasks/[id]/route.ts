import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireStaffAccess()
    const supabase = createAdminClient()

    // Get task with related data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase as any)
      .from('job_tasks')
      .select(`
        *,
        assigned_staff:staff!job_tasks_assigned_to_fkey(id, name, email, avatar_url),
        assigner:staff!job_tasks_assigned_by_fkey(id, name),
        completer:staff!job_tasks_completed_by_fkey(id, name),
        listing:listings(id, address, city, state),
        order:orders(id, created_at),
        parent_task:job_tasks!job_tasks_parent_task_id_fkey(id, title, status),
        subtasks:job_tasks!job_tasks_parent_task_id_fkey(id, title, status, priority, assigned_to)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Get comments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comments } = await (supabase as any)
      .from('task_comments')
      .select(`
        *,
        author:staff(id, name, email, avatar_url)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: true })

    // Get history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: history } = await (supabase as any)
      .from('task_history')
      .select(`
        *,
        changed_by_staff:staff(id, name)
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      task,
      comments: comments || [],
      history: history || [],
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// Add comment to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    if (!body.content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Create comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error } = await (supabase as any)
      .from('task_comments')
      .insert({
        task_id: id,
        author_id: access.id,
        content: body.content,
        mentions: body.mentions || [],
        attachments: body.attachments || [],
      })
      .select(`
        *,
        author:staff(id, name, email, avatar_url)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
