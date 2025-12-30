/**
 * Canva OAuth Utilities
 *
 * Helper functions for managing Canva OAuth state and tokens
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { CanvaTokens, getAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken } from './client'

// Store OAuth state in database for CSRF protection
export interface CanvaOAuthState {
  id: string
  agent_id: string
  state: string
  redirect_after?: string
  expires_at: string
  created_at: string
}

/**
 * Create OAuth state for authorization flow
 */
export async function createOAuthState(
  agentId: string,
  redirectAfter?: string
): Promise<{ authUrl: string; state: string }> {
  const supabase = createAdminClient()
  const state = crypto.randomUUID()

  // Store state in database (expires in 10 minutes)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('canva_oauth_states')
    .insert({
      agent_id: agentId,
      state,
      redirect_after: redirectAfter,
      expires_at: expiresAt.toISOString(),
    })

  const authUrl = getAuthorizationUrl(state)

  return { authUrl, state }
}

/**
 * Validate OAuth state and get agent ID
 */
export async function validateOAuthState(
  state: string
): Promise<{ agentId: string; redirectAfter?: string } | null> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('canva_oauth_states')
    .select('agent_id, redirect_after, expires_at')
    .eq('state', state)
    .single()

  if (error || !data) {
    return null
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    // Clean up expired state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('canva_oauth_states')
      .delete()
      .eq('state', state)

    return null
  }

  // Delete used state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('canva_oauth_states')
    .delete()
    .eq('state', state)

  return {
    agentId: data.agent_id,
    redirectAfter: data.redirect_after,
  }
}

/**
 * Store Canva tokens for an agent
 */
export async function storeAgentTokens(
  agentId: string,
  tokens: CanvaTokens,
  canvaUserId?: string
): Promise<boolean> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('agent_integrations')
    .upsert({
      agent_id: agentId,
      integration_type: 'canva',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null,
      external_user_id: canvaUserId,
      metadata: { scope: tokens.scope },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'agent_id,integration_type',
    })

  return !error
}

/**
 * Get Canva tokens for an agent
 */
export async function getAgentTokens(agentId: string): Promise<CanvaTokens | null> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('agent_integrations')
    .select('access_token, refresh_token, expires_at, metadata')
    .eq('agent_id', agentId)
    .eq('integration_type', 'canva')
    .single()

  if (error || !data) {
    return null
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: 0,
    token_type: 'Bearer',
    scope: data.metadata?.scope || '',
    expires_at: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
  }
}

/**
 * Refresh agent's Canva tokens if expired
 */
export async function refreshAgentTokensIfNeeded(
  agentId: string
): Promise<CanvaTokens | null> {
  const tokens = await getAgentTokens(agentId)

  if (!tokens) {
    return null
  }

  // Check if expired (with 5 minute buffer)
  const now = Date.now()
  const expiresAt = tokens.expires_at || 0

  if (expiresAt - now > 300000) {
    // Not expired, return current tokens
    return tokens
  }

  // Refresh tokens
  try {
    const newTokens = await refreshAccessToken(tokens.refresh_token)

    // Store updated tokens
    await storeAgentTokens(agentId, newTokens)

    return newTokens
  } catch (error) {
    console.error('Failed to refresh Canva tokens:', error)
    return null
  }
}

/**
 * Disconnect Canva integration for an agent
 */
export async function disconnectCanva(agentId: string): Promise<boolean> {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('agent_integrations')
    .delete()
    .eq('agent_id', agentId)
    .eq('integration_type', 'canva')

  return !error
}

/**
 * Check if agent has Canva connected
 */
export async function isCanvaConnected(agentId: string): Promise<boolean> {
  const tokens = await getAgentTokens(agentId)
  return tokens !== null
}
