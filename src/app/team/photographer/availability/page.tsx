import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AvailabilityClient } from './AvailabilityClient'

export const metadata = {
  title: 'Availability | Photographer Portal',
  description: 'Manage your availability and request time off',
}

async function getStaffData(email: string) {
  const supabase = createAdminClient()

  // Get staff record
  // Note: vacation/sick day columns and max_daily_jobs will be added in migration
  const { data: staffData } = await supabase
    .from('staff')
    .select(`
      id,
      name,
      email,
      team_role
    `)
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  if (!staffData) return null

  // Add default max_daily_jobs since column may not exist yet
  const staff = { ...staffData, max_daily_jobs: 4 }

  // Note: These tables will be created by migration 20260111_001_availability_system.sql
  // Using type assertions until migration is applied and types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Get weekly schedule
  const { data: weeklySchedule } = await db
    .from('photographer_weekly_schedule')
    .select('*')
    .eq('staff_id', staff.id)
    .order('day_of_week')

  // Get upcoming availability overrides (next 30 days)
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: availabilityOverrides } = await db
    .from('photographer_availability')
    .select('*')
    .eq('staff_id', staff.id)
    .gte('date', today)
    .lte('date', thirtyDaysLater)
    .order('date')

  // Get time off requests
  const { data: timeOffRequests } = await db
    .from('staff_time_off')
    .select(`
      *,
      reviewer:reviewed_by (name)
    `)
    .eq('staff_id', staff.id)
    .order('start_date', { ascending: false })
    .limit(20)

  // Get upcoming assignments for the next 14 days
  const fourteenDaysLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: upcomingAssignments } = await db
    .from('photographer_assignments')
    .select(`
      id,
      scheduled_date,
      scheduled_time,
      status,
      listing:listing_id (
        address,
        city
      )
    `)
    .eq('photographer_id', staff.id)
    .gte('scheduled_date', today)
    .lte('scheduled_date', fourteenDaysLater)
    .order('scheduled_date')

  return {
    staff,
    weeklySchedule: weeklySchedule || [],
    availabilityOverrides: availabilityOverrides || [],
    timeOffRequests: timeOffRequests || [],
    upcomingAssignments: upcomingAssignments || [],
  }
}

export default async function PhotographerAvailabilityPage() {
  const user = await currentUser()
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    redirect('/sign-in/staff')
  }

  const email = user.emailAddresses[0].emailAddress.toLowerCase()
  const data = await getStaffData(email)

  if (!data) {
    redirect('/sign-in/staff?error=no_staff')
  }

  return <AvailabilityClient {...data} />
}
