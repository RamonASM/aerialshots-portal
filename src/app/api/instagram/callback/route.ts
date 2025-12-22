import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getFacebookPages,
  getInstagramBusinessAccount,
} from '@/lib/integrations/instagram/oauth'
import { encryptToken } from '@/lib/integrations/instagram/encryption'

// GET - Handle OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle error from Facebook
  if (error) {
    console.error('Instagram OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/settings/instagram?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings/instagram?error=Missing authorization code`
    )
  }

  try {
    // Decode state to get agentId
    let agentId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      agentId = stateData.agentId

      // Check timestamp (expire after 10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return NextResponse.redirect(
          `${baseUrl}/settings/instagram?error=Authorization expired. Please try again.`
        )
      }
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/settings/instagram?error=Invalid state parameter`
      )
    }

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code)
    const shortLivedToken = tokenResponse.access_token

    // Get long-lived token
    const longLivedResponse = await getLongLivedToken(shortLivedToken)
    const accessToken = longLivedResponse.access_token
    const expiresIn = longLivedResponse.expires_in // seconds

    // Get Facebook pages
    const pages = await getFacebookPages(accessToken)

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/settings/instagram?error=No Facebook pages found. Please connect a Facebook page to your Instagram account.`
      )
    }

    // Find Instagram Business Account
    let instagramAccount = null
    let facebookPageId = null

    for (const page of pages) {
      const igAccount = await getInstagramBusinessAccount(accessToken, page.id)
      if (igAccount) {
        instagramAccount = igAccount
        facebookPageId = page.id
        break
      }
    }

    if (!instagramAccount) {
      return NextResponse.redirect(
        `${baseUrl}/settings/instagram?error=No Instagram Business account found. Please connect your Instagram to a Facebook page.`
      )
    }

    // Save connection to database
    const supabase = createAdminClient()
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // Encrypt the token before storing - NEVER store plaintext tokens
    let encryptedToken: string
    try {
      encryptedToken = encryptToken(accessToken)
    } catch (encryptError) {
      console.error('Failed to encrypt token:', encryptError)
      // Security: Never fall back to plaintext storage
      return NextResponse.redirect(
        `${baseUrl}/settings/instagram?error=Token encryption failed. Please contact support.`
      )
    }

    const { error: insertError } = await supabase
      .from('instagram_connections')
      .upsert({
        agent_id: agentId,
        instagram_user_id: instagramAccount.id,
        instagram_username: instagramAccount.username,
        account_type: 'business',
        access_token_encrypted: encryptedToken,
        token_expires_at: tokenExpiresAt,
        facebook_page_id: facebookPageId,
        status: 'active',
      }, {
        onConflict: 'agent_id',
      })

    if (insertError) {
      console.error('Error saving Instagram connection:', insertError)
      return NextResponse.redirect(
        `${baseUrl}/settings/instagram?error=Failed to save connection`
      )
    }

    // Success - redirect with success message
    return NextResponse.redirect(
      `${baseUrl}/settings/instagram?success=true&username=${encodeURIComponent(instagramAccount.username)}`
    )
  } catch (err) {
    console.error('Instagram callback error:', err)
    return NextResponse.redirect(
      `${baseUrl}/settings/instagram?error=Connection failed. Please try again.`
    )
  }
}
