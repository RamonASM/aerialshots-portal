import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type PartnerRole = 'photographer' | 'videographer' | 'qc' | 'va'

const VALID_ROLES: PartnerRole[] = ['photographer', 'videographer', 'qc', 'va']

// GET: Fetch partner's active_roles and designated_staff
export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()
  if (!userEmail) {
    return NextResponse.json({ error: 'No email found' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (error) {
    console.error('[Partner Roles API] Error fetching partner:', error)
    return NextResponse.json({ error: 'Failed to fetch partner' }, { status: 500 })
  }

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  // Type assertion for new columns (until migration applied and types regenerated)
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: string[]
    designated_staff?: Record<string, string | null>
    role_overrides?: Record<string, boolean>
  }

  // Get designated staff details if any
  const designatedStaff = (partnerWithRoles.designated_staff || {}) as Record<string, string | null>
  const staffIds = Object.values(designatedStaff).filter(Boolean) as string[]

  let staffDetails: Record<string, { id: string; name: string; email: string }> = {}
  if (staffIds.length > 0) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, email')
      .in('id', staffIds)

    if (staff) {
      staffDetails = staff.reduce((acc, s) => {
        acc[s.id] = s
        return acc
      }, {} as Record<string, { id: string; name: string; email: string }>)
    }
  }

  // Build response with role status
  const roles = VALID_ROLES.map((role) => {
    const isActive = (partnerWithRoles.active_roles || []).includes(role)
    const designatedStaffId = designatedStaff[role]
    const hasDesignatedStaff = !!designatedStaffId
    const isOverridden = (partnerWithRoles.role_overrides || {})[role] || false
    const effectivelyActive = isActive && (!hasDesignatedStaff || isOverridden)

    return {
      role,
      isActive,
      hasDesignatedStaff,
      designatedStaffId,
      designatedStaffName: designatedStaffId ? staffDetails[designatedStaffId]?.name : null,
      isOverridden,
      effectivelyActive,
    }
  })

  return NextResponse.json({
    partnerId: partnerWithRoles.id,
    partnerName: partnerWithRoles.name,
    roles,
  })
}

// PUT: Toggle a role on/off or set override
export async function PUT(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()
  if (!userEmail) {
    return NextResponse.json({ error: 'No email found' }, { status: 400 })
  }

  let body: { role: PartnerRole; enabled?: boolean; override?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role, enabled, override } = body

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch current partner data
  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (fetchError || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  // Type assertion for new columns
  const partnerWithRoles = partner as typeof partner & {
    active_roles?: string[]
    role_overrides?: Record<string, boolean>
  }

  const currentRoles = (partnerWithRoles.active_roles || []) as string[]
  const currentOverrides = (partnerWithRoles.role_overrides || {}) as Record<string, boolean>

  let newRoles = [...currentRoles]
  let newOverrides = { ...currentOverrides }

  // Handle role toggle
  if (typeof enabled === 'boolean') {
    if (enabled && !newRoles.includes(role)) {
      newRoles.push(role)
    } else if (!enabled) {
      newRoles = newRoles.filter((r) => r !== role)
      // Also remove override when disabling role
      delete newOverrides[role]
    }
  }

  // Handle override toggle
  if (typeof override === 'boolean') {
    if (override) {
      newOverrides[role] = true
    } else {
      delete newOverrides[role]
    }
  }

  // Update partner
  const { error: updateError } = await supabase
    .from('partners')
    .update({
      active_roles: newRoles,
      role_overrides: newOverrides,
    } as Record<string, unknown>)
    .eq('id', partnerWithRoles.id)

  if (updateError) {
    console.error('[Partner Roles API] Error updating partner:', updateError)
    return NextResponse.json({ error: 'Failed to update roles' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    activeRoles: newRoles,
    roleOverrides: newOverrides,
  })
}

// POST: Assign or unassign designated staff to a role
export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()
  if (!userEmail) {
    return NextResponse.json({ error: 'No email found' }, { status: 400 })
  }

  let body: { role: PartnerRole; staffId: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role, staffId } = body

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch current partner data
  const { data: partner, error: fetchError } = await supabase
    .from('partners')
    .select('*')
    .eq('email', userEmail)
    .maybeSingle()

  if (fetchError || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  // Type assertion for new columns
  const partnerWithStaff = partner as typeof partner & {
    designated_staff?: Record<string, string | null>
  }

  // Validate staff ID if provided
  if (staffId) {
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role')
      .eq('id', staffId)
      .maybeSingle()

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Optionally validate staff has matching role
    if (staff.role !== role && staff.role !== 'admin') {
      console.warn(`[Partner Roles API] Staff ${staffId} has role ${staff.role}, assigning to ${role}`)
    }
  }

  const currentDesignated = (partnerWithStaff.designated_staff || {}) as Record<string, string | null>
  const newDesignated = { ...currentDesignated }

  if (staffId) {
    newDesignated[role] = staffId
  } else {
    delete newDesignated[role]
  }

  // Update partner
  const { error: updateError } = await supabase
    .from('partners')
    .update({ designated_staff: newDesignated } as Record<string, unknown>)
    .eq('id', partnerWithStaff.id)

  if (updateError) {
    console.error('[Partner Roles API] Error updating designated staff:', updateError)
    return NextResponse.json({ error: 'Failed to update designated staff' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    designatedStaff: newDesignated,
  })
}
