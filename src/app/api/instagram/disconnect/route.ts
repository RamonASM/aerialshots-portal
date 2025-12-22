import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json()

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update connection status to revoked
    const { error } = await supabase
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
