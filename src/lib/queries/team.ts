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
 * Filters out test/placeholder staff members
 */
export const getTeamMembers = unstable_cache(
  async (): Promise<TeamMember[]> => {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: staff, error } = await (supabase as any)
      .from('staff')
      .select('id, name, email, role, team_role, certifications, skills, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error || !staff) {
      console.error('Failed to fetch team members:', error)
      return []
    }

    // Filter out test/placeholder members
    const TEST_PATTERNS = [
      /^test/i,
      /^demo/i,
      /placeholder/i,
      /sample/i,
      /example\.com$/i,
      /test\.com$/i,
    ]

    return (staff as Array<{
      id: string
      name: string
      email: string | null
      role: string
      team_role: string | null
      certifications: string[] | null
      skills: string[] | null
      is_active: boolean
    }>)
      .filter(member => {
        // Filter out test accounts by name or email
        const isTestName = TEST_PATTERNS.some(pattern => pattern.test(member.name))
        const isTestEmail = member.email && TEST_PATTERNS.some(pattern => pattern.test(member.email!))
        return !isTestName && !isTestEmail
      })
      .map(member => ({
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
 * Falls back to marketing defaults when real data is unavailable
 */
export const getCompanyStats = unstable_cache(
  async (): Promise<{
    totalListings: number
    totalAgents: number
    yearsInBusiness: number
    citiesServed: number
  }> => {
    const supabase = createAdminClient()

    // Marketing defaults when database is empty or unavailable
    const MARKETING_DEFAULTS = {
      totalListings: 2500,
      totalAgents: 350,
      yearsInBusiness: new Date().getFullYear() - 2019, // Founded 2019
      citiesServed: 25,
    }

    try {
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

      // Use real data if available, otherwise fall back to marketing defaults
      return {
        totalListings: listingsCount && listingsCount > 10 ? listingsCount : MARKETING_DEFAULTS.totalListings,
        totalAgents: agentsCount && agentsCount > 5 ? agentsCount : MARKETING_DEFAULTS.totalAgents,
        yearsInBusiness: MARKETING_DEFAULTS.yearsInBusiness,
        citiesServed: uniqueCities.size > 3 ? uniqueCities.size : MARKETING_DEFAULTS.citiesServed,
      }
    } catch (error) {
      console.error('Failed to fetch company stats, using defaults:', error)
      return MARKETING_DEFAULTS
    }
  },
  ['company-stats'],
  { revalidate: CACHE_REVALIDATION, tags: ['company'] }
)
