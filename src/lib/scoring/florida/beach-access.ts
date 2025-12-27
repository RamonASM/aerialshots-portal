// Beach Access Feature - Central Florida Unique
// Evaluates proximity to both Atlantic (East) and Gulf (West) coasts

export interface Beach {
  name: string
  coast: 'atlantic' | 'gulf'
  lat: number
  lng: number
  type: 'surfing' | 'family' | 'quiet' | 'party'
  highlights: string[]
}

export interface BeachProximity {
  beach: Beach
  distanceMiles: number
  driveMinutes: number
}

export interface BeachAccessProfile {
  nearestBeach: BeachProximity
  nearestAtlantic: BeachProximity
  nearestGulf: BeachProximity
  atlanticBeaches: BeachProximity[]
  gulfBeaches: BeachProximity[]
  dualCoastScore: number // 0-100: access to BOTH coasts
  beachAccessScore: number // 0-100: overall beach accessibility
  summary: string
}

// Major Central Florida Beaches
const BEACHES: Beach[] = [
  // Atlantic Coast (East)
  {
    name: 'Cocoa Beach',
    coast: 'atlantic',
    lat: 28.3200,
    lng: -80.6076,
    type: 'surfing',
    highlights: ['Great surfing', 'Ron Jon Surf Shop', 'Near Kennedy Space Center'],
  },
  {
    name: 'New Smyrna Beach',
    coast: 'atlantic',
    lat: 29.0258,
    lng: -80.9270,
    type: 'surfing',
    highlights: ['East Coast surf capital', 'Less crowded than Daytona', 'Local vibe'],
  },
  {
    name: 'Daytona Beach',
    coast: 'atlantic',
    lat: 29.2108,
    lng: -81.0228,
    type: 'party',
    highlights: ['Drive on the beach', 'Boardwalk', 'Spring break destination'],
  },
  {
    name: 'Melbourne Beach',
    coast: 'atlantic',
    lat: 28.0686,
    lng: -80.5603,
    type: 'quiet',
    highlights: ['Sea turtle nesting', 'Sebastian Inlet nearby', 'Less touristy'],
  },
  {
    name: 'Vero Beach',
    coast: 'atlantic',
    lat: 27.6386,
    lng: -80.3973,
    type: 'quiet',
    highlights: ['Upscale beach town', 'Great for families', 'Disney resort'],
  },

  // Gulf Coast (West)
  {
    name: 'Clearwater Beach',
    coast: 'gulf',
    lat: 27.9659,
    lng: -82.8265,
    type: 'family',
    highlights: ['#1 rated beach', 'Calm waters', 'Pier 60 sunset'],
  },
  {
    name: 'St. Pete Beach',
    coast: 'gulf',
    lat: 27.7253,
    lng: -82.7412,
    type: 'family',
    highlights: ['Historic Don CeSar hotel', 'Wide sandy beaches', 'Great restaurants'],
  },
  {
    name: 'Siesta Key',
    coast: 'gulf',
    lat: 27.2658,
    lng: -82.5469,
    type: 'quiet',
    highlights: ['Quartz crystal sand', 'Consistently ranked #1', 'Cool sand'],
  },
  {
    name: 'Treasure Island',
    coast: 'gulf',
    lat: 27.7670,
    lng: -82.7687,
    type: 'quiet',
    highlights: ['3 miles of beach', 'Less crowded than Clearwater', 'Good shelling'],
  },
  {
    name: 'Anna Maria Island',
    coast: 'gulf',
    lat: 27.5253,
    lng: -82.7334,
    type: 'quiet',
    highlights: ['Old Florida charm', 'No high-rises', 'Historic fishing pier'],
  },
  {
    name: 'Tarpon Springs',
    coast: 'gulf',
    lat: 28.1461,
    lng: -82.7570,
    type: 'quiet',
    highlights: ['Greek sponge diving heritage', 'Authentic Greek food', 'Unique beach experience'],
  },
]

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
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Estimate drive time based on distance
 */
function estimateDriveMinutes(distanceMiles: number): number {
  // Average highway speed: ~55 mph for beach trips
  const avgSpeedMph = 50
  return Math.round((distanceMiles / avgSpeedMph) * 60)
}

/**
 * Calculate beach proximity
 */
function calculateBeachProximity(lat: number, lng: number, beach: Beach): BeachProximity {
  const distanceMiles = calculateDistance(lat, lng, beach.lat, beach.lng)
  return {
    beach,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    driveMinutes: estimateDriveMinutes(distanceMiles),
  }
}

/**
 * Calculate dual coast score
 * Having easy access to BOTH coasts is a unique Central Florida advantage
 */
function calculateDualCoastScore(
  nearestAtlantic: BeachProximity,
  nearestGulf: BeachProximity
): number {
  // Ideal: both coasts within 90 minutes
  const atlanticMinutes = nearestAtlantic.driveMinutes
  const gulfMinutes = nearestGulf.driveMinutes
  const furtherCoast = Math.max(atlanticMinutes, gulfMinutes)

  // Score: 90 min to both = 100, 180 min to furthest = 0
  if (furtherCoast <= 60) return 100
  if (furtherCoast >= 180) return 0

  // Linear scale between 60-180 minutes
  return Math.round(100 - ((furtherCoast - 60) / 120) * 100)
}

/**
 * Calculate overall beach access score
 */
function calculateBeachAccessScore(nearestBeach: BeachProximity): number {
  const minutes = nearestBeach.driveMinutes

  // Score: 30 min = 100, 120 min = 0
  if (minutes <= 30) return 100
  if (minutes >= 120) return 0

  return Math.round(100 - ((minutes - 30) / 90) * 100)
}

/**
 * Generate beach access summary
 */
function generateSummary(profile: Omit<BeachAccessProfile, 'summary'>): string {
  const { nearestBeach, nearestAtlantic, nearestGulf, dualCoastScore } = profile

  if (dualCoastScore >= 80) {
    return `Prime Central Florida location! Both coasts within ${Math.max(nearestAtlantic.driveMinutes, nearestGulf.driveMinutes)} minutes. ${nearestBeach.beach.name} is your closest beach at just ${nearestBeach.driveMinutes} minutes.`
  } else if (dualCoastScore >= 50) {
    return `Great beach access with ${nearestBeach.beach.name} (${nearestBeach.beach.coast} coast) ${nearestBeach.driveMinutes} minutes away. ${nearestGulf.driveMinutes < nearestAtlantic.driveMinutes ? 'Gulf' : 'Atlantic'} coast is closer.`
  } else if (nearestBeach.driveMinutes <= 60) {
    return `Good beach access to the ${nearestBeach.beach.coast} coast. ${nearestBeach.beach.name} is ${nearestBeach.driveMinutes} minutes away.`
  } else {
    return `Beach trips are a day excursion. Your nearest beach is ${nearestBeach.beach.name} at ${nearestBeach.driveMinutes} minutes.`
  }
}

/**
 * Calculate complete beach access profile
 */
export function calculateBeachAccess(lat: number, lng: number): BeachAccessProfile {
  // Calculate proximity to all beaches
  const allProximities = BEACHES.map((beach) => calculateBeachProximity(lat, lng, beach))

  // Sort by drive time
  const sorted = [...allProximities].sort((a, b) => a.driveMinutes - b.driveMinutes)

  // Separate by coast
  const atlanticBeaches = sorted
    .filter((p) => p.beach.coast === 'atlantic')
    .slice(0, 5) // Top 5
  const gulfBeaches = sorted
    .filter((p) => p.beach.coast === 'gulf')
    .slice(0, 5)

  // Find nearest of each
  const nearestBeach = sorted[0]
  const nearestAtlantic = atlanticBeaches[0]
  const nearestGulf = gulfBeaches[0]

  // Calculate scores
  const dualCoastScore = calculateDualCoastScore(nearestAtlantic, nearestGulf)
  const beachAccessScore = calculateBeachAccessScore(nearestBeach)

  const profile = {
    nearestBeach,
    nearestAtlantic,
    nearestGulf,
    atlanticBeaches,
    gulfBeaches,
    dualCoastScore,
    beachAccessScore,
    summary: '',
  }

  return {
    ...profile,
    summary: generateSummary(profile),
  }
}

/**
 * Get beach type recommendations
 */
export function getBeachRecommendations(
  profile: BeachAccessProfile,
  preference: 'surfing' | 'family' | 'quiet' | 'any' = 'any'
): BeachProximity[] {
  const allBeaches = [...profile.atlanticBeaches, ...profile.gulfBeaches]

  if (preference === 'any') {
    return allBeaches.slice(0, 5)
  }

  return allBeaches
    .filter((p) => p.beach.type === preference)
    .slice(0, 3)
}

/**
 * Get beach day trip recommendation
 */
export function getBeachDayTripRecommendation(lat: number, lng: number): {
  recommended: BeachProximity
  reason: string
  alternates: BeachProximity[]
} {
  const profile = calculateBeachAccess(lat, lng)

  // Prefer Gulf coast for calmer waters if similar distance
  const gulfNearest = profile.nearestGulf
  const atlanticNearest = profile.nearestAtlantic

  let recommended: BeachProximity
  let reason: string

  // If Gulf is within 15 minutes of Atlantic, prefer Gulf for calmer waters
  if (gulfNearest.driveMinutes <= atlanticNearest.driveMinutes + 15) {
    recommended = gulfNearest
    reason = 'Gulf coast recommended for calmer waters and spectacular sunsets'
  } else {
    recommended = atlanticNearest
    reason = 'Atlantic coast is significantly closer, great for surfing and sunrise'
  }

  // Get alternates
  const alternates = [
    gulfNearest === recommended ? atlanticNearest : gulfNearest,
    ...profile.gulfBeaches.slice(1, 2),
    ...profile.atlanticBeaches.slice(1, 2),
  ].filter((b) => b.beach.name !== recommended.beach.name)

  return {
    recommended,
    reason,
    alternates: alternates.slice(0, 3),
  }
}
