import { NextRequest, NextResponse } from 'next/server'
import { getOAuthUrl, isInstagramOAuthConfigured } from '@/lib/integrations/instagram/oauth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Start Instagram OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Check if OAuth is configured
    if (!isInstagramOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Instagram OAuth is not configured' },
        { status: 503 }
      )
    }

    // Get agentId from query params
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      )
    }

    // Verify agent exists
    const supabase = createAdminClient()
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Create state token (includes agentId for callback)
    const state = Buffer.from(JSON.stringify({
      agentId,
      timestamp: Date.now(),
    })).toString('base64')

    // Get OAuth URL
    const authUrl = getOAuthUrl(state)

    // Redirect to Facebook OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Instagram connect error:', error)
    return NextResponse.json(
      { error: 'Failed to start Instagram connection' },
      { status: 500 }
    )
  }
}
