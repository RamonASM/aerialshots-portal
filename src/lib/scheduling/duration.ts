/**
 * Shoot Duration Calculation
 *
 * Ported from asm-agent-backend.
 * Calculates estimated shoot duration based on square footage and selected services.
 */

/**
 * Additional time in minutes for each service type
 */
export const SERVICE_DURATIONS: Record<string, number> = {
  droneAddOn: 20,
  droneOnly: 30,
  zillow3d: 30,
  listingVideo: 45,
  lifestyleVid: 30,
  dayToNight: 120,
  signatureVid: 90,
  realTwilight: 45,
  render3d: 0, // Post-production only
  '3dFloor': 15,
}

/**
 * Calculates the base shoot duration based on square footage
 */
export function getBaseDuration(sqft: number): number {
  // Larger homes take more time for photography
  if (sqft >= 5000) return 120 // 2 hours
  if (sqft >= 3500) return 90 // 1.5 hours
  return 75 // 1.25 hours
}

/**
 * Calculates the total shoot duration in minutes
 *
 * @param sqft - Square footage of the property
 * @param services - Array of service IDs
 * @returns Duration in minutes
 */
export function calculateShootDuration(sqft: number, services: string[] = []): number {
  const base = getBaseDuration(sqft)

  let additional = 0
  for (const service of services) {
    additional += SERVICE_DURATIONS[service] ?? 0
  }

  return base + additional
}

/**
 * Formats duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`
  }

  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`
}

/**
 * Gets the duration range as a string for display
 */
export function getDurationRange(sqft: number, services: string[] = []): string {
  const duration = calculateShootDuration(sqft, services)
  const min = duration
  const max = duration + 30 // Add buffer time

  return `${formatDuration(min)} - ${formatDuration(max)}`
}

/**
 * Calculates the end time given a start time and duration
 */
export function calculateEndTime(startTime: Date, sqft: number, services: string[] = []): Date {
  const duration = calculateShootDuration(sqft, services)
  return new Date(startTime.getTime() + duration * 60 * 1000)
}
