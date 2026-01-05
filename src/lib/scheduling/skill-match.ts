// Skill-Based Assignment Logic
// Matches photographers to jobs based on required skills, territory, and availability

import { createAdminClient } from '@/lib/supabase/admin'

// Skill categories and requirements
export const SKILL_CATEGORIES = {
  // Core photography skills
  interior: 'Interior Photography',
  exterior: 'Exterior Photography',
  twilight: 'Twilight Photography',

  // Specialized skills
  drone: 'Drone/Aerial',
  video: 'Video Production',
  '3d_tour': '3D Virtual Tours',
  'floor_plan': 'Floor Plan Capture',

  // Property types
  luxury: 'Luxury Properties',
  commercial: 'Commercial Real Estate',
  vacant_land: 'Vacant Land',
  new_construction: 'New Construction',

  // Certifications
  faa_part107: 'FAA Part 107 (Drone)',
  matterport_certified: 'Matterport Certified',
} as const

export type SkillType = keyof typeof SKILL_CATEGORIES

// Service to skill mapping
export const SERVICE_SKILL_REQUIREMENTS: Record<string, SkillType[]> = {
  // Standard photo services
  'photos': ['interior', 'exterior'],
  'mls-photos': ['interior', 'exterior'],
  'hdr-photos': ['interior', 'exterior'],

  // Specialty photo services
  'twilight': ['twilight', 'exterior'],
  'luxury-photos': ['luxury', 'interior', 'exterior'],

  // Drone services
  'drone': ['drone', 'faa_part107'],
  'drone-photos': ['drone', 'faa_part107'],
  'drone-video': ['drone', 'video', 'faa_part107'],
  'aerial': ['drone', 'faa_part107'],

  // Video services
  'video': ['video'],
  'listing-video': ['video'],
  'social-video': ['video'],
  'cinematic-video': ['video', 'luxury'],

  // 3D/Virtual tours
  '3d-tour': ['3d_tour'],
  'matterport': ['3d_tour', 'matterport_certified'],
  'zillow-3d': ['3d_tour'],

  // Floor plans
  'floor-plan': ['floor_plan'],
  '2d-floor-plan': ['floor_plan'],
  '3d-floor-plan': ['floor_plan'],

  // Property type specific
  'commercial-photos': ['commercial', 'interior', 'exterior'],
  'land-photos': ['vacant_land', 'drone'],
}

interface StaffMember {
  id: string
  name: string
  skills: string[]
  certifications: string[]
  home_lat: number | null
  home_lng: number | null
  max_daily_jobs: number
  is_active: boolean
  territories?: string[] // territory IDs
}

interface JobRequirements {
  services: string[]
  propertyType?: 'residential' | 'commercial' | 'land' | 'luxury'
  lat?: number
  lng?: number
  zip_code?: string
  date?: string // ISO date string
}

interface AssignmentCandidate {
  staff: StaffMember
  score: number
  skillMatch: number
  territoryMatch: boolean
  distance?: number // miles
  availableSlots?: number
  matchDetails: {
    requiredSkills: SkillType[]
    matchedSkills: SkillType[]
    missingSkills: SkillType[]
  }
}

/**
 * Get required skills for a set of services
 */
export function getRequiredSkills(services: string[]): SkillType[] {
  const skills = new Set<SkillType>()

  for (const service of services) {
    const normalizedService = service.toLowerCase().replace(/\s+/g, '-')
    const requiredSkills = SERVICE_SKILL_REQUIREMENTS[normalizedService]

    if (requiredSkills) {
      requiredSkills.forEach(skill => skills.add(skill))
    }
  }

  return Array.from(skills)
}

/**
 * Calculate skill match score between staff and requirements
 * Returns a score from 0-100
 */
export function calculateSkillMatch(
  staffSkills: string[],
  staffCertifications: string[],
  requiredSkills: SkillType[]
): { score: number; matched: SkillType[]; missing: SkillType[] } {
  if (requiredSkills.length === 0) {
    return { score: 100, matched: [], missing: [] }
  }

  const allStaffSkills = new Set([
    ...staffSkills.map(s => s.toLowerCase()),
    ...staffCertifications.map(c => c.toLowerCase()),
  ])

  const matched: SkillType[] = []
  const missing: SkillType[] = []

  for (const skill of requiredSkills) {
    if (allStaffSkills.has(skill)) {
      matched.push(skill)
    } else {
      missing.push(skill)
    }
  }

  const score = Math.round((matched.length / requiredSkills.length) * 100)

  return { score, matched, missing }
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Find the best photographer match for a job
 */
export async function findBestMatch(
  requirements: JobRequirements
): Promise<AssignmentCandidate[]> {
  const supabase = createAdminClient()

  // Get required skills from services
  const requiredSkills = getRequiredSkills(requirements.services)

  // Add property type skills
  if (requirements.propertyType === 'luxury') {
    requiredSkills.push('luxury')
  } else if (requirements.propertyType === 'commercial') {
    requiredSkills.push('commercial')
  } else if (requirements.propertyType === 'land') {
    requiredSkills.push('vacant_land')
  }

  // Fetch active photographers
  // Note: skills/certifications columns may not be in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photographers, error } = await (supabase as any)
    .from('staff')
    .select('id, name, skills, certifications, home_lat, home_lng, max_daily_jobs, is_active')
    .eq('is_active', true)
    .in('role', ['photographer', 'videographer']) as { data: Array<{
      id: string
      name: string
      skills: string[] | null
      certifications: string[] | null
      home_lat: number | null
      home_lng: number | null
      max_daily_jobs: number | null
      is_active: boolean
    }> | null; error: Error | null }

  if (error || !photographers) {
    console.error('Error fetching photographers:', error)
    return []
  }

  // Get territory assignments if we have a zip code
  let staffTerritories: Map<string, string[]> = new Map()
  let matchingTerritoryStaff: Set<string> = new Set()

  if (requirements.zip_code) {
    try {
      // Find territories that include this zip code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: territories } = await (supabase as any)
        .from('service_territories')
        .select('id')
        .contains('zip_codes', [requirements.zip_code])
        .eq('is_active', true)

      if (territories?.length) {
        const territoryIds = territories.map((t: { id: string }) => t.id)

        // Find staff assigned to these territories
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: assignments } = await (supabase as any)
          .from('staff_territories')
          .select('staff_id, territory_id')
          .in('territory_id', territoryIds)

        if (assignments) {
          for (const a of assignments) {
            matchingTerritoryStaff.add(a.staff_id)
            if (!staffTerritories.has(a.staff_id)) {
              staffTerritories.set(a.staff_id, [])
            }
            staffTerritories.get(a.staff_id)?.push(a.territory_id)
          }
        }
      }
    } catch {
      // Tables may not exist yet
    }
  }

  // Calculate scores for each photographer
  const candidates: AssignmentCandidate[] = []

  for (const photographer of photographers) {
    const { score, matched, missing } = calculateSkillMatch(
      photographer.skills || [],
      photographer.certifications || [],
      requiredSkills
    )

    // Skip if critical skills are missing (score < 60)
    if (score < 60 && requiredSkills.length > 0) {
      continue
    }

    const territoryMatch = requirements.zip_code
      ? matchingTerritoryStaff.has(photographer.id)
      : true

    // Calculate distance if coordinates available
    let distance: number | undefined
    if (
      requirements.lat &&
      requirements.lng &&
      photographer.home_lat &&
      photographer.home_lng
    ) {
      distance = calculateDistance(
        photographer.home_lat,
        photographer.home_lng,
        requirements.lat,
        requirements.lng
      )
    }

    // Calculate overall score
    // Weighted: Skills (50%) + Territory (30%) + Distance (20%)
    let overallScore = score * 0.5

    if (territoryMatch) {
      overallScore += 30
    }

    if (distance !== undefined) {
      // Closer = better score (max 20 points, decreases with distance)
      const distanceScore = Math.max(0, 20 - distance * 0.5)
      overallScore += distanceScore
    } else {
      overallScore += 10 // Neutral if no distance data
    }

    candidates.push({
      staff: {
        id: photographer.id,
        name: photographer.name,
        skills: photographer.skills || [],
        certifications: photographer.certifications || [],
        home_lat: photographer.home_lat,
        home_lng: photographer.home_lng,
        max_daily_jobs: photographer.max_daily_jobs ?? 6,
        is_active: photographer.is_active ?? true,
        territories: staffTerritories.get(photographer.id),
      },
      score: Math.round(overallScore),
      skillMatch: score,
      territoryMatch,
      distance,
      matchDetails: {
        requiredSkills,
        matchedSkills: matched,
        missingSkills: missing,
      },
    })
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score)

  return candidates
}

/**
 * Auto-assign photographer to a job
 */
export async function autoAssignPhotographer(
  jobId: string,
  requirements: JobRequirements & { scheduledDate: string }
): Promise<{ success: boolean; assignedTo?: StaffMember; error?: string }> {
  const candidates = await findBestMatch(requirements)

  if (candidates.length === 0) {
    return {
      success: false,
      error: 'No qualified photographers available for this job',
    }
  }

  const bestMatch = candidates[0]

  // Check minimum score threshold
  if (bestMatch.score < 50) {
    return {
      success: false,
      error: `Best match (${bestMatch.staff.name}) has low score (${bestMatch.score}). Manual assignment recommended.`,
    }
  }

  const supabase = createAdminClient()

  // Create photographer assignment
  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('photographer_assignments' as any)
    .insert({
      listing_id: jobId,
      photographer_id: bestMatch.staff.id,
      scheduled_date: requirements.scheduledDate,
      status: 'assigned',
      notes: `Auto-assigned. Score: ${bestMatch.score}, Skills: ${bestMatch.skillMatch}%`,
    })

  if (error) {
    console.error('Error creating assignment:', error)
    return {
      success: false,
      error: 'Failed to create assignment',
    }
  }

  return {
    success: true,
    assignedTo: bestMatch.staff,
  }
}
