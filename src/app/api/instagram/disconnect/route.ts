import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabaseClient = await createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { agentId } = await request.json()

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this agent (owns the agent or is staff)
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, email')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError) {
      console.error('[Instagram Disconnect] Agent lookup error:', agentError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const isOwner = agent?.email === user.email
    const isStaff = user.email?.endsWith('@aerialshots.media')

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: 'You do not have permission to disconnect for this agent' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Update connection status to revoked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('instagram_connections')
      .update({
        status: 'revoked' as const,
        access_token_encrypted: null,
      })
      .eq('agent_id', agentId)

    if (error) {
      console.error('Error disconnecting Instagram:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Instagram' },
      { status: 500 }
    )
  }
}
