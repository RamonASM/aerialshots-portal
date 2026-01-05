/**
 * Clerk Webhook Handler
 *
 * Syncs Clerk users with database tables:
 * - agents (real estate agents)
 * - staff (photographers, videographers, QC, admins)
 * - partners (business partners)
 * - sellers (homeowners/property sellers)
 *
 * Events handled:
 * - user.created: Link new users to existing records or create agent record
 * - user.updated: Sync email/name changes
 * - user.deleted: Mark records as inactive
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Clerk webhook secret
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

// Allowed partner emails (only these can be linked as partners)
const ALLOWED_PARTNER_EMAILS = [
  'ramon@aerialshots.media',
  'alex@aerialshots.media',
]

interface ClerkWebhookEvent {
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
    first_name: string | null
    last_name: string | null
    image_url: string | null
    public_metadata: Record<string, unknown>
    private_metadata: Record<string, unknown>
  }
  object: string
  type: string
}

export async function POST(request: Request) {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    )
  }

  // Get the body
  const payload = await request.json()
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Clerk Webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle events
  const eventType = event.type
  const { id: clerkUserId, email_addresses, primary_email_address_id, first_name, last_name } = event.data

  // Get primary email
  const primaryEmail = email_addresses.find(e => e.id === primary_email_address_id)?.email_address
  if (!primaryEmail) {
    console.error('[Clerk Webhook] No primary email found')
    return NextResponse.json({ received: true })
  }

  const fullName = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

  console.log(`[Clerk Webhook] Processing ${eventType} for ${primaryEmail}`)

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated':
        await syncUserToDatabase(clerkUserId, primaryEmail, fullName)
        break

      case 'user.deleted':
        await handleUserDeleted(clerkUserId)
        break

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Clerk Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Sync Clerk user to database
 * Checks all user tables and links/creates as appropriate
 */
async function syncUserToDatabase(
  clerkUserId: string,
  email: string,
  name: string
) {
  const supabase = createAdminClient()
  let role: string | null = null
  let userId: string | null = null
  let userTable: string | null = null

  // Check if user exists in any table (by email)
  // Priority: partners > staff > agents > sellers

  // Check partners (only allowed emails can be partners)
  const emailLower = email.toLowerCase()
  const isAllowedPartner = ALLOWED_PARTNER_EMAILS.includes(emailLower)

  if (isAllowedPartner) {
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, clerk_user_id')
      .eq('email', emailLower)
      .maybeSingle()

    if (partnerError) {
      console.error('[Clerk Webhook] Error querying partner:', partnerError)
    }

    if (partner) {
      // Partner record exists - link Clerk user ID if not already linked
      if (!partner.clerk_user_id) {
        await supabase
          .from('partners')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', partner.id)
        console.log(`[Clerk Webhook] Linked Clerk user ${clerkUserId} to existing partner ${partner.id}`)
      }
      role = 'partner'
      userId = partner.id
      userTable = 'partners'
    } else {
      // Partner record doesn't exist but email is allowed - CREATE IT
      // This handles the case where migrations haven't seeded the partner yet
      console.log(`[Clerk Webhook] Creating partner record for allowed email: ${emailLower}`)
      const { data: newPartner, error: createError } = await supabase
        .from('partners')
        .insert({
          name: name,
          email: emailLower,
          clerk_user_id: clerkUserId,
          is_active: true,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Clerk Webhook] Failed to create partner:', createError)
      } else if (newPartner) {
        console.log(`[Clerk Webhook] Created partner record ${newPartner.id} for ${emailLower}`)
        role = 'partner'
        userId = newPartner.id
        userTable = 'partners'
      }
    }
  }

  // Check staff
  if (!role) {
    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('id, role, clerk_user_id')
      .eq('email', emailLower)
      .maybeSingle()

    if (staffError) {
      console.error('[Clerk Webhook] Staff query error:', staffError)
    }

    if (staffMember) {
      if (!staffMember.clerk_user_id) {
        await supabase
          .from('staff')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', staffMember.id)
      }
      role = staffMember.role || 'staff'
      userId = staffMember.id
      userTable = 'staff'
    }
  }

  // Check agents
  if (!role) {
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, clerk_user_id')
      .eq('email', emailLower)
      .maybeSingle()

    if (agentError) {
      console.error('[Clerk Webhook] Agent query error:', agentError)
    }

    if (agent) {
      if (!agent.clerk_user_id) {
        await supabase
          .from('agents')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', agent.id)
      }
      role = 'agent'
      userId = agent.id
      userTable = 'agents'
    }
  }

  // Check sellers
  if (!role) {
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, clerk_user_id')
      .eq('email', emailLower)
      .maybeSingle()

    if (sellerError) {
      console.error('[Clerk Webhook] Seller query error:', sellerError)
    }

    if (seller) {
      if (!seller.clerk_user_id) {
        await supabase
          .from('sellers')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', seller.id)
      }
      role = 'seller'
      userId = seller.id
      userTable = 'sellers'
    }
  }

  // If no existing record, create as agent (default for new sign-ups)
  if (!role) {
    // Generate a slug from name or email
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `${baseSlug}-${randomSuffix}`

    const { data: newAgent, error } = await supabase
      .from('agents')
      .insert({
        email: emailLower,
        name: name,
        slug: slug,
        clerk_user_id: clerkUserId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Clerk Webhook] Failed to create agent:', error)
      throw error
    }

    role = 'agent'
    userId = newAgent.id
    userTable = 'agents'
  }

  // Update Clerk user's public metadata with role
  const clerk = await clerkClient()
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      role,
      userId,
      userTable,
    },
  })

  console.log(`[Clerk Webhook] Synced user ${email} as ${role} (${userId})`)
}

/**
 * Handle user deletion
 * Mark records as inactive rather than deleting
 */
async function handleUserDeleted(clerkUserId: string) {
  const supabase = createAdminClient()

  // Find which table has this Clerk user ID
  const tables = ['partners', 'staff', 'agents', 'sellers'] as const

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (data) {
      // Mark as inactive and clear Clerk ID
      await supabase
        .from(table)
        .update({
          clerk_user_id: null,
          is_active: false,
        })
        .eq('id', data.id)

      console.log(`[Clerk Webhook] Deactivated ${table} record for Clerk user ${clerkUserId}`)
      return
    }
  }

  console.log(`[Clerk Webhook] No record found for deleted Clerk user ${clerkUserId}`)
}
