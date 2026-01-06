import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAccess } from '@/lib/auth/server-access'

type TaskType = 'general' | 'photo_editing' | 'video_editing' | 'floor_plan' | 'virtual_staging' | 'drone_review' | 'qc_review' | 'delivery' | 'client_followup' | 'reshoot' | 'revision'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'

interface TaskInput {
  listing_id?: string
  order_id?: string
  title: string
  description?: string
  task_type?: TaskType
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string
  assigned_by?: string
  due_date?: string
  parent_task_id?: string
  sort_order?: number
  metadata?: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const listingId = searchParams.get('listing_id')
    const orderId = searchParams.get('order_id')
    const assignedTo = searchParams.get('assigned_to')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const taskType = searchParams.get('task_type')
    const includeCompleted = searchParams.get('include_completed') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('job_tasks')
      .select(`
        *,
        assigned_staff:staff!job_tasks_assigned_to_fkey(id, name, email, avatar_url),
        assigner:staff!job_tasks_assigned_by_fkey(id, name),
        completer:staff!job_tasks_completed_by_fkey(id, name),
        listing:listings(id, address, city, state),
        order:orders(id, created_at)
      `, { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (status) {
      query = query.eq('status', status as TaskStatus)
    }

    if (priority) {
      query = query.eq('priority', priority as TaskPriority)
    }

    if (taskType) {
      query = query.eq('task_type', taskType as TaskType)
    }

    if (!includeCompleted) {
      query = query.not('status', 'in', '("completed","cancelled")')
    }

    const { data: tasks, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty
      if (error.code === '42P01') {
        return NextResponse.json({
          tasks: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        })
      }
      throw error
    }

    // Get stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsQuery = (supabase as any)
      .from('job_tasks')
      .select('status', { count: 'exact' })

    if (listingId) {
      statsQuery.eq('listing_id', listingId)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allTasks } = await (supabase as any)
      .from('job_tasks')
      .select('status')

    const stats = {
      total: allTasks?.length || 0,
      pending: allTasks?.filter((t: { status: string }) => t.status === 'pending').length || 0,
      in_progress: allTasks?.filter((t: { status: string }) => t.status === 'in_progress').length || 0,
      blocked: allTasks?.filter((t: { status: string }) => t.status === 'blocked').length || 0,
      completed: allTasks?.filter((t: { status: string }) => t.status === 'completed').length || 0,
    }

    return NextResponse.json({
      tasks: tasks || [],
      stats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body: TaskInput = await request.json()

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    if (!body.listing_id && !body.order_id) {
      return NextResponse.json(
        { error: 'Either listing_id or order_id is required' },
        { status: 400 }
      )
    }

    // Create task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase as any)
      .from('job_tasks')
      .insert({
        listing_id: body.listing_id,
        order_id: body.order_id,
        title: body.title,
        description: body.description,
        task_type: body.task_type || 'general',
        priority: body.priority || 'medium',
        status: body.status || 'pending',
        assigned_to: body.assigned_to,
        assigned_by: body.assigned_to ? access.id : null,
        due_date: body.due_date,
        parent_task_id: body.parent_task_id,
        sort_order: body.sort_order || 0,
        metadata: (body.metadata || {}) as unknown as Record<string, never>,
      })
      .select(`
        *,
        assigned_staff:staff!job_tasks_assigned_to_fkey(id, name, email, avatar_url),
        assigner:staff!job_tasks_assigned_by_fkey(id, name)
      `)
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          task: {
            id: crypto.randomUUID(),
            ...body,
            created_at: new Date().toISOString(),
          },
        }, { status: 201 })
      }
      throw error
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireStaffAccess()
    const supabase = createAdminClient()

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Task id is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Only include provided fields
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.task_type !== undefined) updateData.task_type = body.task_type
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.status !== undefined) {
      updateData.status = body.status
      // Set completed_by if marking as complete
      if (body.status === 'completed') {
        updateData.completed_by = access.id
      }
    }
    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to
      updateData.assigned_by = access.id
    }
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.blocked_reason !== undefined) updateData.blocked_reason = body.blocked_reason
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase as any)
      .from('job_tasks')
      .update(updateData)
      .eq('id', body.id)
      .select(`
        *,
        assigned_staff:staff!job_tasks_assigned_to_fkey(id, name, email, avatar_url),
        assigner:staff!job_tasks_assigned_by_fkey(id, name),
        completer:staff!job_tasks_completed_by_fkey(id, name)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireStaffAccess()
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Task id is required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('job_tasks')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
