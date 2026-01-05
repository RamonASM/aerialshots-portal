import { createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'
import { sendProofingShareEmail } from '@/lib/email/resend'
import type {
  ProofingSessionRow,
  ProofingSelectionRow,
  ProofingCommentRow,
  ProofingShareRow,
} from '@/lib/supabase/types-custom'

export interface ProofingSession {
  id: string
  listing_id: string
  agent_id: string
  status: 'active' | 'finalized' | 'expired'
  token: string
  expires_at: string
  created_at: string
  finalized_at?: string
  max_selections?: number
  photos?: ProofingPhoto[]
}

export interface ProofingPhoto {
  id: string
  url: string
  thumbnail_url: string
  filename?: string
  order?: number
}

export interface PhotoSelection {
  id: string
  session_id: string
  photo_id: string
  is_favorite: boolean
  selection_order?: number
  selected_at: string
  comments?: PhotoComment[]
}

export interface PhotoComment {
  id: string
  session_id: string
  photo_id: string
  comment_text: string
  pin_x?: number
  pin_y?: number
  is_pinned: boolean
  author_type: 'agent' | 'seller'
  author_name?: string
  created_at: string
}

export interface CreateSessionParams {
  listing_id: string
  agent_id: string
  photo_ids: string[]
  max_selections?: number
  expires_in_days?: number
}

export interface CreateSessionResult {
  success: boolean
  session?: ProofingSession
  error?: string
}

export interface SelectPhotoOptions {
  is_favorite?: boolean
  check_duplicate?: boolean
  enforce_limit?: boolean
  selection_order?: number
}

export interface SelectPhotoResult {
  success: boolean
  selection?: PhotoSelection
  error?: string
}

export interface AddCommentParams {
  session_id: string
  photo_id: string
  comment_text: string
  pin_x?: number
  pin_y?: number
  author_type?: 'agent' | 'seller'
  author_name?: string
}

export interface AddCommentResult {
  success: boolean
  comment?: PhotoComment
  error?: string
}

export interface FinalizeOptions {
  require_selections?: boolean
}

export interface FinalizeResult {
  success: boolean
  session?: ProofingSession
  error?: string
}

export interface ShareWithSellerParams {
  session_id: string
  seller_email: string
  seller_name: string
  permissions?: {
    can_comment?: boolean
    can_select?: boolean
  }
  send_email?: boolean
}

export interface ShareResult {
  success: boolean
  share_link?: string
  share_token?: string
  email_sent?: boolean
  error?: string
}

const DEFAULT_EXPIRY_DAYS = 7

/**
 * Create a new proofing session for photo selection
 */
export async function createProofingSession(
  params: CreateSessionParams
): Promise<CreateSessionResult> {
  const { listing_id, agent_id, photo_ids, max_selections, expires_in_days } = params

  if (!photo_ids || photo_ids.length === 0) {
    return {
      success: false,
      error: 'At least one photo is required to create a proofing session.',
    }
  }

  try {
    const supabase = createAdminClient()
    const token = nanoid(24)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || DEFAULT_EXPIRY_DAYS))

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
      .insert({
        listing_id,
        agent_id,
        status: 'active',
        token,
        expires_at: expiresAt.toISOString(),
        max_selections: max_selections || null,
        photo_ids,
      })
      .select()
      .returns<ProofingSessionRow[]>()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create proofing session.',
      }
    }

    return {
      success: true,
      session: data as unknown as ProofingSession,
    }
  } catch (error) {
    console.error('[Proofing] Error creating session:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get a proofing session by token
 */
export async function getProofingSession(token: string): Promise<ProofingSession | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
      .select('*, photos:listing_media(*)')
      .eq('token', token)
      .returns<Array<ProofingSessionRow & { photos?: unknown[] }>>()
      .single()

    if (error || !data) {
      return null
    }

    // Check if expired
    if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
      return null
    }

    return data as unknown as ProofingSession
  } catch (error) {
    console.error('[Proofing] Error getting session:', error)
    return null
  }
}

/**
 * Select a photo in a proofing session
 */
export async function selectPhoto(
  sessionId: string,
  photoId: string,
  options: SelectPhotoOptions = {}
): Promise<SelectPhotoResult> {
  const { is_favorite, check_duplicate, enforce_limit, selection_order } = options

  try {
    const supabase = createAdminClient()

    // Check for duplicate if requested
    if (check_duplicate) {
      const { data: existing } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
        .select('id, photo_id')
        .eq('session_id', sessionId)
        .eq('photo_id', photoId)
        .returns<Array<{ id: string; photo_id: string }>>()

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'This photo is already selected.',
        }
      }
    }

    // Check limit if requested
    if (enforce_limit) {
      const { data: session } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
        .select('max_selections')
        .eq('id', sessionId)
        .returns<Array<{ max_selections: number | null }>>()
        .single()

      if (session?.max_selections) {
        const { count } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)

        if ((count || 0) >= session.max_selections) {
          return {
            success: false,
            error: `Selection limit of ${session.max_selections} photos reached.`,
          }
        }
      }
    }

    // Get next selection order if not provided
    let order = selection_order
    if (order === undefined) {
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      order = (count || 0) + 1
    }

    // Insert selection
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
      .insert({
        session_id: sessionId,
        photo_id: photoId,
        is_favorite: is_favorite || false,
        selection_order: order,
        selected_at: new Date().toISOString(),
      })
      .select()
      .returns<ProofingSelectionRow[]>()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to select photo.',
      }
    }

    return {
      success: true,
      selection: data as unknown as PhotoSelection,
    }
  } catch (error) {
    console.error('[Proofing] Error selecting photo:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Deselect a photo from a proofing session
 */
export async function deselectPhoto(
  sessionId: string,
  photoId: string,
  options: { delete_comments?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Delete comments first if requested
    if (options.delete_comments) {
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_comments' as any)
        .delete()
        .eq('session_id', sessionId)
        .eq('photo_id', photoId)
    }

    // Delete selection
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
      .delete()
      .eq('session_id', sessionId)
      .eq('photo_id', photoId)

    if (error) {
      return {
        success: false,
        error: 'Failed to deselect photo.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Proofing] Error deselecting photo:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Add a comment to a photo
 */
export async function addPhotoComment(params: AddCommentParams): Promise<AddCommentResult> {
  const { session_id, photo_id, comment_text, pin_x, pin_y, author_type, author_name } = params

  // Validate pin coordinates if provided
  if (pin_x !== undefined || pin_y !== undefined) {
    if (
      pin_x === undefined ||
      pin_y === undefined ||
      pin_x < 0 ||
      pin_x > 1 ||
      pin_y < 0 ||
      pin_y > 1
    ) {
      return {
        success: false,
        error: 'Pin coordinate values must be between 0 and 1.',
      }
    }
  }

  try {
    const supabase = createAdminClient()

    const is_pinned = pin_x !== undefined && pin_y !== undefined

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_comments' as any)
      .insert({
        session_id,
        photo_id,
        comment_text,
        pin_x: is_pinned ? pin_x : null,
        pin_y: is_pinned ? pin_y : null,
        is_pinned,
        author_type: author_type || 'agent',
        author_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .returns<ProofingCommentRow[]>()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to add comment.',
      }
    }

    return {
      success: true,
      comment: data as unknown as PhotoComment,
    }
  } catch (error) {
    console.error('[Proofing] Error adding comment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Delete a photo comment
 */
export async function deletePhotoComment(
  commentId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_comments' as any)
      .delete()
      .eq('id', commentId)
      .eq('session_id', sessionId)

    if (error) {
      return {
        success: false,
        error: 'Failed to delete comment.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Proofing] Error deleting comment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get all selections for a session
 */
export async function getSessionSelections(
  sessionId: string,
  options: { include_comments?: boolean } = {}
): Promise<PhotoSelection[]> {
  try {
    const supabase = createAdminClient()

    let query = `*, photo:listing_media(*)`
    if (options.include_comments) {
      query = `*, photo:listing_media(*), comments:proofing_comments(*)`
    }

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
      .select(query)
      .eq('session_id', sessionId)
      .order('selection_order', { ascending: true })
      .returns<Array<ProofingSelectionRow & { photo?: unknown; comments?: unknown[] }>>()

    if (error || !data) {
      return []
    }

    return data as unknown as PhotoSelection[]
  } catch (error) {
    console.error('[Proofing] Error getting selections:', error)
    return []
  }
}

/**
 * Finalize a proofing session
 */
export async function finalizeSession(
  sessionId: string,
  options: FinalizeOptions = {}
): Promise<FinalizeResult> {
  try {
    const supabase = createAdminClient()

    // Check current status first
    const { data: current } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
      .select('status')
      .eq('id', sessionId)
      .returns<Array<{ status: string }>>()
      .single()

    if (current?.status === 'finalized') {
      return {
        success: false,
        error: 'Session is already finalized.',
      }
    }

    // Check selections requirement if needed
    if (options.require_selections) {
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)

      if (!count || count === 0) {
        return {
          success: false,
          error: 'At least one selection is required to finalize.',
        }
      }
    }

    // Update session status
    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .returns<ProofingSessionRow[]>()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to finalize session.',
      }
    }

    return {
      success: true,
      session: data as unknown as ProofingSession,
    }
  } catch (error) {
    console.error('[Proofing] Error finalizing session:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Share a proofing session with a seller
 */
export async function shareSessionWithSeller(
  params: ShareWithSellerParams
): Promise<ShareResult> {
  const { session_id, seller_email, seller_name, permissions, send_email } = params

  try {
    const supabase = createAdminClient()
    const shareToken = nanoid(24)

    const { data, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_shares' as any)
      .insert({
        session_id,
        seller_email,
        seller_name,
        share_token: shareToken,
        can_comment: permissions?.can_comment ?? true,
        can_select: permissions?.can_select ?? false,
        created_at: new Date().toISOString(),
      })
      .select()
      .returns<ProofingShareRow[]>()
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to create share link.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.aerialshots.media'
    const shareLink = `${baseUrl}/proof/${shareToken}`

    // Send email if requested
    let emailSent = false
    if (send_email && seller_email) {
      try {
        // Fetch session with listing and agent details for email
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessionData } = await (supabase as any)
          .from('proofing_sessions')
          .select(`
            id,
            listing:listings(address, city, state),
            agent:agents(name)
          `)
          .eq('id', session_id)
          .single() as { data: { id: string; listing: { address: string; city: string; state: string } | null; agent: { name: string } | null } | null }

        const propertyAddress = sessionData?.listing
          ? `${sessionData.listing.address}, ${sessionData.listing.city}, ${sessionData.listing.state}`
          : 'Your Property'
        const agentName = sessionData?.agent?.name || 'Your Agent'

        await sendProofingShareEmail({
          to: seller_email,
          clientName: seller_name || 'Homeowner',
          agentName,
          propertyAddress,
          proofingUrl: shareLink,
        })
        emailSent = true
      } catch (emailError) {
        // Don't fail the share if email fails - log and continue
        console.error('[Proofing] Failed to send share email:', emailError)
        emailSent = false
      }
    }

    return {
      success: true,
      share_link: shareLink,
      share_token: shareToken,
      email_sent: emailSent,
    }
  } catch (error) {
    console.error('[Proofing] Error sharing session:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get proofing session statistics
 */
export async function getSessionStats(sessionId: string): Promise<{
  total_photos: number
  selected_count: number
  favorite_count: number
  comment_count: number
}> {
  try {
    const supabase = createAdminClient()

    // Get session photo count
    const { data: session } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_sessions' as any)
      .select('photo_ids')
      .eq('id', sessionId)
      .returns<Array<{ photo_ids: string[] }>>()
      .single()

    // Get selection counts
    const { data: selections } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_selections' as any)
      .select('id, is_favorite')
      .eq('session_id', sessionId)
      .returns<Array<{ id: string; is_favorite: boolean }>>()

    // Get comment count
    const { count: commentCount } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('proofing_comments' as any)
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    return {
      total_photos: session?.photo_ids?.length || 0,
      selected_count: selections?.length || 0,
      favorite_count: selections?.filter((s) => s.is_favorite).length || 0,
      comment_count: commentCount || 0,
    }
  } catch (error) {
    console.error('[Proofing] Error getting stats:', error)
    return {
      total_photos: 0,
      selected_count: 0,
      favorite_count: 0,
      comment_count: 0,
    }
  }
}
