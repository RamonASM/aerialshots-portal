import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/middleware/auth'
import {
  handleApiError,
  badRequest,
  databaseError,
} from '@/lib/utils/errors'

/**
 * Create a new care task
 * POST /api/care/tasks
 *
 * Requires staff authentication - only ASM team can create care tasks
 */
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require staff authentication
    await requireStaff(supabase)

    const body = await request.json()
    const {
      agent_id,
      listing_id,
      task_type,
      priority = 0,
      due_at,
    } = body

    if (!task_type) {
      throw badRequest('Task type is required')
    }

    if (!agent_id && !listing_id) {
      throw badRequest('Agent ID or Listing ID is required')
    }

    // If only listing_id provided, get the agent_id
    let finalAgentId = agent_id
    if (!finalAgentId && listing_id) {
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('agent_id')
        .eq('id', listing_id)
        .single()

      if (listingError || !listing) {
        throw badRequest('Invalid listing ID')
      }

      finalAgentId = listing.agent_id
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
      throw databaseError(error, 'creating care task')
    }

    return NextResponse.json({ task })
  })
}

/**
 * Get care tasks with filters
 * GET /api/care/tasks
 *
 * Requires staff authentication - only ASM team can view all care tasks
 */
export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()

    // Require staff authentication
    await requireStaff(supabase)

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
      throw databaseError(error, 'fetching care tasks')
    }

    return NextResponse.json({ tasks })
  })
}
