import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

const CACHE_REVALIDATION = 3600 // 1 hour

export interface TeamMember {
  id: string
  name: string
  role: string
  teamRole: string | null
  bio?: string
  certifications: string[]
  skills: string[]
  imageUrl?: string
  isActive: boolean
}

/**
 * Fetch active team members for the About page
 */
export const getTeamMembers = unstable_cache(
  async (): Promise<TeamMember[]> => {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staff, error } = await (supabase as any)
      .from('staff')
      .select('id, name, role, team_role, certifications, skills, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error || !staff) {
      console.error('Failed to fetch team members:', error)
      return []
    }

    return (staff as Array<{
      id: string
      name: string
      role: string
      team_role: string | null
      certifications: string[] | null
      skills: string[] | null
      is_active: boolean
    }>).map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      teamRole: member.team_role,
      certifications: member.certifications || [],
      skills: member.skills || [],
      isActive: member.is_active,
    }))
  },
  ['team-members'],
  { revalidate: CACHE_REVALIDATION, tags: ['team'] }
)

/**
 * Get company statistics for the About page
 */
export const getCompanyStats = unstable_cache(
  async (): Promise<{
    totalListings: number
    totalAgents: number
    yearsInBusiness: number
    citiesServed: number
  }> => {
    const supabase = createAdminClient()

    // Get total delivered listings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: listingsCount } = await (supabase as any)
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')

    // Get unique agents
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: agentsCount } = await (supabase as any)
      .from('agents')
      .select('id', { count: 'exact', head: true })

    // Get unique cities served
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cities } = await (supabase as any)
      .from('listings')
      .select('city')
      .eq('status', 'delivered')

    const uniqueCities = new Set((cities || []).map((l: { city: string }) => l.city).filter(Boolean))

    return {
      totalListings: listingsCount || 0,
      totalAgents: agentsCount || 0,
      yearsInBusiness: new Date().getFullYear() - 2019, // Founded 2019
      citiesServed: uniqueCities.size || 0,
    }
  },
  ['company-stats'],
  { revalidate: CACHE_REVALIDATION, tags: ['company'] }
)
