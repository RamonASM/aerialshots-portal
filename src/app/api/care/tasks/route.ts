import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Create a new care task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      agent_id,
      listing_id,
      task_type,
      priority = 0,
      due_at,
    } = body

    if (!task_type) {
      return NextResponse.json(
        { error: 'Task type is required' },
        { status: 400 }
      )
    }

    if (!agent_id && !listing_id) {
      return NextResponse.json(
        { error: 'Agent ID or Listing ID is required' },
        { status: 400 }
      )
    }

    // If only listing_id provided, get the agent_id
    let finalAgentId = agent_id
    if (!finalAgentId && listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('agent_id')
        .eq('id', listing_id)
        .single()

      finalAgentId = listing?.agent_id
    }

    // Create the task
    const { data: task, error } = await supabase
      .from('care_tasks')
      .insert({
        agent_id: finalAgentId,
        listing_id,
        task_type,
        status: 'pending',
        priority,
        due_at: due_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating care task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Care task API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get care tasks with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const task_type = searchParams.get('task_type')
    const agent_id = searchParams.get('agent_id')

    let query = supabase.from('care_tasks').select('*')

    if (status) {
      query = query.eq('status', status)
    }
    if (task_type) {
      query = query.eq('task_type', task_type)
    }
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    query = query
      .order('priority', { ascending: false })
      .order('due_at', { ascending: true })

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching care tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Care task API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
