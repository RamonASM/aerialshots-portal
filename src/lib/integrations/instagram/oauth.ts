// Instagram OAuth flow via Facebook Login
// Documentation: https://developers.facebook.com/docs/instagram-api/getting-started

const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
]

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface LongLivedTokenResponse {
  access_token: string
  token_type: string
  expires_in: number // Usually 60 days
}

interface InstagramBusinessAccount {
  id: string
  name: string
  username: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
}

// Get the OAuth URL to redirect users to
export function getOAuthUrl(state: string): string {
  const clientId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`

  if (!clientId) {
    throw new Error('META_APP_ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
    state,
  })

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Meta app credentials not configured')
  }

  const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Token exchange error:', error)
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

// Exchange short-lived token for long-lived token
export async function getLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Meta app credentials not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`)

  if (!response.ok) {
    const error = await response.text()
    console.error('Long-lived token error:', error)
    throw new Error('Failed to get long-lived token')
  }

  return response.json()
}

// Get Instagram Business Account ID from Facebook Page
export async function getInstagramBusinessAccount(
  accessToken: string,
  facebookPageId: string
): Promise<InstagramBusinessAccount | null> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${facebookPageId}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}&access_token=${accessToken}`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.instagram_business_account || null
}

// Get user's Facebook Pages
export async function getFacebookPages(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name&access_token=${accessToken}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch Facebook pages')
  }

  const data = await response.json()
  return data.data || []
}

// Refresh a long-lived token (tokens can be refreshed within 60 days)
export async function refreshToken(longLivedToken: string): Promise<LongLivedTokenResponse> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Meta app credentials not configured')
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: longLivedToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return response.json()
}

// Check if OAuth is properly configured
export function isInstagramOAuthConfigured(): boolean {
  return !!(
    process.env.META_APP_ID &&
    process.env.META_APP_SECRET
  )
}
