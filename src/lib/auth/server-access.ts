import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notAuthenticated, notAuthorized } from '@/lib/utils/errors'

export type StaffAccessRole =
  | 'admin'
  | 'owner'
  | 'partner'
  | 'photographer'
  | 'videographer'
  | 'qc'
  | 'va'
  | 'editor'
  | 'staff'

export interface StaffAccess {
  id: string
  name: string
  email: string
  role: StaffAccessRole
  source: 'clerk' | 'supabase' | 'bypass'
}

interface IdentityInfo {
  email: string
  name: string
}

const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
)

const authBypassEnabled = Boolean(
  process.env.AUTH_BYPASS === 'true' || process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true'
)

const authBypassEmail = process.env.AUTH_BYPASS_EMAIL?.toLowerCase()
const authBypassRoleEnv = process.env.AUTH_BYPASS_ROLE?.toLowerCase()
const authBypassId = process.env.AUTH_BYPASS_ID || 'bypass-user'

const validBypassRoles: StaffAccessRole[] = [
  'admin',
  'owner',
  'partner',
  'photographer',
  'videographer',
  'qc',
  'va',
  'editor',
  'staff',
]

function normalizeName(first?: string | null, last?: string | null, fallback?: string) {
  const name = [first, last].filter(Boolean).join(' ').trim()
  if (name) return name
  if (fallback) return fallback
  return 'User'
}

async function getClerkIdentity(): Promise<IdentityInfo | null> {
  if (!clerkConfigured) return null

  try {
    const user = await currentUser()
    if (!user) return null

    const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()
    if (!email) return null

    return {
      email,
      name: normalizeName(user.firstName, user.lastName, email.split('@')[0]),
    }
  } catch {
    return null
  }
}

async function getSupabaseIdentity(): Promise<IdentityInfo | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) return null

  const email = user.email.toLowerCase()
  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : email.split('@')[0]

  return { email, name }
}

async function lookupStaffOrPartner(email: string): Promise<Omit<StaffAccess, 'source'> | null> {
  const supabase = createAdminClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, role, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  if (staff) {
    return {
      id: staff.id,
      name: staff.name || email.split('@')[0],
      email: staff.email,
      role: (staff.role as StaffAccessRole) || 'staff',
    }
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('id, name, email, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  if (partner) {
    return {
      id: partner.id,
      name: partner.name || email.split('@')[0],
      email: partner.email,
      role: 'partner',
    }
  }

  return null
}

async function getBypassAccess(): Promise<StaffAccess | null> {
  if (!authBypassEnabled) return null

  const email = authBypassEmail || 'bypass@aerialshots.media'
  const role = validBypassRoles.includes(authBypassRoleEnv as StaffAccessRole)
    ? (authBypassRoleEnv as StaffAccessRole)
    : 'admin'

  try {
    const record = await lookupStaffOrPartner(email)
    if (record) {
      return {
        ...record,
        source: 'bypass',
      }
    }
  } catch {
    // Fall through to static bypass identity
  }

  return {
    id: authBypassId,
    name: 'Bypass User',
    email,
    role,
    source: 'bypass',
  }
}

export async function getStaffAccess(): Promise<StaffAccess | null> {
  let identity = await getClerkIdentity()
  let source: StaffAccess['source'] = 'clerk'

  if (!identity) {
    identity = await getSupabaseIdentity()
    source = 'supabase'
  }

  if (!identity) {
    return await getBypassAccess()
  }

  const record = await lookupStaffOrPartner(identity.email)
  if (!record) {
    return await getBypassAccess()
  }

  return {
    ...record,
    name: record.name || identity.name,
    source,
  }
}

export function hasRequiredRole(
  role: StaffAccessRole | null | undefined,
  requiredRoles?: StaffAccessRole[],
  allowPartnerAdmin: boolean = true
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true

  const normalizedRole = role || 'staff'

  if (requiredRoles.includes(normalizedRole)) return true

  if (normalizedRole === 'admin' || normalizedRole === 'owner') return true

  if (allowPartnerAdmin && normalizedRole === 'partner' && requiredRoles.includes('admin')) {
    return true
  }

  return false
}

export async function requireStaffAccess(
  requiredRoles?: StaffAccessRole[],
  allowPartnerAdmin: boolean = true
): Promise<StaffAccess> {
  const access = await getStaffAccess()

  if (!access) {
    throw notAuthenticated('Staff access required')
  }

  if (!hasRequiredRole(access.role, requiredRoles, allowPartnerAdmin)) {
    const requiredLabel = requiredRoles && requiredRoles.length > 0 ? requiredRoles[0] : undefined
    throw notAuthorized('Insufficient permissions', requiredLabel)
  }

  return access
}
