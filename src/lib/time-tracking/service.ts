import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Time tracking service for hourly workers (QC specialists)
 */

export interface TimeEntry {
  id: string
  staff_id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number | null
  break_minutes: number | null
  hourly_rate: number
  total_pay_cents: number | null
  status: string | null
  pay_period_id: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PayPeriod {
  id: string
  start_date: string
  end_date: string
  status: string | null
  total_hours: number | null
  total_pay_cents: number | null
  paid_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ClockInResult {
  success: boolean
  entry?: TimeEntry
  error?: string
}

export interface ClockOutResult {
  success: boolean
  entry?: TimeEntry
  duration_minutes?: number
  total_pay_cents?: number
  error?: string
}

/**
 * Clock in a staff member
 */
export async function clockIn(staffId: string, notes?: string): Promise<ClockInResult> {
  const supabase = createAdminClient()

  try {
    // Check if there's already an active entry (use maybeSingle - not finding one is OK)
    const { data: activeEntry, error: activeError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .select('id')
      .eq('staff_id', staffId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeError) {
      console.error('[TimeTracking] Error checking active entry:', activeError)
      return {
        success: false,
        error: 'Database error while checking clock-in status.',
      }
    }

    if (activeEntry) {
      return {
        success: false,
        error: 'Already clocked in. Please clock out first.',
      }
    }

    // Get staff's hourly rate
    // Note: hourly_rate column may not be in generated types
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('hourly_rate')
      .eq('id', staffId)
      .single() as { data: { hourly_rate: number | null } | null; error: unknown }

    if (staffError) {
      console.error('[TimeTracking] Error fetching staff hourly rate:', staffError)
      return {
        success: false,
        error: 'Failed to fetch staff information.',
      }
    }

    if (!staff?.hourly_rate) {
      return {
        success: false,
        error: 'Hourly rate not configured for this staff member.',
      }
    }

    // Get current pay period
    const payPeriod = await getCurrentPayPeriod()

    // Create time entry
    const { data: entry, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .insert({
        staff_id: staffId,
        clock_in: new Date().toISOString(),
        hourly_rate: staff.hourly_rate,
        status: 'active',
        pay_period_start: payPeriod?.start_date,
        pay_period_end: payPeriod?.end_date,
        notes,
      })
      .select()
      .single()
      .returns<TimeEntry>()

    if (error) {
      throw error
    }

    return {
      success: true,
      entry,
    }
  } catch (error) {
    console.error('[TimeTracking] Clock in error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clock in',
    }
  }
}

/**
 * Clock out a staff member
 */
export async function clockOut(
  staffId: string,
  entryId?: string,
  breakMinutes: number = 0
): Promise<ClockOutResult> {
  const supabase = createAdminClient()

  try {
    // Find active entry
    let query = supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .select('*')
      .eq('staff_id', staffId)
      .eq('status', 'active')

    if (entryId) {
      query = query.eq('id', entryId)
    }

    const { data: activeEntry, error: findError } = await query
      .maybeSingle()
      .returns<TimeEntry>()

    if (findError) {
      console.error('[TimeTracking] Error finding active entry for clock out:', findError)
      return {
        success: false,
        error: 'Database error while checking clock-out status.',
      }
    }

    if (!activeEntry) {
      return {
        success: false,
        error: 'No active time entry found.',
      }
    }

    // Calculate duration
    const clockIn = new Date(activeEntry.clock_in)
    const clockOut = new Date()
    const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000)
    const workMinutes = Math.max(0, totalMinutes - breakMinutes)

    // Calculate pay (hourly_rate is stored as dollars, convert to cents)
    const hourlyRateCents = Math.round(activeEntry.hourly_rate * 100)
    const totalPayCents = Math.round((workMinutes / 60) * hourlyRateCents)

    // Update entry
    const { data: updatedEntry, error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .update({
        clock_out: clockOut.toISOString(),
        duration_minutes: workMinutes,
        break_minutes: breakMinutes,
        total_pay_cents: totalPayCents,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeEntry.id)
      .select()
      .single()
      .returns<TimeEntry>()

    if (updateError) {
      throw updateError
    }

    return {
      success: true,
      entry: updatedEntry,
      duration_minutes: workMinutes,
      total_pay_cents: totalPayCents,
    }
  } catch (error) {
    console.error('[TimeTracking] Clock out error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clock out',
    }
  }
}

/**
 * Get active time entry for a staff member
 */
export async function getActiveEntry(staffId: string): Promise<TimeEntry | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('time_entries' as any)
    .select('*')
    .eq('staff_id', staffId)
    .eq('status', 'active')
    .maybeSingle()
    .returns<TimeEntry>()

  if (error) {
    console.error('[TimeTracking] Error getting active entry:', error)
    return null
  }

  return data
}

/**
 * Get time entries for a staff member within a date range
 */
export async function getTimeEntries(
  staffId: string,
  startDate?: string,
  endDate?: string
): Promise<TimeEntry[]> {
  const supabase = createAdminClient()

  let query = supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
    .select('*')
    .eq('staff_id', staffId)
    .order('clock_in', { ascending: false })

  if (startDate) {
    query = query.gte('clock_in', startDate)
  }

  if (endDate) {
    query = query.lte('clock_in', endDate)
  }

  const { data, error } = await query as { data: TimeEntry[] | null; error: Error | null }

  if (error) {
    console.error('[TimeTracking] Error fetching entries:', error)
    return []
  }

  return data || []
}

/**
 * Get the current pay period (bi-weekly, Monday start)
 */
export async function getCurrentPayPeriod(): Promise<PayPeriod | null> {
  const supabase = createAdminClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Check for existing open period (use maybeSingle - not finding one is OK)
  const { data: existingPeriod, error: periodError } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('pay_periods' as any)
    .select('*')
    .lte('start_date', todayStr)
    .gte('end_date', todayStr)
    .eq('status', 'open')
    .maybeSingle()
    .returns<PayPeriod>()

  if (periodError) {
    console.error('[TimeTracking] Error checking existing pay period:', periodError)
    // Don't return null here - try to create a new period
  }

  if (existingPeriod) {
    return existingPeriod
  }

  // Calculate bi-weekly period (starting Monday)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  // Find the Monday of the current week
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() + mondayOffset)

  // Determine if we're in week 1 or week 2 of the bi-weekly period
  // Use Jan 1, 2024 as epoch for consistent bi-weekly calculation
  const epoch = new Date('2024-01-01')
  const weeksSinceEpoch = Math.floor(
    (thisMonday.getTime() - epoch.getTime()) / (7 * 24 * 60 * 60 * 1000)
  )
  const isWeekTwo = weeksSinceEpoch % 2 === 1

  // Calculate period start (go back one week if we're in week 2)
  const periodStart = new Date(thisMonday)
  if (isWeekTwo) {
    periodStart.setDate(periodStart.getDate() - 7)
  }

  // Period end is 13 days after start (two weeks minus one day)
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 13)

  const startStr = periodStart.toISOString().split('T')[0]
  const endStr = periodEnd.toISOString().split('T')[0]

  // Create the pay period if it doesn't exist
  const { data: newPeriod, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('pay_periods' as any)
    .upsert(
      {
        start_date: startStr,
        end_date: endStr,
        status: 'open',
      },
      { onConflict: 'start_date,end_date' }
    )
    .select()
    .single()
    .returns<PayPeriod>()

  if (error) {
    console.error('[TimeTracking] Error creating pay period:', error)
    return null
  }

  return newPeriod
}

/**
 * Get timesheet summary for a pay period
 */
export async function getTimesheetForPeriod(
  staffId: string,
  periodId: string
): Promise<{
  entries: TimeEntry[]
  totalMinutes: number
  totalPayCents: number
}> {
  const supabase = createAdminClient()

  // Get pay period (use maybeSingle - period might not exist)
  const { data: period, error: periodError } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('pay_periods' as any)
    .select('*')
    .eq('id', periodId)
    .maybeSingle()
    .returns<PayPeriod>()

  if (periodError) {
    console.error('[TimeTracking] Error getting pay period for timesheet:', periodError)
    return { entries: [], totalMinutes: 0, totalPayCents: 0 }
  }

  if (!period) {
    return { entries: [], totalMinutes: 0, totalPayCents: 0 }
  }

  // Get entries for this period
  const { data: entries } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
    .select('*')
    .eq('staff_id', staffId)
    .gte('clock_in', period.start_date)
    .lte('clock_in', period.end_date + 'T23:59:59.999Z')
    .neq('status', 'active')
    .order('clock_in', { ascending: true })
    .returns<TimeEntry[]>()

  const totalMinutes = entries?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0
  const totalPayCents = entries?.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0) || 0

  return {
    entries: entries || [],
    totalMinutes,
    totalPayCents,
  }
}

/**
 * Close a pay period (admin action)
 */
export async function closePayPeriod(
  periodId: string
): Promise<{ success: boolean; totalHours?: number; totalPayCents?: number; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Get period (use maybeSingle - period might not exist)
    const { data: period, error: periodError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('pay_periods' as any)
      .select('*')
      .eq('id', periodId)
      .maybeSingle()
      .returns<PayPeriod>()

    if (periodError) {
      console.error('[TimeTracking] Error getting pay period to close:', periodError)
      return { success: false, error: 'Database error while retrieving pay period.' }
    }

    if (!period) {
      return { success: false, error: 'Pay period not found' }
    }

    if (period.status !== 'open') {
      return { success: false, error: 'Pay period is not open' }
    }

    // Calculate totals from all completed entries in this period
    const { data: entries } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .select('duration_minutes, total_pay_cents')
      .gte('clock_in', period.start_date)
      .lte('clock_in', period.end_date + 'T23:59:59.999Z')
      .eq('status', 'completed')
      .returns<Array<{ duration_minutes: number | null; total_pay_cents: number | null }>>()

    const totalMinutes = entries?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0
    const totalPayCents = entries?.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0) || 0
    const totalHours = totalMinutes / 60

    // Update period
    const { error: updateError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('pay_periods' as any)
      .update({
        status: 'closed',
        total_hours: totalHours,
        total_pay_cents: totalPayCents,
      })
      .eq('id', periodId)

    if (updateError) {
      throw updateError
    }

    // Mark all entries as approved
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
      .update({ status: 'approved' })
      .gte('clock_in', period.start_date)
      .lte('clock_in', period.end_date + 'T23:59:59.999Z')
      .eq('status', 'completed')

    return {
      success: true,
      totalHours,
      totalPayCents,
    }
  } catch (error) {
    console.error('[TimeTracking] Error closing pay period:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close pay period',
    }
  }
}

/**
 * Get today's time summary for a staff member
 */
export async function getTodaySummary(staffId: string): Promise<{
  activeEntry: TimeEntry | null
  todayMinutes: number
  todayPayCents: number
  weekMinutes: number
  weekPayCents: number
}> {
  const supabase = createAdminClient()

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayStr = todayStart.toISOString()

  // Get start of week (Monday)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const weekStr = weekStart.toISOString()

  // Get active entry (use maybeSingle - it's OK if no active entry exists)
  const { data: activeEntry, error: activeError } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('time_entries' as any)
    .select('*')
    .eq('staff_id', staffId)
    .eq('status', 'active')
    .maybeSingle()
    .returns<TimeEntry>()

  if (activeError) {
    console.error('[TimeTracking] Error getting active entry in summary:', activeError)
  }

  // Get today's completed entries
  const { data: todayEntries } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
    .select('duration_minutes, total_pay_cents')
    .eq('staff_id', staffId)
    .gte('clock_in', todayStr)
    .neq('status', 'active')
    .returns<Array<{ duration_minutes: number | null; total_pay_cents: number | null }>>()

  // Get week's completed entries
  const { data: weekEntries } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('time_entries' as any)
    .select('duration_minutes, total_pay_cents')
    .eq('staff_id', staffId)
    .gte('clock_in', weekStr)
    .neq('status', 'active')
    .returns<Array<{ duration_minutes: number | null; total_pay_cents: number | null }>>()

  const todayMinutes = todayEntries?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0
  const todayPayCents = todayEntries?.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0) || 0
  const weekMinutes = weekEntries?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) || 0
  const weekPayCents = weekEntries?.reduce((sum, e) => sum + (e.total_pay_cents || 0), 0) || 0

  return {
    activeEntry,
    todayMinutes,
    todayPayCents,
    weekMinutes,
    weekPayCents,
  }
}
