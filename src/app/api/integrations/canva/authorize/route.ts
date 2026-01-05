/**
 * Canva OAuth Authorization
 *
 * Start OAuth flow to connect Canva account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOAuthState } from '@/lib/integrations/canva/oauth'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  // Get agent ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = await (supabase as any)
    .from('agents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Get optional redirect after auth
  const redirectAfter = request.nextUrl.searchParams.get('redirect') || undefined

  try {
    const { authUrl } = await createOAuthState(agent.id, redirectAfter)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error creating Canva OAuth state:', error)
    return NextResponse.json(
      { error: 'Failed to start Canva authorization' },
      { status: 500 }
    )
  }
}
