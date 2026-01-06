import { createAdminClient } from '@/lib/supabase/admin'

export type PartnerRole = 'photographer' | 'videographer' | 'qc' | 'va'

export const VALID_PARTNER_ROLES: PartnerRole[] = ['photographer', 'videographer', 'qc', 'va']

export interface PartnerRoleStatus {
  role: PartnerRole
  isActive: boolean
  hasDesignatedStaff: boolean
  designatedStaffId: string | null
  designatedStaffName: string | null
  isOverridden: boolean
  effectivelyActive: boolean
}

export interface PartnerRoleConfig {
  partnerId: string
  activeRoles: PartnerRole[]
  designatedStaff: Record<PartnerRole, string | null>
  roleOverrides: Record<PartnerRole, boolean>
}

/**
 * Check if a role should be auto-disabled due to designated staff assignment
 */
export function shouldAutoDisableRole(
  designatedStaff: Record<string, string | null>,
  roleOverrides: Record<string, boolean>,
  role: PartnerRole
): boolean {
  const hasDesignatedStaff = !!designatedStaff[role]
  const isOverridden = !!roleOverrides[role]
  return hasDesignatedStaff && !isOverridden
}

/**
 * Get effective roles for a partner (considering auto-disable logic)
 */
export function getEffectiveRoles(
  activeRoles: PartnerRole[],
  designatedStaff: Record<string, string | null>,
  roleOverrides: Record<string, boolean>
): PartnerRole[] {
  return activeRoles.filter((role) => {
    const hasDesignatedStaff = !!designatedStaff[role]
    const isOverridden = !!roleOverrides[role]
    // Role is effective if no designated staff OR if overridden
    return !hasDesignatedStaff || isOverridden
  })
}

/**
 * Get partner role configuration from database
 */
export async function getPartnerRoleConfig(
  partnerId: string
): Promise<PartnerRoleConfig | null> {
  const supabase = createAdminClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle()

  if (error || !partner) {
    console.error('[Role Detection] Error fetching partner:', error)
    return null
  }

  // Type assertion for new columns
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: PartnerRole[]
    designated_staff?: Record<PartnerRole, string | null>
    role_overrides?: Record<PartnerRole, boolean>
  }

  return {
    partnerId: partnerWithRoles.id,
    activeRoles: (partnerWithRoles.active_roles || []) as PartnerRole[],
    designatedStaff: (partnerWithRoles.designated_staff || {}) as Record<PartnerRole, string | null>,
    roleOverrides: (partnerWithRoles.role_overrides || {}) as Record<PartnerRole, boolean>,
  }
}

/**
 * Get partner role configuration by email
 */
export async function getPartnerRoleConfigByEmail(
  email: string
): Promise<PartnerRoleConfig | null> {
  const supabase = createAdminClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error || !partner) {
    return null
  }

  // Type assertion for new columns
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: PartnerRole[]
    designated_staff?: Record<PartnerRole, string | null>
    role_overrides?: Record<PartnerRole, boolean>
  }

  return {
    partnerId: partnerWithRoles.id,
    activeRoles: (partnerWithRoles.active_roles || []) as PartnerRole[],
    designatedStaff: (partnerWithRoles.designated_staff || {}) as Record<PartnerRole, string | null>,
    roleOverrides: (partnerWithRoles.role_overrides || {}) as Record<PartnerRole, boolean>,
  }
}

/**
 * Check if partner can access a specific role dashboard
 */
export async function canPartnerAccessRole(
  email: string,
  role: PartnerRole
): Promise<boolean> {
  const config = await getPartnerRoleConfigByEmail(email)
  if (!config) {
    return false
  }

  // Check if role is in active roles
  if (!config.activeRoles.includes(role)) {
    return false
  }

  // Check if effectively active (not blocked by designated staff)
  const effectiveRoles = getEffectiveRoles(
    config.activeRoles,
    config.designatedStaff,
    config.roleOverrides
  )

  return effectiveRoles.includes(role)
}

/**
 * Assign designated staff to a partner role
 */
export async function assignDesignatedStaff(
  partnerId: string,
  role: PartnerRole,
  staffId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Fetch current partner data
  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle()

  if (fetchError || !partner) {
    return { success: false, error: 'Partner not found' }
  }

  // Type assertion for new columns
  const partnerWithStaff = partner as typeof partner & {
    designated_staff?: Record<string, string | null>
  }

  const currentDesignated = (partnerWithStaff.designated_staff || {}) as Record<string, string | null>
  const newDesignated = { ...currentDesignated }

  if (staffId) {
    newDesignated[role] = staffId
  } else {
    delete newDesignated[role]
  }

  const { error: updateError } = await supabase
    .from('partners')
    .update({ designated_staff: newDesignated } as Record<string, unknown>)
    .eq('id', partnerId)

  if (updateError) {
    console.error('[Role Detection] Error updating designated staff:', updateError)
    return { success: false, error: 'Failed to update designated staff' }
  }

  return { success: true }
}

/**
 * Toggle a partner role on/off
 */
export async function togglePartnerRole(
  partnerId: string,
  role: PartnerRole,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle()

  if (fetchError || !partner) {
    return { success: false, error: 'Partner not found' }
  }

  // Type assertion for new columns
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: string[]
    role_overrides?: Record<string, boolean>
  }

  const currentRoles = (partnerWithRoles.active_roles || []) as string[]
  const currentOverrides = (partnerWithRoles.role_overrides || {}) as Record<string, boolean>

  let newRoles = [...currentRoles]
  const newOverrides = { ...currentOverrides }

  if (enabled && !newRoles.includes(role)) {
    newRoles.push(role)
  } else if (!enabled) {
    newRoles = newRoles.filter((r) => r !== role)
    delete newOverrides[role]
  }

  const { error: updateError } = await supabase
    .from('partners')
    .update({
      active_roles: newRoles,
      role_overrides: newOverrides,
    } as Record<string, unknown>)
    .eq('id', partnerId)

  if (updateError) {
    console.error('[Role Detection] Error toggling role:', updateError)
    return { success: false, error: 'Failed to toggle role' }
  }

  return { success: true }
}

/**
 * Set role override (allow partner to work despite designated staff)
 */
export async function setRoleOverride(
  partnerId: string,
  role: PartnerRole,
  override: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle()

  if (fetchError || !partner) {
    return { success: false, error: 'Partner not found' }
  }

  // Type assertion for new columns
  const partnerWithOverrides = partner as typeof partner & {
    role_overrides?: Record<string, boolean>
  }

  const currentOverrides = (partnerWithOverrides.role_overrides || {}) as Record<string, boolean>
  const newOverrides = { ...currentOverrides }

  if (override) {
    newOverrides[role] = true
  } else {
    delete newOverrides[role]
  }

  const { error: updateError } = await supabase
    .from('partners')
    .update({ role_overrides: newOverrides } as Record<string, unknown>)
    .eq('id', partnerId)

  if (updateError) {
    console.error('[Role Detection] Error setting override:', updateError)
    return { success: false, error: 'Failed to set override' }
  }

  return { success: true }
}

/**
 * Get detailed role status for all roles
 */
export async function getPartnerRoleStatuses(
  email: string
): Promise<PartnerRoleStatus[] | null> {
  const supabase = createAdminClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error || !partner) {
    return null
  }

  // Type assertion for new columns
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: string[]
    designated_staff?: Record<string, string | null>
    role_overrides?: Record<string, boolean>
  }

  const activeRoles = (partnerWithRoles.active_roles || []) as string[]
  const designatedStaff = (partnerWithRoles.designated_staff || {}) as Record<string, string | null>
  const roleOverrides = (partnerWithRoles.role_overrides || {}) as Record<string, boolean>

  // Get staff names for designated staff
  const staffIds = Object.values(designatedStaff).filter(Boolean) as string[]
  let staffNames: Record<string, string> = {}

  if (staffIds.length > 0) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')
      .in('id', staffIds)

    if (staff) {
      staffNames = staff.reduce((acc, s) => {
        acc[s.id] = s.name
        return acc
      }, {} as Record<string, string>)
    }
  }

  return VALID_PARTNER_ROLES.map((role) => {
    const isActive = activeRoles.includes(role)
    const designatedStaffId = designatedStaff[role] || null
    const hasDesignatedStaff = !!designatedStaffId
    const isOverridden = !!roleOverrides[role]
    const effectivelyActive = isActive && (!hasDesignatedStaff || isOverridden)

    return {
      role,
      isActive,
      hasDesignatedStaff,
      designatedStaffId,
      designatedStaffName: designatedStaffId ? staffNames[designatedStaffId] || null : null,
      isOverridden,
      effectivelyActive,
    }
  })
}
