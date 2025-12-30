/**
 * Canva OAuth Callback
 *
 * Handle OAuth callback from Canva
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getUserProfile } from '@/lib/integrations/canva/client'
import { validateOAuthState, storeAgentTokens } from '@/lib/integrations/canva/oauth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'

  // Handle error from Canva
  if (error) {
    console.error('Canva OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=canva_denied`, baseUrl)
    )
  }

  // Validate required params
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=canva_invalid`, baseUrl)
    )
  }

  // Validate state and get agent ID
  const stateData = await validateOAuthState(state)

  if (!stateData) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=canva_expired`, baseUrl)
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get Canva user profile
    const profile = await getUserProfile(tokens.access_token)

    // Store tokens for agent
    await storeAgentTokens(stateData.agentId, tokens, profile.id)

    // Redirect to success page
    const redirectUrl = stateData.redirectAfter || '/dashboard/settings'
    return NextResponse.redirect(
      new URL(`${redirectUrl}?canva=connected`, baseUrl)
    )
  } catch (err) {
    console.error('Canva OAuth callback error:', err)
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=canva_failed`, baseUrl)
    )
  }
}
