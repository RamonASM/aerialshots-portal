import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface LeadRequest {
  listing_id: string
  agent_id: string | null
  name: string
  email: string
  phone?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        listing_id: body.listing_id || null,
        agent_id: body.agent_id || null,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        message: body.message || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create lead:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to agent
    // TODO: Add lead to follow-up queue

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
    })
  } catch (error) {
    console.error('Lead submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch leads (for dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('leads')
      .select(`
        *,
        listing:listings(address, city, state)
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    return NextResponse.json({ leads: data })
  } catch (error) {
    console.error('Lead fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
