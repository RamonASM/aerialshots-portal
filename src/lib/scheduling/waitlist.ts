import { createAdminClient } from '@/lib/supabase/admin'
import { sendNotification } from '@/lib/notifications'

export interface WaitlistEntry {
  id: string
  client_email: string
  client_name: string
  territory_id: string
  requested_date: string
  listing_id?: string
  status: 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled'
  position: number
  flexible_dates?: boolean
  date_range_start?: string
  date_range_end?: string
  notification_count: number
  last_notified_at?: string
  created_at: string
}

export interface JoinWaitlistParams {
  client_email: string
  client_name: string
  territory_id: string
  requested_date: Date
  listing_id: string
  flexible_dates?: boolean
  date_range_end?: Date
  check_duplicates?: boolean
}

export interface WaitlistJoinResult {
  success: boolean
  entry?: WaitlistEntry
  error?: string
}

export interface WaitlistLeaveResult {
  success: boolean
  error?: string
}

export interface NotificationResult {
  notified: boolean
  client_email?: string
  error?: string
}

const MAX_NOTIFICATION_ATTEMPTS = 3

/**
 * Join the waitlist for a specific date
 */
export async function joinWaitlist(params: JoinWaitlistParams): Promise<WaitlistJoinResult> {
  const {
    client_email,
    client_name,
    territory_id,
    requested_date,
    listing_id,
    flexible_dates,
    date_range_end,
    check_duplicates,
  } = params

  // Validate date is in the future
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const requestedDay = new Date(requested_date)
  requestedDay.setHours(0, 0, 0, 0)

  if (requestedDay <= now) {
    return {
      success: false,
      error: 'Requested date must be in the future.',
    }
  }

  try {
    const supabase = createAdminClient()
    const dateStr = requestedDay.toISOString().split('T')[0]

    // Check for duplicates if requested
    if (check_duplicates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('appointment_waitlist')
        .select('id, client_email')
        .eq('client_email', client_email)
        .eq('territory_id', territory_id)
        .eq('requested_date', dateStr) as {
          data: Array<{ id: string; client_email: string }> | null
        }

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'You are already on the waitlist for this date.',
        }
      }
    }

    // Get current position
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingEntries } = await (supabase as any)
      .from('appointment_waitlist')
      .select('id')
      .eq('territory_id', territory_id)
      .eq('requested_date', dateStr)
      .eq('status', 'waiting') as { data: Array<{ id: string }> | null }

    const position = (existingEntries?.length || 0) + 1

    // Insert new entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_waitlist')
      .insert({
        client_email,
        client_name,
        territory_id,
        requested_date: dateStr,
        listing_id,
        status: 'waiting',
        position,
        flexible_dates: flexible_dates || false,
        date_range_start: flexible_dates ? dateStr : null,
        date_range_end: flexible_dates && date_range_end
          ? date_range_end.toISOString().split('T')[0]
          : null,
        notification_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: WaitlistEntry | null; error: Error | null }

    if (error || !data) {
      return {
        success: false,
        error: 'Failed to join waitlist.',
      }
    }

    return {
      success: true,
      entry: data,
    }
  } catch (error) {
    console.error('[Waitlist] Error joining:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Leave the waitlist
 */
export async function leaveWaitlist(
  entryId: string,
  clientEmail: string
): Promise<WaitlistLeaveResult> {
  try {
    const supabase = createAdminClient()

    // Get entry details first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry } = await (supabase as any)
      .from('appointment_waitlist')
      .select('id, position, territory_id, requested_date')
      .eq('id', entryId)
      .single() as {
        data: {
          id: string
          position: number
          territory_id: string
          requested_date: string
        } | null
      }

    // Delete the entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('appointment_waitlist')
      .delete()
      .eq('id', entryId)
      .eq('client_email', clientEmail)

    if (error) {
      return {
        success: false,
        error: 'Failed to leave waitlist.',
      }
    }

    // Update positions of remaining entries (if we got the entry details)
    if (entry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('reorder_waitlist_positions', {
        p_territory_id: entry.territory_id,
        p_requested_date: entry.requested_date,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('[Waitlist] Error leaving:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}

/**
 * Get current position in waitlist
 */
export async function getWaitlistPosition(entryId: string): Promise<number | null> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_waitlist')
      .select('id, position, status')
      .eq('id', entryId)
      .single() as { data: { id: string; position: number; status: string } | null; error: Error | null }

    if (error || !data) {
      return null
    }

    return data.position
  } catch (error) {
    console.error('[Waitlist] Error getting position:', error)
    return null
  }
}

/**
 * Get all waitlist entries for a specific date
 */
export async function getWaitlistForDate(
  territoryId: string,
  date: Date
): Promise<WaitlistEntry[]> {
  try {
    const supabase = createAdminClient()
    const dateStr = date.toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_waitlist')
      .select('*')
      .eq('territory_id', territoryId)
      .eq('requested_date', dateStr)
      .order('position', { ascending: true }) as { data: WaitlistEntry[] | null; error: Error | null }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Waitlist] Error getting waitlist:', error)
    return []
  }
}

/**
 * Notify the first person on the waitlist that a slot is available
 */
export async function notifyWaitlistSlotAvailable(
  territoryId: string,
  date: Date
): Promise<NotificationResult> {
  try {
    const supabase = createAdminClient()
    const dateStr = date.toISOString().split('T')[0]

    // Get the first waiting entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entries } = await (supabase as any)
      .from('appointment_waitlist')
      .select('*')
      .eq('territory_id', territoryId)
      .eq('requested_date', dateStr)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1) as { data: WaitlistEntry[] | null }

    if (!entries || entries.length === 0) {
      return { notified: false }
    }

    const entry = entries[0]

    // Check if max notification attempts reached
    if (entry.notification_count >= MAX_NOTIFICATION_ATTEMPTS) {
      return { notified: false }
    }

    // Send notification
    await sendNotification({
      type: 'waitlist_slot_available',
      recipient: {
        email: entry.client_email,
        name: entry.client_name,
      },
      channel: 'email',
      data: {
        client_name: entry.client_name,
        requested_date: dateStr,
        waitlist_id: entry.id,
      },
    })

    // Update notification count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('appointment_waitlist')
      .update({
        notification_count: entry.notification_count + 1,
        last_notified_at: new Date().toISOString(),
        status: 'notified',
      })
      .eq('id', entry.id)

    return {
      notified: true,
      client_email: entry.client_email,
    }
  } catch (error) {
    console.error('[Waitlist] Error notifying:', error)
    return {
      notified: false,
      error: 'Failed to send notification.',
    }
  }
}

/**
 * Process all waitlists and send notifications for available slots
 */
export async function processWaitlistNotifications(): Promise<{
  processed: number
  notified: number
}> {
  try {
    const supabase = createAdminClient()

    // Get all territories with available slots
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: availableSlots } = await (supabase as any)
      .from('territory_availability')
      .select('territory_id, date')
      .eq('has_opening', true)
      .gte('date', new Date().toISOString().split('T')[0]) as {
        data: Array<{ territory_id: string; date: string }> | null
      }

    if (!availableSlots) {
      return { processed: 0, notified: 0 }
    }

    let notified = 0

    for (const slot of availableSlots) {
      const result = await notifyWaitlistSlotAvailable(
        slot.territory_id,
        new Date(slot.date)
      )

      if (result.notified) {
        notified++
      }
    }

    return {
      processed: availableSlots.length,
      notified,
    }
  } catch (error) {
    console.error('[Waitlist] Error processing notifications:', error)
    return { processed: 0, notified: 0 }
  }
}

/**
 * Get all waitlist entries for a client
 */
export async function getClientWaitlistEntries(
  clientEmail: string
): Promise<WaitlistEntry[]> {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_waitlist')
      .select('*')
      .eq('client_email', clientEmail)
      .eq('status', 'waiting')
      .order('requested_date', { ascending: true }) as {
        data: WaitlistEntry[] | null
        error: Error | null
      }

    if (error || !data) {
      return []
    }

    return data
  } catch (error) {
    console.error('[Waitlist] Error getting client entries:', error)
    return []
  }
}

/**
 * Expire old waitlist entries
 */
export async function expireOldWaitlistEntries(): Promise<number> {
  try {
    const supabase = createAdminClient()

    // Expire entries where date has passed or max notifications reached
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_waitlist')
      .update({ status: 'expired' })
      .lt('requested_date', new Date().toISOString().split('T')[0])
      .eq('status', 'waiting')
      .select('id') as { data: Array<{ id: string }> | null; error: Error | null }

    if (error) {
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('[Waitlist] Error expiring entries:', error)
    return 0
  }
}

/**
 * Book from waitlist (convert waitlist entry to booking)
 */
export async function bookFromWaitlist(
  entryId: string,
  clientEmail: string
): Promise<{ success: boolean; booking_id?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Get the waitlist entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry, error: fetchError } = await (supabase as any)
      .from('appointment_waitlist')
      .select('*')
      .eq('id', entryId)
      .eq('client_email', clientEmail)
      .single() as { data: WaitlistEntry | null; error: Error | null }

    if (fetchError || !entry) {
      return {
        success: false,
        error: 'Waitlist entry not found.',
      }
    }

    if (entry.status !== 'notified') {
      return {
        success: false,
        error: 'This waitlist entry has not been notified of availability.',
      }
    }

    // Update waitlist status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('appointment_waitlist')
      .update({ status: 'booked' })
      .eq('id', entryId)

    return {
      success: true,
      booking_id: entry.id, // Would be the actual booking ID in full implementation
    }
  } catch (error) {
    console.error('[Waitlist] Error booking from waitlist:', error)
    return {
      success: false,
      error: 'An unexpected error occurred.',
    }
  }
}
