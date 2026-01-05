import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * TOS version information
 */
export interface TosVersion {
  id: string
  version: string
  effective_date: string
  content_hash: string
  content_url?: string
  created_at: string
}

/**
 * TOS acceptance record
 */
export interface TosAcceptance {
  id: string
  user_email: string
  user_name?: string
  listing_id: string
  tos_version: string
  ip_address?: string
  user_agent?: string
  accepted_at: string
}

/**
 * Database row types (subset of TosVersion)
 */
interface TosVersionRow {
  version: string
}

/**
 * Database row types (subset of TosAcceptance)
 */
interface TosAcceptanceRow {
  tos_version: string
}

/**
 * Actions that require TOS acceptance
 */
export type TosRequiredAction =
  | 'download'
  | 'bulk_download'
  | 'share'
  | 'embed'
  | 'view' // View does not require TOS

/**
 * Actions that require TOS acceptance before proceeding
 */
const TOS_REQUIRED_ACTIONS: TosRequiredAction[] = [
  'download',
  'bulk_download',
  'share',
  'embed',
]

/**
 * Check if an action requires TOS acceptance
 */
export function requiresTosAcceptance(action: TosRequiredAction): boolean {
  return TOS_REQUIRED_ACTIONS.includes(action)
}

/**
 * Get current or specific TOS version
 */
export async function getTosVersion(version?: string): Promise<TosVersion | null> {
  try {
    const supabase = createAdminClient()

    if (version) {
      // Get specific version
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('tos_versions' as any)
        .select('*')
        .eq('version', version)
        .single()
        .returns<TosVersion>()

      if (error || !data) return null
      return data
    }

    // Get current (most recent) version
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('tos_versions' as any)
      .select('*')
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()
      .returns<TosVersion>()

    if (error || !data) return null
    return data
  } catch (error) {
    console.error('[TOS] Error getting version:', error)
    return null
  }
}

/**
 * Check if a user has accepted the current TOS for a listing
 */
export async function checkTosAcceptance(params: {
  user_email: string
  listing_id: string
}): Promise<boolean> {
  const { user_email, listing_id } = params

  try {
    const supabase = createAdminClient()

    // Get current TOS version
    const { data: currentTos } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('tos_versions' as any)
      .select('version')
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()
      .returns<TosVersionRow>()

    if (!currentTos) {
      // No TOS version exists, allow access
      return true
    }

    // Check user's acceptance
    const { data: acceptance } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tos_acceptances' as any)
      .select('tos_version')
      .eq('user_email', user_email)
      .eq('listing_id', listing_id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single()
      .returns<TosAcceptanceRow>()

    if (!acceptance) {
      return false
    }

    // Check if accepted version matches current version
    return acceptance.tos_version === currentTos.version
  } catch (error) {
    console.error('[TOS] Error checking acceptance:', error)
    return false
  }
}

/**
 * Record TOS acceptance
 */
export async function acceptTos(params: {
  user_email: string
  user_name?: string
  listing_id: string
  ip_address?: string
  user_agent?: string
}): Promise<{
  success: boolean
  acceptance?: TosAcceptance
  error?: string
}> {
  const { user_email, user_name, listing_id, ip_address, user_agent } = params

  try {
    const supabase = createAdminClient()

    // Get current TOS version
    const { data: currentTos } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('tos_versions' as any)
      .select('version')
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()
      .returns<TosVersionRow>()

    if (!currentTos) {
      return {
        success: false,
        error: 'No TOS version available.',
      }
    }

    // Record acceptance
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tos_acceptances' as any)
      .insert({
        user_email,
        user_name,
        listing_id,
        tos_version: currentTos.version,
        ip_address,
        user_agent,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single()
      .returns<TosAcceptance>()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to record TOS acceptance.',
      }
    }

    return {
      success: true,
      acceptance: data,
    }
  } catch (error) {
    console.error('[TOS] Error accepting TOS:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get TOS acceptance history for a user
 */
export async function getUserTosHistory(userEmail: string): Promise<TosAcceptance[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tos_acceptances' as any)
      .select('*')
      .eq('user_email', userEmail)
      .order('accepted_at', { ascending: false })
      .returns<TosAcceptance[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[TOS] Error getting history:', error)
    return []
  }
}

/**
 * Get all TOS acceptances for a listing
 */
export async function getListingTosAcceptances(listingId: string): Promise<TosAcceptance[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('tos_acceptances' as any)
      .select('*')
      .eq('listing_id', listingId)
      .order('accepted_at', { ascending: false })
      .returns<TosAcceptance[]>()

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[TOS] Error getting listing acceptances:', error)
    return []
  }
}

/**
 * Check if TOS acceptance is valid for download
 * Used as a gate before allowing media downloads
 */
export async function validateDownloadAccess(params: {
  user_email: string
  listing_id: string
}): Promise<{
  allowed: boolean
  requires_acceptance: boolean
  current_version?: string
}> {
  const { user_email, listing_id } = params

  try {
    const hasAccepted = await checkTosAcceptance({ user_email, listing_id })

    if (hasAccepted) {
      return {
        allowed: true,
        requires_acceptance: false,
      }
    }

    // Get current version for the acceptance modal
    const currentVersion = await getTosVersion()

    return {
      allowed: false,
      requires_acceptance: true,
      current_version: currentVersion?.version,
    }
  } catch (error) {
    console.error('[TOS] Error validating download access:', error)
    // Default to requiring acceptance on error
    return {
      allowed: false,
      requires_acceptance: true,
    }
  }
}
