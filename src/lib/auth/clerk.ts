/**
 * Clerk Authentication Helpers
 *
 * Utilities for working with Clerk authentication in the ASM Portal.
 * These helpers bridge Clerk users with our database tables.
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type UserRole = 'admin' | 'photographer' | 'videographer' | 'qc' | 'partner' | 'agent' | 'seller'

export interface CurrentUser {
  clerkUserId: string
  email: string
  name: string
  role: UserRole
  userId: string
  userTable: 'agents' | 'staff' | 'partners' | 'sellers'
  imageUrl?: string
}

/**
 * Get the current authenticated user with their database info
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  if (!user) return null

  const metadata = user.publicMetadata as {
    role?: UserRole
    userId?: string
    userTable?: 'agents' | 'staff' | 'partners' | 'sellers'
  }

  // If metadata is complete, return directly
  if (metadata.role && metadata.userId && metadata.userTable) {
    return {
      clerkUserId: userId,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
      role: metadata.role,
      userId: metadata.userId,
      userTable: metadata.userTable,
      imageUrl: user.imageUrl,
    }
  }

  // Fallback: Look up in database
  const email = user.emailAddresses[0]?.emailAddress
  if (!email) return null

  const dbUser = await lookupUserByEmail(email)
  if (!dbUser) return null

  return {
    clerkUserId: userId,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || dbUser.name,
    role: dbUser.role as UserRole,
    userId: dbUser.id,
    userTable: dbUser.table as 'agents' | 'staff' | 'partners' | 'sellers',
    imageUrl: user.imageUrl,
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require specific role(s)
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}

/**
 * Check if current user is staff
 */
export async function isStaff(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const staffRoles: UserRole[] = ['admin', 'photographer', 'videographer', 'qc', 'partner']
  return staffRoles.includes(user.role)
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Look up a user in the database by email
 */
async function lookupUserByEmail(email: string): Promise<{
  id: string
  name: string
  role: string
  table: string
} | null> {
  const supabase = createAdminClient()
  const emailLower = email.toLowerCase()

  // Check partners
  const { data: partner } = await supabase
    .from('partners')
    .select('id, name')
    .eq('email', emailLower)
    .single()

  if (partner) {
    return { id: partner.id, name: partner.name, role: 'partner', table: 'partners' }
  }

  // Check staff
  const { data: staffMember } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('email', emailLower)
    .single()

  if (staffMember) {
    return {
      id: staffMember.id,
      name: staffMember.name,
      role: staffMember.role || 'staff',
      table: 'staff',
    }
  }

  // Check agents
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name')
    .eq('email', emailLower)
    .single()

  if (agent) {
    return { id: agent.id, name: agent.name, role: 'agent', table: 'agents' }
  }

  // Check sellers
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, name')
    .eq('email', emailLower)
    .single()

  if (seller) {
    return { id: seller.id, name: seller.name, role: 'seller', table: 'sellers' }
  }

  return null
}

/**
 * Get database record for Clerk user
 */
export async function getDbRecordForClerkUser(clerkUserId: string): Promise<{
  id: string
  email: string
  name: string
  role: string
  table: string
} | null> {
  const supabase = createAdminClient()

  // Check partners
  const { data: partner } = await supabase
    .from('partners')
    .select('id, email, name')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (partner) {
    return { ...partner, role: 'partner', table: 'partners' }
  }

  // Check staff
  const { data: staffMember } = await supabase
    .from('staff')
    .select('id, email, name, role')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (staffMember) {
    return { ...staffMember, role: staffMember.role || 'staff', table: 'staff' }
  }

  // Check agents
  const { data: agent } = await supabase
    .from('agents')
    .select('id, email, name')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (agent) {
    return { ...agent, role: 'agent', table: 'agents' }
  }

  // Check sellers
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, email, name')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (seller) {
    return { ...seller, role: 'seller', table: 'sellers' }
  }

  return null
}
