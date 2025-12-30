/**
 * Skill-Match Scheduling Tests
 *
 * Tests for photographer-job skill matching and auto-assignment logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SKILL_CATEGORIES,
  SERVICE_SKILL_REQUIREMENTS,
  getRequiredSkills,
  calculateSkillMatch,
  findBestMatch,
  autoAssignPhotographer,
  type SkillType,
} from './skill-match'

// Global mock chain with setters
let mockData: unknown = []
let mockError: unknown = null

const mockSupabase = {
  from: vi.fn().mockImplementation(() => mockSupabase),
  select: vi.fn().mockImplementation(() => mockSupabase),
  insert: vi.fn().mockImplementation(() => mockSupabase),
  update: vi.fn().mockImplementation(() => mockSupabase),
  eq: vi.fn().mockImplementation(() => mockSupabase),
  in: vi.fn().mockImplementation(() => mockSupabase),
  contains: vi.fn().mockImplementation(() => mockSupabase),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: mockData, error: mockError })),
  // Make the chain awaitable
  then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
    return Promise.resolve({ data: mockData, error: mockError }).then(resolve)
  },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}))

// Helper to set mock data
function setMockData(data: unknown, error: unknown = null) {
  mockData = data
  mockError = error
}

beforeEach(() => {
  vi.clearAllMocks()
  mockData = []
  mockError = null
})

describe('Skill Categories', () => {
  it('should define core photography skills', () => {
    expect(SKILL_CATEGORIES.interior).toBe('Interior Photography')
    expect(SKILL_CATEGORIES.exterior).toBe('Exterior Photography')
    expect(SKILL_CATEGORIES.twilight).toBe('Twilight Photography')
  })

  it('should define specialized skills', () => {
    expect(SKILL_CATEGORIES.drone).toBe('Drone/Aerial')
    expect(SKILL_CATEGORIES.video).toBe('Video Production')
    expect(SKILL_CATEGORIES['3d_tour']).toBe('3D Virtual Tours')
    expect(SKILL_CATEGORIES.floor_plan).toBe('Floor Plan Capture')
  })

  it('should define property type skills', () => {
    expect(SKILL_CATEGORIES.luxury).toBe('Luxury Properties')
    expect(SKILL_CATEGORIES.commercial).toBe('Commercial Real Estate')
    expect(SKILL_CATEGORIES.vacant_land).toBe('Vacant Land')
    expect(SKILL_CATEGORIES.new_construction).toBe('New Construction')
  })

  it('should define certifications', () => {
    expect(SKILL_CATEGORIES.faa_part107).toBe('FAA Part 107 (Drone)')
    expect(SKILL_CATEGORIES.matterport_certified).toBe('Matterport Certified')
  })
})

describe('Service Skill Requirements', () => {
  it('should map standard photo services to skills', () => {
    expect(SERVICE_SKILL_REQUIREMENTS['photos']).toEqual(['interior', 'exterior'])
    expect(SERVICE_SKILL_REQUIREMENTS['mls-photos']).toEqual(['interior', 'exterior'])
    expect(SERVICE_SKILL_REQUIREMENTS['hdr-photos']).toEqual(['interior', 'exterior'])
  })

  it('should map drone services to skills', () => {
    expect(SERVICE_SKILL_REQUIREMENTS['drone']).toEqual(['drone', 'faa_part107'])
    expect(SERVICE_SKILL_REQUIREMENTS['drone-photos']).toEqual(['drone', 'faa_part107'])
    expect(SERVICE_SKILL_REQUIREMENTS['drone-video']).toEqual(['drone', 'video', 'faa_part107'])
  })

  it('should map video services to skills', () => {
    expect(SERVICE_SKILL_REQUIREMENTS['video']).toEqual(['video'])
    expect(SERVICE_SKILL_REQUIREMENTS['listing-video']).toEqual(['video'])
    expect(SERVICE_SKILL_REQUIREMENTS['cinematic-video']).toEqual(['video', 'luxury'])
  })

  it('should map 3D tour services to skills', () => {
    expect(SERVICE_SKILL_REQUIREMENTS['3d-tour']).toEqual(['3d_tour'])
    expect(SERVICE_SKILL_REQUIREMENTS['matterport']).toEqual(['3d_tour', 'matterport_certified'])
    expect(SERVICE_SKILL_REQUIREMENTS['zillow-3d']).toEqual(['3d_tour'])
  })

  it('should map specialty services to skills', () => {
    expect(SERVICE_SKILL_REQUIREMENTS['twilight']).toEqual(['twilight', 'exterior'])
    expect(SERVICE_SKILL_REQUIREMENTS['luxury-photos']).toEqual(['luxury', 'interior', 'exterior'])
    expect(SERVICE_SKILL_REQUIREMENTS['commercial-photos']).toEqual(['commercial', 'interior', 'exterior'])
  })
})

describe('getRequiredSkills', () => {
  it('should return empty array for empty services', () => {
    const result = getRequiredSkills([])
    expect(result).toEqual([])
  })

  it('should return skills for single service', () => {
    const result = getRequiredSkills(['photos'])
    expect(result).toContain('interior')
    expect(result).toContain('exterior')
  })

  it('should combine skills for multiple services', () => {
    const result = getRequiredSkills(['photos', 'drone'])
    expect(result).toContain('interior')
    expect(result).toContain('exterior')
    expect(result).toContain('drone')
    expect(result).toContain('faa_part107')
  })

  it('should deduplicate skills', () => {
    const result = getRequiredSkills(['photos', 'mls-photos', 'hdr-photos'])
    // All require interior/exterior but should only appear once
    const interiorCount = result.filter(s => s === 'interior').length
    const exteriorCount = result.filter(s => s === 'exterior').length
    expect(interiorCount).toBe(1)
    expect(exteriorCount).toBe(1)
  })

  it('should normalize service names with spaces', () => {
    const result = getRequiredSkills(['listing video'])
    expect(result).toContain('video')
  })

  it('should handle unknown services gracefully', () => {
    const result = getRequiredSkills(['unknown-service', 'photos'])
    expect(result).toContain('interior')
    expect(result).toContain('exterior')
    expect(result).toHaveLength(2)
  })

  it('should return all required skills for complex bookings', () => {
    const result = getRequiredSkills(['drone-video', 'matterport', 'twilight'])
    expect(result).toContain('drone')
    expect(result).toContain('video')
    expect(result).toContain('faa_part107')
    expect(result).toContain('3d_tour')
    expect(result).toContain('matterport_certified')
    expect(result).toContain('twilight')
    expect(result).toContain('exterior')
  })
})

describe('calculateSkillMatch', () => {
  it('should return 100% for empty requirements', () => {
    const result = calculateSkillMatch(['interior'], [], [])
    expect(result.score).toBe(100)
    expect(result.matched).toEqual([])
    expect(result.missing).toEqual([])
  })

  it('should calculate perfect match', () => {
    const staffSkills = ['interior', 'exterior']
    const requiredSkills: SkillType[] = ['interior', 'exterior']

    const result = calculateSkillMatch(staffSkills, [], requiredSkills)
    expect(result.score).toBe(100)
    expect(result.matched).toEqual(['interior', 'exterior'])
    expect(result.missing).toEqual([])
  })

  it('should calculate partial match', () => {
    const staffSkills = ['interior']
    const requiredSkills: SkillType[] = ['interior', 'exterior']

    const result = calculateSkillMatch(staffSkills, [], requiredSkills)
    expect(result.score).toBe(50)
    expect(result.matched).toEqual(['interior'])
    expect(result.missing).toEqual(['exterior'])
  })

  it('should calculate no match', () => {
    const staffSkills = ['video']
    const requiredSkills: SkillType[] = ['interior', 'exterior']

    const result = calculateSkillMatch(staffSkills, [], requiredSkills)
    expect(result.score).toBe(0)
    expect(result.matched).toEqual([])
    expect(result.missing).toEqual(['interior', 'exterior'])
  })

  it('should include certifications in skill match', () => {
    const staffSkills = ['drone']
    const certifications = ['faa_part107']
    const requiredSkills: SkillType[] = ['drone', 'faa_part107']

    const result = calculateSkillMatch(staffSkills, certifications, requiredSkills)
    expect(result.score).toBe(100)
    expect(result.matched).toEqual(['drone', 'faa_part107'])
  })

  it('should handle case insensitivity', () => {
    const staffSkills = ['INTERIOR', 'Exterior']
    const requiredSkills: SkillType[] = ['interior', 'exterior']

    const result = calculateSkillMatch(staffSkills, [], requiredSkills)
    expect(result.score).toBe(100)
  })

  it('should round score to integer', () => {
    const staffSkills = ['interior']
    const requiredSkills: SkillType[] = ['interior', 'exterior', 'twilight']

    const result = calculateSkillMatch(staffSkills, [], requiredSkills)
    expect(result.score).toBe(33) // 1/3 = 33.33... rounded to 33
  })
})

describe('findBestMatch', () => {
  const mockPhotographers = [
    {
      id: 'photo-1',
      name: 'John Photographer',
      skills: ['interior', 'exterior', 'drone'],
      certifications: ['faa_part107'],
      home_lat: 28.5383,
      home_lng: -81.3792,
      max_daily_jobs: 5,
      is_active: true,
    },
    {
      id: 'photo-2',
      name: 'Jane Videographer',
      skills: ['video', 'drone'],
      certifications: ['faa_part107'],
      home_lat: 28.6,
      home_lng: -81.4,
      max_daily_jobs: 4,
      is_active: true,
    },
    {
      id: 'photo-3',
      name: 'Bob Specialist',
      skills: ['3d_tour', 'matterport'],
      certifications: ['matterport_certified'],
      home_lat: 28.7,
      home_lng: -81.5,
      max_daily_jobs: 6,
      is_active: true,
    },
  ]

  beforeEach(() => {
    setMockData(mockPhotographers)
  })

  it('should return empty array when no photographers available', async () => {
    setMockData([])

    const result = await findBestMatch({ services: ['photos'] })
    expect(result).toEqual([])
  })

  it('should return empty array on database error', async () => {
    setMockData(null, { message: 'Database error' })

    const result = await findBestMatch({ services: ['photos'] })
    expect(result).toEqual([])
  })

  it('should match photographers by required skills', async () => {
    const result = await findBestMatch({ services: ['photos'] })

    // John should rank highest (has interior/exterior)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].staff.name).toBe('John Photographer')
  })

  it('should filter out photographers with low skill match', async () => {
    const result = await findBestMatch({ services: ['matterport'] })

    // Only Bob has matterport skills
    expect(result.length).toBe(1)
    expect(result[0].staff.name).toBe('Bob Specialist')
  })

  it('should include match details in results', async () => {
    const result = await findBestMatch({ services: ['photos'] })

    expect(result[0].matchDetails).toBeDefined()
    expect(result[0].matchDetails.requiredSkills).toBeDefined()
    expect(result[0].matchDetails.matchedSkills).toBeDefined()
    expect(result[0].matchDetails.missingSkills).toBeDefined()
  })

  it('should calculate distance when coordinates provided', async () => {
    const result = await findBestMatch({
      services: ['photos'],
      lat: 28.5383,
      lng: -81.3792,
    })

    expect(result[0].distance).toBeDefined()
    expect(typeof result[0].distance).toBe('number')
  })

  it('should sort candidates by score', async () => {
    const result = await findBestMatch({ services: ['photos'] })

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score)
    }
  })

  it('should add luxury skill requirement for luxury property type', async () => {
    const result = await findBestMatch({
      services: ['photos'],
      propertyType: 'luxury',
    })

    // Should require luxury skill
    expect(result.some(c =>
      c.matchDetails.requiredSkills.includes('luxury')
    )).toBe(true)
  })

  it('should add commercial skill for commercial property type', async () => {
    const result = await findBestMatch({
      services: ['photos'],
      propertyType: 'commercial',
    })

    expect(result.some(c =>
      c.matchDetails.requiredSkills.includes('commercial')
    )).toBe(true)
  })

  it('should add vacant_land skill for land property type', async () => {
    const result = await findBestMatch({
      services: ['photos'],
      propertyType: 'land',
    })

    expect(result.some(c =>
      c.matchDetails.requiredSkills.includes('vacant_land')
    )).toBe(true)
  })
})

describe('autoAssignPhotographer', () => {
  const mockPhotographers = [
    {
      id: 'photo-1',
      name: 'John Photographer',
      skills: ['interior', 'exterior'],
      certifications: [],
      home_lat: 28.5383,
      home_lng: -81.3792,
      max_daily_jobs: 5,
      is_active: true,
    },
  ]

  beforeEach(() => {
    setMockData(mockPhotographers)
  })

  it('should return error when no photographers available', async () => {
    setMockData([])

    const result = await autoAssignPhotographer('job-123', {
      services: ['photos'],
      scheduledDate: '2024-01-15',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('No qualified photographers')
  })

  it('should return error for low score matches', async () => {
    setMockData([
      {
        id: 'photo-1',
        name: 'Weak Match',
        skills: ['video'],
        certifications: [],
        home_lat: null,
        home_lng: null,
        max_daily_jobs: 5,
        is_active: true,
      },
    ])

    const result = await autoAssignPhotographer('job-123', {
      services: ['matterport'],
      scheduledDate: '2024-01-15',
    })

    // Will return no match because score < 60
    expect(result.success).toBe(false)
  })

  it('should create assignment for good match', async () => {
    const result = await autoAssignPhotographer('job-123', {
      services: ['photos'],
      scheduledDate: '2024-01-15',
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('photographer_assignments')
  })

  it('should return assigned staff on success', async () => {
    const result = await autoAssignPhotographer('job-123', {
      services: ['photos'],
      scheduledDate: '2024-01-15',
    })

    expect(result.success).toBe(true)
    expect(result.assignedTo).toBeDefined()
    expect(result.assignedTo?.name).toBe('John Photographer')
  })
})

describe('Distance Calculation', () => {
  it('should calculate distance between coordinates', async () => {
    setMockData([
      {
        id: 'photo-1',
        name: 'Orlando Photographer',
        skills: ['interior', 'exterior'],
        certifications: [],
        home_lat: 28.5383, // Orlando
        home_lng: -81.3792,
        max_daily_jobs: 5,
        is_active: true,
      },
    ])

    const result = await findBestMatch({
      services: ['photos'],
      lat: 27.9506, // Tampa (about 85 miles away)
      lng: -82.4572,
    })

    expect(result.length).toBe(1)
    expect(result[0].distance).toBeDefined()
    // Distance should be roughly 85 miles
    expect(result[0].distance).toBeGreaterThan(70)
    expect(result[0].distance).toBeLessThan(100)
  })

  it('should give higher score to closer photographers', async () => {
    setMockData([
      {
        id: 'photo-1',
        name: 'Close Photographer',
        skills: ['interior', 'exterior'],
        certifications: [],
        home_lat: 28.54,
        home_lng: -81.38,
        max_daily_jobs: 5,
        is_active: true,
      },
      {
        id: 'photo-2',
        name: 'Far Photographer',
        skills: ['interior', 'exterior'],
        certifications: [],
        home_lat: 27.95, // Tampa
        home_lng: -82.46,
        max_daily_jobs: 5,
        is_active: true,
      },
    ])

    const result = await findBestMatch({
      services: ['photos'],
      lat: 28.5383,
      lng: -81.3792,
    })

    // Close photographer should have higher score
    expect(result[0].staff.name).toBe('Close Photographer')
    expect(result[0].score).toBeGreaterThan(result[1].score)
  })
})

describe('Territory Matching', () => {
  it('should check territory when zip_code is provided', async () => {
    setMockData([
      {
        id: 'photo-1',
        name: 'Territory Photographer',
        skills: ['interior', 'exterior'],
        certifications: [],
        home_lat: 28.5383,
        home_lng: -81.3792,
        max_daily_jobs: 5,
        is_active: true,
      },
    ])

    // Mock territory lookup - when no territories match, territoryMatch is false
    const result = await findBestMatch({
      services: ['photos'],
      zip_code: '32801',
    })

    expect(result.length).toBe(1)
    // Without territory data found, territoryMatch will be false (not in matchingTerritoryStaff set)
    expect(result[0].territoryMatch).toBe(false)
  })

  it('should have territoryMatch true when no zip_code provided', async () => {
    setMockData([
      {
        id: 'photo-1',
        name: 'Photographer',
        skills: ['interior', 'exterior'],
        certifications: [],
        home_lat: 28.5383,
        home_lng: -81.3792,
        max_daily_jobs: 5,
        is_active: true,
      },
    ])

    // Without zip_code, territory matching is skipped
    const result = await findBestMatch({
      services: ['photos'],
    })

    expect(result.length).toBe(1)
    // When no zip_code provided, territoryMatch defaults to true
    expect(result[0].territoryMatch).toBe(true)
  })
})
