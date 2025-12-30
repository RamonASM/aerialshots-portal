/**
 * Canva Integration Client
 *
 * OAuth flow and API client for Canva design integration
 */

// Types
export interface CanvaTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
  expires_at?: number
}

export interface CanvaUserProfile {
  id: string
  display_name: string
  email?: string
}

export interface CanvaDesign {
  id: string
  title: string
  thumbnail?: {
    url: string
    width?: number
    height?: number
  }
  created_at: string
  updated_at: string
  urls?: {
    edit_url: string
    view_url: string
  }
}

export interface ListingTemplateData {
  address?: string
  price?: string
  beds?: string
  baths?: string
  sqft?: string
  agentName?: string
  agentPhone?: string
  agentEmail?: string
  brokerageName?: string
  heroImageUrl?: string
  [key: string]: string | undefined
}

// Constants
const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize'
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
const CANVA_API_BASE = 'https://api.canva.com/rest/v1'

// Required scopes for design management
const REQUIRED_SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'profile:read',
]

/**
 * Generate Canva OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.CANVA_CLIENT_ID
  const redirectUri = process.env.CANVA_REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error('Canva client ID or redirect URI not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: REQUIRED_SCOPES.join(' '),
  })

  return `${CANVA_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<CanvaTokens> {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  const redirectUri = process.env.CANVA_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Canva configuration missing')
  }

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${error.error || response.status}`)
  }

  const tokens = await response.json()

  return {
    ...tokens,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<CanvaTokens> {
  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Canva configuration missing')
  }

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${error.error || response.status}`)
  }

  const tokens = await response.json()

  return {
    ...tokens,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(accessToken: string): Promise<CanvaUserProfile> {
  const response = await fetch(`${CANVA_API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (response.status === 429) {
      throw new Error('Rate limited')
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to get user profile: ${error.error || response.status}`)
  }

  const data = await response.json()
  return data.user
}

/**
 * List user's designs
 */
export async function listDesigns(
  accessToken: string,
  options: { limit?: number; continuation?: string } = {}
): Promise<CanvaDesign[]> {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.continuation) params.set('continuation', options.continuation)

  const url = `${CANVA_API_BASE}/designs${params.toString() ? `?${params.toString()}` : ''}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (response.status === 429) {
      throw new Error('Rate limited')
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to list designs: ${error.error || response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Create a design from a template with listing data
 */
export async function createDesignFromTemplate(
  accessToken: string,
  templateId: string,
  data: ListingTemplateData
): Promise<CanvaDesign> {
  // Map listing data to Canva template fields
  const templateData = mapListingToTemplateFields(data)

  const response = await fetch(`${CANVA_API_BASE}/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_type: 'from_template',
      template_id: templateId,
      title: data.address ? `Property Flyer - ${data.address}` : 'Property Flyer',
      data: templateData,
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Template not found')
    }
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (response.status === 429) {
      throw new Error('Rate limited')
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to create design: ${error.error || response.status}`)
  }

  const result = await response.json()
  return result.design
}

/**
 * Get export URL for a design
 */
export async function getDesignExportUrl(
  accessToken: string,
  designId: string,
  format: 'pdf' | 'png' | 'jpg' = 'pdf'
): Promise<string> {
  // Start export job
  const startResponse = await fetch(`${CANVA_API_BASE}/designs/${designId}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format,
    }),
  })

  if (!startResponse.ok) {
    const error = await startResponse.json().catch(() => ({}))
    throw new Error(`Failed to start export: ${error.error || startResponse.status}`)
  }

  const startResult = await startResponse.json()
  const jobId = startResult.job?.id

  // Poll for completion (in real implementation, use webhooks)
  const getResponse = await fetch(`${CANVA_API_BASE}/designs/${designId}/exports/${jobId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!getResponse.ok) {
    throw new Error('Failed to get export status')
  }

  const jobResult = await getResponse.json()

  if (jobResult.job?.status === 'completed' && jobResult.job?.urls?.length > 0) {
    return jobResult.job.urls[0].url
  }

  throw new Error('Export not ready')
}

/**
 * Map listing data to Canva template field names
 */
function mapListingToTemplateFields(data: ListingTemplateData): Record<string, unknown> {
  return {
    // Common template field mappings
    property_address: data.address,
    listing_price: data.price,
    bedrooms: data.beds,
    bathrooms: data.baths,
    square_feet: data.sqft,
    agent_name: data.agentName,
    agent_phone: data.agentPhone,
    agent_email: data.agentEmail,
    brokerage: data.brokerageName,
    // Image fields
    hero_image: data.heroImageUrl
      ? { type: 'image', url: data.heroImageUrl }
      : undefined,
  }
}

/**
 * Canva Client Class
 *
 * Manages authentication and API calls with auto-refresh
 */
export class CanvaClient {
  private tokens: CanvaTokens
  private onTokenRefresh?: (tokens: CanvaTokens) => void

  constructor(tokens: CanvaTokens, onTokenRefresh?: (tokens: CanvaTokens) => void) {
    this.tokens = tokens
    this.onTokenRefresh = onTokenRefresh
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokens.access_token
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    if (!this.tokens.expires_at) return false
    // Consider expired if less than 5 minutes remaining
    return Date.now() >= this.tokens.expires_at - 300000
  }

  /**
   * Ensure valid access token, refreshing if needed
   */
  private async ensureValidToken(): Promise<string> {
    if (this.isTokenExpired() && this.tokens.refresh_token) {
      const newTokens = await refreshAccessToken(this.tokens.refresh_token)
      this.tokens = newTokens
      this.onTokenRefresh?.(newTokens)
    }
    return this.tokens.access_token
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<CanvaUserProfile> {
    const token = await this.ensureValidToken()
    return getUserProfile(token)
  }

  /**
   * List user's designs
   */
  async listDesigns(options?: { limit?: number }): Promise<CanvaDesign[]> {
    const token = await this.ensureValidToken()
    return listDesigns(token, options)
  }

  /**
   * Create design from template with listing data
   */
  async createFromTemplate(
    templateId: string,
    listingData: ListingTemplateData
  ): Promise<CanvaDesign> {
    const token = await this.ensureValidToken()
    return createDesignFromTemplate(token, templateId, listingData)
  }

  /**
   * Get export URL for a design
   */
  async exportDesign(designId: string, format?: 'pdf' | 'png' | 'jpg'): Promise<string> {
    const token = await this.ensureValidToken()
    return getDesignExportUrl(token, designId, format)
  }

  /**
   * Get current tokens
   */
  getTokens(): CanvaTokens {
    return this.tokens
  }
}
