/**
 * Authentication Middleware Utilities
 *
 * Centralized authentication and authorization helpers for API routes.
 * These extract common auth patterns found across 15+ routes into reusable functions.
 */

import { SupabaseClient, User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'
import { notAuthenticated, notAuthorized, resourceNotFound } from '@/lib/utils/errors'

type StaffRole = 'admin' | 'photographer' | 'qc' | 'va' | 'editor'

// Use the actual database types
type StaffRecord = Database['public']['Tables']['staff']['Row']
type AgentRecord = Database['public']['Tables']['agents']['Row']

interface AuthResult {
  user: User
}

interface StaffAuthResult extends AuthResult {
  staff: StaffRecord
}

interface AgentAuthResult extends AuthResult {
  agent: AgentRecord
}

/**
 * Require authenticated user
 * Throws notAuthenticated error if no valid session
 *
 * @example
 * const { user } = await requireAuth(supabase)
 */
export async function requireAuth(
  supabase: SupabaseClient<Database>
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw notAuthenticated()
  }

  return { user }
}

/**
 * Require authenticated staff member
 * Optionally validates specific role requirement
 *
 * @example
 * // Any active staff
 * const { user, staff } = await requireStaff(supabase)
 *
 * // Specific role required
 * const { user, staff } = await requireStaff(supabase, 'admin')
 *
 * // Multiple roles allowed
 * const { user, staff } = await requireStaff(supabase, ['admin', 'qc'])
 */
export async function requireStaff(
  supabase: SupabaseClient<Database>,
  requiredRole?: StaffRole | StaffRole[]
): Promise<StaffAuthResult> {
  const { user } = await requireAuth(supabase)

  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .eq('is_active', true)
    .single()

  if (error || !staff) {
    throw notAuthorized('Staff access required')
  }

  // Check role if specified
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(staff.role as StaffRole)) {
      throw notAuthorized(
        `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`,
        allowedRoles[0]
      )
    }
  }

  return { user, staff: staff as StaffRecord }
}

/**
 * Require authenticated agent (client user)
 * Returns the agent record associated with the authenticated user
 *
 * @example
 * const { user, agent } = await requireAgent(supabase)
 * // agent.id can now be used for credit operations, etc.
 */
export async function requireAgent(
  supabase: SupabaseClient<Database>
): Promise<AgentAuthResult> {
  const { user } = await requireAuth(supabase)

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .single()

  if (error || !agent) {
    throw resourceNotFound('Agent', user.email!)
  }

  return { user, agent: agent as AgentRecord }
}

/**
 * Require staff OR the owning agent
 * Useful for routes that staff can access for any user, but agents can only access their own data
 *
 * @example
 * const { user, agent, isStaff } = await requireStaffOrOwner(supabase, agentId)
 */
export async function requireStaffOrOwner(
  supabase: SupabaseClient<Database>,
  targetAgentId: string
): Promise<{ user: User; agent: AgentRecord; isStaff: boolean }> {
  const { user } = await requireAuth(supabase)

  // Check if user is staff
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email!.toLowerCase())
    .eq('is_active', true)
    .single()

  const isStaff = !!staff

  // Get the target agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', targetAgentId)
    .single()

  if (error || !agent) {
    throw resourceNotFound('Agent', targetAgentId)
  }

  // If not staff, verify ownership
  if (!isStaff) {
    if (agent.email.toLowerCase() !== user.email!.toLowerCase()) {
      throw notAuthorized('You can only access your own data')
    }
  }

  return { user, agent: agent as AgentRecord, isStaff }
}

/**
 * Get staff record for current user (optional - doesn't throw if not staff)
 * Useful when you need to check if user is staff but don't require it
 *
 * @example
 * const staff = await getStaffIfExists(supabase, user.email)
 * if (staff) {
 *   // User is staff, grant extra permissions
 * }
 */
export async function getStaffIfExists(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<StaffRecord | null> {
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single()

  return staff as StaffRecord | null
}

/**
 * Get agent record by email (doesn't require auth)
 * Useful for webhook handlers and service-to-service calls
 *
 * @example
 * const agent = await getAgentByEmail(supabase, 'user@example.com')
 */
export async function getAgentByEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<AgentRecord | null> {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()

  return agent as AgentRecord | null
}

/**
 * Get agent record by ID
 *
 * @example
 * const agent = await getAgentById(supabase, agentId)
 */
export async function getAgentById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<AgentRecord | null> {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  return agent as AgentRecord | null
}

/**
 * Validate ownership of a listing
 * Ensures the user is either staff or the agent who owns the listing
 *
 * @example
 * await validateListingOwnership(supabase, listingId)
 */
export async function validateListingOwnership(
  supabase: SupabaseClient<Database>,
  listingId: string
): Promise<{ user: User; listing: { id: string; agent_id: string | null }; isStaff: boolean }> {
  const { user } = await requireAuth(supabase)

  // Get the listing
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, agent_id')
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    throw resourceNotFound('Listing', listingId)
  }

  // Check if user is staff
  const staff = await getStaffIfExists(supabase, user.email!)
  const isStaff = !!staff

  // If not staff, verify ownership via agent
  if (!isStaff) {
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email!.toLowerCase())
      .single()

    if (!agent || agent.id !== listing.agent_id) {
      throw notAuthorized('You can only access your own listings')
    }
  }

  return { user, listing, isStaff }
}
