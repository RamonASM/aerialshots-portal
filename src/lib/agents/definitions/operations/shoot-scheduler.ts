// Shoot Scheduler Agent
// Generates optimal schedule recommendations for photography shoots

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { createAdminClient } from '@/lib/supabase/admin'

interface ShootSchedulerInput {
  listingId: string
  preferredDates?: string[] // ISO date strings
  services: string[] // photo, video, drone, twilight, etc.
  isRush?: boolean
  sellerAvailability?: {
    date: string
    timeSlots: string[]
  }[]
  notes?: string
}

interface TimeSlot {
  start: string // HH:MM format
  end: string
  label: string
  isOptimal: boolean
  reason?: string
}

interface ScheduleRecommendation {
  date: string
  timeSlots: TimeSlot[]
  weatherConsiderations?: string
  lightingNotes?: string
  durationMinutes: number
  priority: number
}

interface ShootSchedulerOutput {
  listingId: string
  services: string[]
  estimatedDuration: number
  recommendations: ScheduleRecommendation[]
  twilightWindow?: {
    date: string
    goldenHour: string
    blueHour: string
  }
  schedulingNotes: string[]
}

const SCHEDULER_PROMPT = `You are a professional real estate photography scheduler optimizing shoot times.

Consider these factors for optimal scheduling:
1. **Lighting**: Best interior photos are shot mid-morning (9-11am) when light is soft but bright
2. **Exterior**: Front-facing direction affects best time (east-facing = morning, west-facing = afternoon)
3. **Twilight**: Blue hour is 20-30 min after sunset, golden hour is 30-60 min before sunset
4. **Weather**: Cloudy days provide even lighting; sunny days create harsh shadows
5. **Traffic**: Avoid school drop-off times (7:30-8:30am) and rush hours for drone shots
6. **Staging**: Morning shoots often look cleaner before daily activity

For video shoots:
- Need consistent lighting throughout (2-3 hour window minimum)
- Prefer overcast days to avoid shadow movement
- Interior-focused videos have more scheduling flexibility

For drone:
- Best during golden hour or overcast conditions
- Avoid midday sun (harsh shadows on roofs)
- Check wind conditions (10mph+ can affect quality)

Provide scheduling recommendations as JSON:
{
  "optimalTimeSlots": [
    {
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "priority": 1,
      "reason": "Why this time is optimal"
    }
  ],
  "avoidTimes": ["List of times to avoid with reasons"],
  "twilightRecommendation": "If twilight is requested, best date/time",
  "weatherNotes": "Any weather considerations",
  "durationEstimate": 90
}`

/**
 * Calculate estimated duration based on services
 */
function calculateDuration(services: string[], sqft?: number): number {
  let baseDuration = 45 // Base photo time

  // Add time per service
  services.forEach(service => {
    const s = service.toLowerCase()
    if (s.includes('video') || s.includes('walkthrough')) baseDuration += 45
    if (s.includes('drone') || s.includes('aerial')) baseDuration += 30
    if (s.includes('twilight')) baseDuration += 30
    if (s.includes('3d') || s.includes('matterport') || s.includes('zillow')) baseDuration += 30
    if (s.includes('floor') && s.includes('plan')) baseDuration += 20
    if (s.includes('staging')) baseDuration += 15
  })

  // Adjust for property size
  if (sqft && sqft > 3000) baseDuration += 20
  if (sqft && sqft > 5000) baseDuration += 30

  return baseDuration
}

/**
 * Generate default time slots for a date
 */
function getDefaultTimeSlots(services: string[], hasVideo: boolean): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Early morning (less ideal but available)
  slots.push({
    start: '08:00',
    end: '10:00',
    label: 'Early Morning',
    isOptimal: false,
    reason: 'Sun may still be low, shadows possible',
  })

  // Mid-morning (optimal for most shoots)
  slots.push({
    start: '10:00',
    end: '12:00',
    label: 'Mid-Morning',
    isOptimal: true,
    reason: 'Best natural lighting for interiors',
  })

  // Early afternoon
  slots.push({
    start: '12:00',
    end: '14:00',
    label: 'Early Afternoon',
    isOptimal: !hasVideo,
    reason: hasVideo ? 'Lighting may shift during video' : 'Good consistent light',
  })

  // Late afternoon (good for west-facing exteriors)
  slots.push({
    start: '14:00',
    end: '16:00',
    label: 'Late Afternoon',
    isOptimal: false,
    reason: 'Good for west-facing properties',
  })

  return slots
}

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input, config } = context
  const schedulerInput = input as unknown as ShootSchedulerInput

  if (!schedulerInput.listingId) {
    return {
      success: false,
      error: 'listingId is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  if (!schedulerInput.services?.length) {
    return {
      success: false,
      error: 'services array is required',
      errorCode: 'MISSING_SERVICES',
    }
  }

  const supabase = createAdminClient()

  try {
    // 1. Fetch listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('address, city, state, lat, lng, sqft')
      .eq('id', schedulerInput.listingId)
      .single()

    if (listingError || !listing) {
      return {
        success: false,
        error: 'Listing not found',
        errorCode: 'LISTING_NOT_FOUND',
      }
    }

    // 2. Calculate estimated duration
    const estimatedDuration = calculateDuration(schedulerInput.services, listing.sqft || undefined)

    // 3. Determine if specific services are included
    const hasVideo = schedulerInput.services.some(s =>
      s.toLowerCase().includes('video') || s.toLowerCase().includes('walkthrough')
    )
    const hasDrone = schedulerInput.services.some(s =>
      s.toLowerCase().includes('drone') || s.toLowerCase().includes('aerial')
    )
    const hasTwilight = schedulerInput.services.some(s =>
      s.toLowerCase().includes('twilight')
    )

    // 4. Get AI recommendations
    const prompt = `${SCHEDULER_PROMPT}

Property Details:
- Address: ${listing.address}, ${listing.city}, ${listing.state}
- Square Feet: ${listing.sqft?.toLocaleString() || 'Unknown'}
- Coordinates: ${listing.lat}, ${listing.lng}

Services Requested:
${schedulerInput.services.map(s => `- ${s}`).join('\n')}

${schedulerInput.isRush ? '⚡ RUSH ORDER - prioritize earliest availability' : ''}
${schedulerInput.notes ? `Notes: ${schedulerInput.notes}` : ''}

${schedulerInput.sellerAvailability?.length
    ? `Seller Available:\n${schedulerInput.sellerAvailability.map(a => `- ${a.date}: ${a.timeSlots.join(', ')}`).join('\n')}`
    : 'Seller availability not specified'
}

Generate optimal scheduling recommendations.`

    const aiResponse = await generateWithAI({
      prompt,
      maxTokens: config.maxTokens || 800,
      temperature: config.temperature || 0.3,
      maxRetries: config.retryAttempts || 3,
    })

    // 5. Parse AI response
    let aiRecommendation: {
      optimalTimeSlots?: Array<{
        startTime: string
        endTime: string
        priority: number
        reason: string
      }>
      avoidTimes?: string[]
      twilightRecommendation?: string
      weatherNotes?: string
      durationEstimate?: number
    } = {}

    try {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiRecommendation = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Use defaults if parsing fails
    }

    // 6. Build recommendations for preferred dates (or next 5 weekdays)
    let recommendationDates = schedulerInput.preferredDates || []

    if (recommendationDates.length === 0) {
      // Generate next 5 weekdays
      const dates: string[] = []
      const today = new Date()
      let daysChecked = 0

      while (dates.length < 5 && daysChecked < 14) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + daysChecked + 1)

        const dayOfWeek = checkDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
          dates.push(checkDate.toISOString().split('T')[0])
        }
        daysChecked++
      }
      recommendationDates = dates
    }

    // 7. Build schedule recommendations
    const recommendations: ScheduleRecommendation[] = recommendationDates.map((date, index) => {
      const defaultSlots = getDefaultTimeSlots(schedulerInput.services, hasVideo)

      // Enhance with AI recommendations if available
      const enhancedSlots: TimeSlot[] = defaultSlots.map(slot => {
        const aiSlot = aiRecommendation.optimalTimeSlots?.find(
          ai => ai.startTime === slot.start
        )

        if (aiSlot) {
          return {
            ...slot,
            isOptimal: aiSlot.priority <= 2,
            reason: aiSlot.reason || slot.reason,
          }
        }
        return slot
      })

      return {
        date,
        timeSlots: enhancedSlots,
        durationMinutes: aiRecommendation.durationEstimate || estimatedDuration,
        priority: schedulerInput.isRush ? 1 : index + 1,
        lightingNotes: hasVideo
          ? 'Video shoots require consistent lighting - overcast preferred'
          : undefined,
      }
    })

    // 8. Build scheduling notes
    const schedulingNotes: string[] = []

    if (hasVideo) {
      schedulingNotes.push('Video shoots work best on overcast days for consistent lighting')
    }
    if (hasDrone) {
      schedulingNotes.push('Drone shots are weather-dependent - check wind conditions before shoot')
    }
    if (hasTwilight) {
      schedulingNotes.push('Twilight shoot should be scheduled separately, 20-30 min after sunset')
    }
    if (aiRecommendation.avoidTimes?.length) {
      schedulingNotes.push(`Avoid: ${aiRecommendation.avoidTimes.join(', ')}`)
    }
    if (aiRecommendation.weatherNotes) {
      schedulingNotes.push(aiRecommendation.weatherNotes)
    }

    const output: ShootSchedulerOutput = {
      listingId: schedulerInput.listingId,
      services: schedulerInput.services,
      estimatedDuration,
      recommendations,
      schedulingNotes,
    }

    // Add twilight window if requested
    if (hasTwilight && aiRecommendation.twilightRecommendation) {
      output.twilightWindow = {
        date: recommendationDates[0],
        goldenHour: 'Check local sunset time - 30 min before',
        blueHour: 'Check local sunset time + 20 min',
      }
    }

    return {
      success: true,
      output: output as unknown as Record<string, unknown>,
      tokensUsed: aiResponse.tokensUsed,
    }
  } catch (error) {
    console.error('Shoot scheduler error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Scheduling failed',
      errorCode: 'SCHEDULER_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'shoot-scheduler',
  name: 'Shoot Scheduler',
  description: 'Generates optimal schedule recommendations for photography shoots based on services, property details, and lighting conditions',
  category: 'operations',
  executionMode: 'sync',
  systemPrompt: SCHEDULER_PROMPT,
  config: {
    maxTokens: 800,
    temperature: 0.3,
  },
  execute,
})
