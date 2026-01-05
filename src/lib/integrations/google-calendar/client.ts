import { google, calendar_v3 } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import type {
  CalendarEvent,
  GoogleTokens,
  GoogleCalendarInfo,
  SyncResult,
} from './types'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

/**
 * Create OAuth2 client with credentials
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google-calendar/callback`
  )
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state: string): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force refresh token generation
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || undefined,
    token_type: tokens.token_type || undefined,
    scope: tokens.scope || undefined,
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date || undefined,
  }
}

/**
 * Get authenticated Calendar API client
 */
async function getCalendarClient(
  accessToken: string,
  refreshToken: string
): Promise<calendar_v3.Calendar> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * List user's calendars
 */
export async function listCalendars(
  accessToken: string,
  refreshToken: string
): Promise<GoogleCalendarInfo[]> {
  const calendar = await getCalendarClient(accessToken, refreshToken)

  const response = await calendar.calendarList.list()
  const calendars = response.data.items || []

  return calendars.map((cal) => ({
    id: cal.id!,
    summary: cal.summary || 'Untitled Calendar',
    description: cal.description || undefined,
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor || undefined,
    accessRole: cal.accessRole || undefined,
  }))
}

/**
 * Get primary calendar ID
 */
export async function getPrimaryCalendarId(
  accessToken: string,
  refreshToken: string
): Promise<string> {
  const calendars = await listCalendars(accessToken, refreshToken)
  const primary = calendars.find((cal) => cal.primary)
  return primary?.id || 'primary'
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<string> {
  const calendar = await getCalendarClient(accessToken, refreshToken)

  const eventData: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: event.attendees?.map((email) => ({ email })),
    reminders: event.reminders || {
      useDefault: true,
    },
    colorId: event.colorId,
    status: event.status,
    extendedProperties: event.metadata
      ? {
          private: event.metadata,
        }
      : undefined,
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventData,
    sendUpdates: 'none',
  })

  return response.data.id!
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<void> {
  const calendar = await getCalendarClient(accessToken, refreshToken)

  const eventData: calendar_v3.Schema$Event = {}

  if (event.title) eventData.summary = event.title
  if (event.description) eventData.description = event.description
  if (event.location) eventData.location = event.location
  if (event.startTime) {
    eventData.start = {
      dateTime: event.startTime.toISOString(),
      timeZone: 'America/New_York',
    }
  }
  if (event.endTime) {
    eventData.end = {
      dateTime: event.endTime.toISOString(),
      timeZone: 'America/New_York',
    }
  }
  if (event.attendees) {
    eventData.attendees = event.attendees.map((email) => ({ email }))
  }
  if (event.status) eventData.status = event.status

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: eventData,
    sendUpdates: 'none',
  })
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = await getCalendarClient(accessToken, refreshToken)

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'none',
  })
}

/**
 * Get events from calendar within a date range
 */
export async function getCalendarEvents(
  accessToken: string,
  refreshToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(accessToken, refreshToken)

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  const events = response.data.items || []

  return events.map((event) => ({
    googleEventId: event.id!,
    title: event.summary || 'Untitled Event',
    description: event.description || undefined,
    location: event.location || undefined,
    startTime: new Date(
      event.start?.dateTime || event.start?.date || new Date()
    ),
    endTime: new Date(event.end?.dateTime || event.end?.date || new Date()),
    status: event.status as 'confirmed' | 'tentative' | 'cancelled',
    metadata: event.extendedProperties?.private as
      | Record<string, string>
      | undefined,
  }))
}

/**
 * Sync photographer assignments to Google Calendar
 */
export async function syncAssignmentsToCalendar(
  staffId: string
): Promise<SyncResult> {
  const supabase = await createClient()
  const result: SyncResult = {
    success: true,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [],
  }

  try {
    // Get calendar connection for staff (use type cast since calendar_connections is a new table)
    const { data: connection } = await (supabase as any)
      .from('calendar_connections')
      .select('*')
      .eq('staff_id', staffId)
      .eq('provider', 'google')
      .eq('sync_enabled', true)
      .single()

    if (!connection) {
      result.success = false
      result.errors.push('No active Google Calendar connection found')
      return result
    }

    // Check if token needs refresh
    const tokenExpiry = new Date(connection.token_expires_at)
    let accessToken = connection.access_token
    const refreshToken = connection.refresh_token

    if (tokenExpiry < new Date()) {
      try {
        const newTokens = await refreshAccessToken(refreshToken)
        accessToken = newTokens.access_token

        // Update tokens in database (use type cast since calendar_connections is a new table)
        await (supabase as any)
          .from('calendar_connections')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || refreshToken,
            token_expires_at: newTokens.expiry_date
              ? new Date(newTokens.expiry_date).toISOString()
              : new Date(Date.now() + 3600000).toISOString(),
          })
          .eq('id', connection.id)
      } catch (error) {
        result.success = false
        result.errors.push('Failed to refresh access token')
        return result
      }
    }

    // Get upcoming assignments for this photographer
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignments } = await (supabase as any)
      .from('photographer_assignments')
      .select(
        `
        id,
        status,
        scheduled_date,
        scheduled_time,
        google_event_id,
        listing:listings(
          id,
          address,
          city,
          state,
          zip,
          agent:agents(name, phone)
        )
      `
      )
      .eq('photographer_id', staffId)
      .gte('scheduled_date', today.toISOString().slice(0, 10))
      .lte('scheduled_date', futureDate.toISOString().slice(0, 10))
      .in('status', ['assigned', 'confirmed', 'in_progress']) as { data: Array<{
        id: string
        status: string | null
        scheduled_date: string
        scheduled_time: string | null
        google_event_id: string | null
        listing: {
          id: string
          address: string
          city: string
          state: string
          zip: string
          agent: { name: string; phone: string } | null
        } | null
      }> | null }

    if (!assignments || assignments.length === 0) {
      return result
    }

    // Process each assignment
    for (const assignment of assignments) {
      try {
        const listing = assignment.listing as {
          address: string
          city: string
          state: string
          zip: string
          agent: { name: string; phone: string } | null
        } | null

        if (!listing) continue

        const startTime = new Date(
          `${assignment.scheduled_date}T${assignment.scheduled_time || '09:00'}:00`
        )
        const endTime = new Date(startTime.getTime() + 90 * 60000) // 90 min default

        const event: CalendarEvent = {
          title: `Photo Shoot: ${listing.address}`,
          description: `Real estate photography for ${listing.address}\n\nAgent: ${listing.agent?.name || 'N/A'}\nPhone: ${listing.agent?.phone || 'N/A'}`,
          location: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
          startTime,
          endTime,
          metadata: {
            asm_assignment_id: assignment.id,
            asm_listing_id: listing.address,
          },
        }

        if (assignment.google_event_id) {
          // Update existing event
          await updateCalendarEvent(
            accessToken,
            refreshToken,
            connection.calendar_id,
            assignment.google_event_id,
            event
          )
          result.eventsUpdated++
        } else {
          // Create new event
          const eventId = await createCalendarEvent(
            accessToken,
            refreshToken,
            connection.calendar_id,
            event
          )

          // Store Google event ID in assignment
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('photographer_assignments')
            .update({ google_event_id: eventId })
            .eq('id', assignment.id)

          result.eventsCreated++
        }
      } catch (error) {
        result.errors.push(
          `Failed to sync assignment ${assignment.id}: ${error}`
        )
      }
    }

    // Update last sync time (use type cast since calendar_connections is a new table)
    await (supabase as any)
      .from('calendar_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id)

    return result
  } catch (error) {
    result.success = false
    result.errors.push(`Sync failed: ${error}`)
    return result
  }
}
