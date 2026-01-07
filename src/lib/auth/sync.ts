import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

const STAFF_DOMAIN = '@aerialshots.media'

export async function syncAuthUserRecords(user: User) {
  const email = user.email?.toLowerCase()
  if (!email) return { isStaff: false, isPartner: false }

  const adminSupabase = createAdminClient()
  const isStaffDomain = email.endsWith(STAFF_DOMAIN)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = adminSupabase as any
  const [staffResult, partnerResult, agentResult, clientResult] = await Promise.all([
    supabase
      .from('staff')
      .select('id, clerk_user_id, is_active')
      .eq('email', email)
      .maybeSingle(),
    supabase
      .from('partners')
      .select('id, clerk_user_id, is_active')
      .eq('email', email)
      .maybeSingle(),
    supabase
      .from('agents')
      .select('id, clerk_user_id')
      .eq('email', email)
      .maybeSingle(),
    supabase
      .from('client_accounts')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle(),
  ])

  const staff = staffResult.data
  const partner = partnerResult.data
  const agent = agentResult.data
  const client = clientResult.data

  const isStaff = !!staff || isStaffDomain
  const isPartner = !!partner

  if (isStaffDomain && !staff) {
    const name = user.user_metadata?.full_name ||
      email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    await supabase.from('staff').insert({
      email,
      name,
      role: 'photographer',
      is_active: true,
      clerk_user_id: user.id,
    })
  } else if (staff && staff.clerk_user_id !== user.id) {
    await supabase
      .from('staff')
      .update({ clerk_user_id: user.id })
      .eq('id', staff.id)
  }

  if (partner && partner.clerk_user_id !== user.id) {
    await supabase
      .from('partners')
      .update({ clerk_user_id: user.id })
      .eq('id', partner.id)
  }

  if (!isStaff && !isPartner) {
    if (!agent) {
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
      await supabase.from('agents').insert({
        email,
        name: user.user_metadata?.full_name || email.split('@')[0],
        slug: `${slug}-${Date.now().toString(36)}`,
        clerk_user_id: user.id,
      })
    } else if (agent.clerk_user_id !== user.id) {
      await supabase
        .from('agents')
        .update({ clerk_user_id: user.id })
        .eq('id', agent.id)
    }
  }

  if (client && client.auth_user_id !== user.id) {
    await supabase
      .from('client_accounts')
      .update({ auth_user_id: user.id, last_login_at: new Date().toISOString() })
      .eq('id', client.id)
  }

  return { isStaff, isPartner }
}
